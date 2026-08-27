"""
backend/routers/ai.py
AI analytics endpoints — all protected with JWT auth.

GET /ai/predict         — Next-month spending prediction per category
GET /ai/savings-plan    — Personalised savings recommendations
GET /ai/anomalies       — Unusual transactions (Z-score based)
GET /ai/health-score    — 0–100 financial health score with grade
"""
from fastapi import APIRouter, Depends, HTTPException
from backend.database import execute_query
from backend.auth import get_current_user
from backend import ai as ai_engine

router = APIRouter(prefix="/ai", tags=["AI Insights"])


def _get_transactions(holder_id: int) -> list[dict]:
    """Fetch all transactions for a user as a list of plain dicts."""
    rows = execute_query(
        "SELECT id, date, time, merchant, amount, type, category "
        "FROM transactions WHERE holder_id = %s ORDER BY id ASC",
        (holder_id,),
    )
    return [dict(r) for r in rows] if rows else []


# ── Predict ───────────────────────────────────────────────────────────────────

@router.get("/predict", summary="Next-month spending prediction")
def predict(current_user: dict = Depends(get_current_user)):
    """
    Predict next month's spending per category.

    - Uses **linear regression** when ≥ 3 months of data exist.
    - Falls back to a **rolling average** for sparse data.
    """
    txns = _get_transactions(current_user["id"])
    result = ai_engine.predict_next_month(txns)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


# ── Savings Plan ──────────────────────────────────────────────────────────────

@router.get("/savings-plan", summary="Personalised savings recommendations")
def savings_plan(current_user: dict = Depends(get_current_user)):
    """
    Compares your average monthly spend per category against recommended benchmarks.
    Returns a list of overspending categories with actionable cut targets.
    """
    txns = _get_transactions(current_user["id"])
    result = ai_engine.build_savings_plan(txns)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


# ── Anomaly Detection ─────────────────────────────────────────────────────────

@router.get("/anomalies", summary="Detect unusual transactions")
def anomalies(current_user: dict = Depends(get_current_user)):
    """
    Flags debit transactions that are statistically unusual for their category.
    Uses a **Z-score ≥ 2.0** threshold (needs ≥ 3 transactions per category).
    """
    txns = _get_transactions(current_user["id"])
    result = ai_engine.detect_anomalies(txns)
    return result


# ── Health Score ──────────────────────────────────────────────────────────────

@router.get("/health-score", summary="Financial health score (0–100)")
def health_score(current_user: dict = Depends(get_current_user)):
    """
    Composite financial health score based on:
    - **Savings rate** (40 pts) — how much of income is saved
    - **Spending trend** (30 pts) — is monthly spend going up or down?
    - **Category diversity** (30 pts) — is spending spread across categories?

    Returns a score (0–100), letter grade (A–F), and actionable insights.
    """
    txns = _get_transactions(current_user["id"])
    result = ai_engine.compute_health_score(txns)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result
