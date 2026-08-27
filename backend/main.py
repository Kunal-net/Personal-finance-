"""
backend/main.py
FastAPI application entrypoint.

Run with:
    .venv/bin/uvicorn backend.main:app --reload

Swagger UI:
    http://localhost:8000/docs
"""
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import upload, transactions, analytics
from backend.routers import auth as auth_router
from backend.routers import ai as ai_router
from backend.database import execute_query
from backend.auth import get_current_user
from fastapi import Depends

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Personal Finance API",
    description=(
        "Upload bank statements, query transactions, and view spending analytics.\n\n"
        "**Authentication**: Register via `POST /auth/register`, then login via `POST /auth/login`. "
        "Include the returned `access_token` as a Bearer token in all protected requests."
    ),
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(upload.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(ai_router.router)


# ── Misc endpoints ────────────────────────────────────────────────────────────

@app.get("/health", tags=["Misc"])
def health_check():
    """API health check — no auth required."""
    return {"status": "ok", "version": "2.0.0"}


@app.get("/me", tags=["Misc"])
def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "phone_number": current_user["phone_number"],
    }


@app.get("/categories", tags=["Misc"])
def list_categories():
    """Return all available transaction categories and their keywords."""
    categories_path = Path(__file__).parent.parent / "categories.json"
    with open(categories_path, "r") as f:
        return json.load(f)
