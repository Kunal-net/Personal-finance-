"""
backend/ai.py
AI analysis engine — spending predictions, savings plan, anomaly detection, health score.

All functions take a list of transaction dicts (as returned by execute_query on the
transactions table) and return plain Python dicts/lists — no DB calls inside.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression


# ── Helpers ───────────────────────────────────────────────────────────────────

_DATE_FMT = "%d %b %Y"   # e.g. "23 Aug 2026"

# Recommended monthly spending as a % of average monthly income.
# Used by the savings plan to flag over-spending categories.
CATEGORY_BENCHMARKS: dict[str, float] = {
    "Groceries":           0.12,
    "Food & Dining":       0.10,
    "Travel & Transport":  0.08,
    "Shopping":            0.08,
    "Utilities & Bills":   0.10,
    "Cashback & Rewards":  None,   # income — not flagged
    "Income & Transfers":  None,   # income — not flagged
    "Others/Uncategorized": 0.05,
}


def _build_df(transactions: list[dict]) -> pd.DataFrame:
    """Convert raw transaction rows to a clean DataFrame."""
    if not transactions:
        return pd.DataFrame()

    df = pd.DataFrame(transactions)

    # Parse dates; rows that fail get NaT and are dropped
    df["parsed_date"] = pd.to_datetime(df["date"], format=_DATE_FMT, errors="coerce")
    df = df.dropna(subset=["parsed_date", "amount"])
    df["amount"] = df["amount"].astype(float)

    # month label like "Aug 2026"
    df["month"] = df["parsed_date"].dt.to_period("M")

    return df


def _monthly_by_category(df: pd.DataFrame, tx_type: str) -> pd.DataFrame:
    """
    Returns a pivot table: index=month (Period), columns=category, values=abs(amount).
    """
    sub = df[df["type"] == tx_type].copy()
    sub["amount"] = sub["amount"].abs()
    pivot = (
        sub.groupby(["month", "category"])["amount"]
        .sum()
        .unstack(fill_value=0)
    )
    return pivot


# ── 1. Next-Month Spending Prediction ─────────────────────────────────────────

def predict_next_month(transactions: list[dict]) -> dict:
    """
    Predict next month's spending per category using linear regression.
    Falls back to a 3-month rolling average when there are fewer than 3 data points.

    Returns:
        {
          "method": "regression" | "average",
          "predicted_month": "Sep 2026",
          "predictions": {"Food & Dining": 1200.5, ...},
          "total_predicted": 4500.0,
          "data_months": 2,
        }
    """
    df = _build_df(transactions)
    if df.empty:
        return {"error": "No transactions available for prediction."}

    pivot = _monthly_by_category(df, "Debit")
    if pivot.empty:
        return {"error": "No debit transactions found."}

    months = pivot.index
    n_months = len(months)

    # Determine next month label
    last_month = months[-1]
    next_month = last_month + 1
    next_month_label = next_month.strftime("%b %Y")

    predictions: dict[str, float] = {}
    method = "regression" if n_months >= 3 else "average"

    X = np.arange(n_months).reshape(-1, 1)
    X_next = np.array([[n_months]])

    for category in pivot.columns:
        y = pivot[category].values.astype(float)
        if method == "regression":
            model = LinearRegression()
            model.fit(X, y)
            pred = float(model.predict(X_next)[0])
        else:
            pred = float(np.mean(y))

        # Clamp to non-negative — spending can't be negative
        predictions[category] = round(max(pred, 0.0), 2)

    return {
        "method": method,
        "predicted_month": next_month_label,
        "predictions": dict(sorted(predictions.items(), key=lambda x: -x[1])),
        "total_predicted": round(sum(predictions.values()), 2),
        "data_months": n_months,
    }


# ── 2. Savings Plan ───────────────────────────────────────────────────────────

def build_savings_plan(transactions: list[dict]) -> dict:
    """
    Compare average monthly spending per category against benchmark thresholds.
    Recommend cut targets and compute a savings goal.

    Returns:
        {
          "avg_monthly_income": 15000.0,
          "avg_monthly_spend": 12000.0,
          "current_savings_rate": 0.20,
          "recommended_savings_rate": 0.30,
          "monthly_savings_gap": 1500.0,
          "recommendations": [
              {
                "category": "Food & Dining",
                "avg_spent": 3000.0,
                "benchmark_amount": 1500.0,
                "excess": 1500.0,
                "suggested_cut": 750.0,
                "tip": "Try cooking at home 3 days a week."
              },
              ...
          ]
        }
    """
    df = _build_df(transactions)
    if df.empty:
        return {"error": "No transactions available."}

    n_months = df["month"].nunique()
    if n_months == 0:
        return {"error": "No monthly data found."}

    # Monthly averages
    total_income = float(df[df["type"] == "Credit"]["amount"].abs().sum())
    total_spend  = float(df[df["type"] == "Debit"]["amount"].abs().sum())

    avg_income = float(round(total_income / n_months, 2))
    avg_spend  = float(round(total_spend  / n_months, 2))
    current_savings_rate = float(round(
        (avg_income - avg_spend) / avg_income, 4
    )) if avg_income > 0 else 0.0

    # Per-category averages
    cat_avg = (
        df[df["type"] == "Debit"]
        .copy()
        .assign(amount=lambda x: x["amount"].abs())
        .groupby("category")["amount"]
        .sum()
        .div(n_months)
    )

    recommendations = []
    tips = {
        "Food & Dining":      "Try cooking at home 3–4 days a week to cut dining costs.",
        "Shopping":           "Use a 24-hour rule before non-essential purchases.",
        "Travel & Transport": "Use public transport or carpool where possible.",
        "Groceries":          "Plan weekly meals and buy in bulk to reduce grocery spend.",
        "Utilities & Bills":  "Review subscriptions and cancel unused services.",
        "Others/Uncategorized": "Track where 'misc' money is going — small leaks add up.",
    }

    for category, avg_spent_val in cat_avg.items():
        avg_spent = float(avg_spent_val)
        benchmark_pct = CATEGORY_BENCHMARKS.get(category)
        if benchmark_pct is None:
            continue  # skip income categories

        benchmark_amount = float(round(avg_income * benchmark_pct, 2))
        excess = float(round(avg_spent - benchmark_amount, 2))

        if excess > 0:
            recommendations.append({
                "category":         category,
                "avg_spent":        float(round(avg_spent, 2)),
                "benchmark_amount": benchmark_amount,
                "excess":           excess,
                "suggested_cut":    float(round(excess * 0.5, 2)),  # suggest cutting 50% of excess
                "tip":              tips.get(category, "Review this category's spending."),
            })

    recommendations.sort(key=lambda x: -x["excess"])

    recommended_savings_rate = 0.30
    monthly_savings_gap = float(round(
        max((recommended_savings_rate * avg_income) - (avg_income - avg_spend), 0), 2
    ))

    return {
        "avg_monthly_income":       avg_income,
        "avg_monthly_spend":        avg_spend,
        "current_savings_rate":     current_savings_rate,
        "recommended_savings_rate": recommended_savings_rate,
        "monthly_savings_gap":      monthly_savings_gap,
        "data_months":              n_months,
        "recommendations":          recommendations,
    }


# ── 3. Anomaly Detection ──────────────────────────────────────────────────────

def detect_anomalies(transactions: list[dict], z_threshold: float = 2.0) -> dict:
    """
    Flag debit transactions that are unusually large for their category using Z-score.
    Needs at least 3 transactions per category to compute a meaningful score.

    Returns:
        {
          "anomalies": [
              {
                "id": 42,
                "date": "23 Aug 2026",
                "merchant": "Blinkit",
                "category": "Groceries",
                "amount": 2068.0,
                "category_avg": 500.0,
                "z_score": 3.1,
                "reason": "2068.0 is 3.1x above your usual Groceries spend of ~500.0"
              },
              ...
          ],
          "total_scanned": 120,
          "anomalies_found": 3,
        }
    """
    df = _build_df(transactions)
    if df.empty:
        return {"anomalies": [], "total_scanned": 0, "anomalies_found": 0}

    debits = df[df["type"] == "Debit"].copy()
    debits["amount"] = debits["amount"].abs()

    anomalies = []

    for category, group in debits.groupby("category"):
        if len(group) < 3:
            continue  # not enough data for Z-score

        amounts = group["amount"].values
        mean = float(np.mean(amounts))
        std  = float(np.std(amounts))

        if std == 0:
            continue  # all identical — no anomaly possible

        for _, row in group.iterrows():
            z = (row["amount"] - mean) / std
            if z >= z_threshold:
                anomalies.append({
                    "id":           int(row.get("id", 0)),
                    "date":         row["date"],
                    "merchant":     row.get("merchant", "Unknown"),
                    "category":     category,
                    "amount":       round(float(row["amount"]), 2),
                    "category_avg": round(mean, 2),
                    "z_score":      round(float(z), 2),
                    "reason": (
                        f"₹{row['amount']:.0f} is {row['amount']/mean:.1f}x above "
                        f"your usual {category} spend of ~₹{mean:.0f}"
                    ),
                })

    anomalies.sort(key=lambda x: -x["z_score"])

    return {
        "anomalies":       anomalies,
        "total_scanned":   len(debits),
        "anomalies_found": len(anomalies),
    }


# ── 4. Financial Health Score ─────────────────────────────────────────────────

def compute_health_score(transactions: list[dict]) -> dict:
    """
    Compute a 0–100 financial health score from 3 sub-scores:
      - Savings rate (40 pts): how much of income is saved
      - Spending trend (30 pts): is monthly spending going down over time?
      - Category diversity (30 pts): not over-concentrating spend in one area

    Returns:
        {
          "score": 72,
          "grade": "B",
          "breakdown": {
              "savings_rate_score": 28,
              "trend_score": 22,
              "diversity_score": 22,
          },
          "insights": ["Your savings rate is 18%, below the 30% target.", ...],
          "data_months": 2,
        }
    """
    df = _build_df(transactions)
    if df.empty:
        return {"error": "No transactions available."}

    n_months = df["month"].nunique()
    insights: list[str] = []

    total_income = df[df["type"] == "Credit"]["amount"].abs().sum()
    total_spend  = df[df["type"] == "Debit"]["amount"].abs().sum()
    savings_rate = (total_income - total_spend) / total_income if total_income > 0 else 0.0

    # ── Sub-score 1: Savings rate (40 pts) ────────────────────────────────────
    # 30%+ = full marks; 0% = 0 marks. Linear interpolation.
    savings_score = int(np.clip(round((savings_rate / 0.30) * 40), 0, 40))
    if savings_rate < 0:
        insights.append(f"You spent more than you earned — net deficit of ₹{abs(total_income - total_spend):.0f}.")
    elif savings_rate < 0.30:
        insights.append(
            f"Your savings rate is {savings_rate*100:.0f}%, below the 30% target. "
            f"Try to save ₹{((0.30 - savings_rate) * (total_income / n_months)):.0f} more per month."
        )
    else:
        insights.append(f"Great savings rate of {savings_rate*100:.0f}%! Keep it up.")

    # ── Sub-score 2: Spending trend (30 pts) ──────────────────────────────────
    trend_score = 15  # neutral default
    if n_months >= 3:
        monthly_spend = (
            df[df["type"] == "Debit"]
            .groupby("month")["amount"]
            .apply(lambda x: x.abs().sum())
            .sort_index()
            .values
        )
        X = np.arange(len(monthly_spend)).reshape(-1, 1)
        model = LinearRegression().fit(X, monthly_spend)
        slope = float(model.coef_[0])
        avg_spend = float(np.mean(monthly_spend))

        # Slope as % of avg: -5%+ = full marks, +5%+ = 0 marks
        pct_slope = slope / avg_spend if avg_spend > 0 else 0
        trend_score = int(np.clip(30 * (1 - (pct_slope + 0.05) / 0.10), 0, 30))

        if slope < 0:
            insights.append(f"Your spending is trending down by ₹{abs(slope):.0f}/month. Excellent!")
        elif slope > avg_spend * 0.03:
            insights.append(f"Your spending is increasing by ~₹{slope:.0f}/month. Review your habits.")
        else:
            insights.append("Your spending is fairly stable month-to-month.")
    else:
        insights.append("Not enough months of data to compute a spending trend (need 3+).")

    # ── Sub-score 3: Category diversity (30 pts) ──────────────────────────────
    cat_totals = (
        df[df["type"] == "Debit"]
        .groupby("category")["amount"]
        .apply(lambda x: x.abs().sum())
    )
    if len(cat_totals) > 0 and total_spend > 0:
        proportions = (cat_totals / total_spend).values
        # Herfindahl-Hirschman Index: lower = more diverse
        hhi = float(np.sum(proportions ** 2))
        # HHI of 1.0 = all in one category (bad), ~0.2 = well diversified (good)
        diversity_score = int(np.clip(30 * (1 - hhi), 0, 30))
        top_cat = cat_totals.idxmax()
        top_pct = proportions.max() * 100
        if top_pct > 60:
            insights.append(
                f"{top_pct:.0f}% of your spending is in '{top_cat}'. "
                "Diversifying helps with budget control."
            )
        else:
            insights.append(f"Good spending diversity across {len(cat_totals)} categories.")
    else:
        diversity_score = 0

    total_score = int(np.clip(savings_score + trend_score + diversity_score, 0, 100))

    grade_map = [(90, "A"), (80, "B+"), (70, "B"), (60, "C+"), (50, "C"), (40, "D"), (0, "F")]
    grade = next(g for threshold, g in grade_map if total_score >= threshold)

    return {
        "score": total_score,
        "grade": grade,
        "breakdown": {
            "savings_rate_score": savings_score,
            "trend_score":        trend_score,
            "diversity_score":    diversity_score,
        },
        "savings_rate":   round(savings_rate * 100, 1),
        "insights":       insights,
        "data_months":    n_months,
    }
