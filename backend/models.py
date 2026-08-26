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
    name: Optional[str]
    phone_number: Optional[str]


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
