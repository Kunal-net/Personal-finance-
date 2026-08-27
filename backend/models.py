"""
backend/models.py
Pydantic request and response models for type-safe API I/O.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Account ───────────────────────────────────────────────────────────────────

class AccountHolder(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    phone_number: Optional[str] = None


# ── Transactions ──────────────────────────────────────────────────────────────

class Transaction(BaseModel):
    id: int
    holder_id: int
    date: Optional[str]
    time: Optional[str]
    merchant: Optional[str]
    amount: Optional[float]
    type: Optional[str]
    category: Optional[str]


# ── Analytics ─────────────────────────────────────────────────────────────────

class CategorySummary(BaseModel):
    category: str
    total: float
    count: int


class MonthSummary(BaseModel):
    month: str
    total_debit: float
    total_credit: float


class Overview(BaseModel):
    email: str
    total_spent: float
    total_received: float
    net_balance: float
    transaction_count: int


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    holder_id: int
    email: str
    inserted: int
    skipped: int


# ── AI Insights ───────────────────────────────────────────────────────────────

class PredictionResult(BaseModel):
    method: str                          # "regression" | "average"
    predicted_month: str
    predictions: dict[str, float]        # category → predicted spend
    total_predicted: float
    data_months: int


class SavingsRecommendation(BaseModel):
    category: str
    avg_spent: float
    benchmark_amount: float
    excess: float
    suggested_cut: float
    tip: str


class SavingsPlan(BaseModel):
    avg_monthly_income: float
    avg_monthly_spend: float
    current_savings_rate: float
    recommended_savings_rate: float
    monthly_savings_gap: float
    data_months: int
    recommendations: list[SavingsRecommendation]


class AnomalyItem(BaseModel):
    id: int
    date: Optional[str]
    merchant: Optional[str]
    category: Optional[str]
    amount: float
    category_avg: float
    z_score: float
    reason: str


class AnomalyResult(BaseModel):
    anomalies: list[AnomalyItem]
    total_scanned: int
    anomalies_found: int


class HealthScoreBreakdown(BaseModel):
    savings_rate_score: int
    trend_score: int
    diversity_score: int


class HealthScore(BaseModel):
    score: int
    grade: str
    breakdown: HealthScoreBreakdown
    savings_rate: float
    insights: list[str]
    data_months: int
