"""
backend/routers/transactions.py
GET /transactions — Protected. Returns transactions for the authenticated user.
Supports optional filtering by category and type (Debit/Credit).
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from backend.database import execute_query
from backend.models import Transaction
from backend.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=List[Transaction])
def get_transactions(
    category: Optional[str] = Query(None, description="Filter by category name"),
    tx_type: Optional[str] = Query(None, alias="type", description="Filter by 'Debit' or 'Credit'"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get all transactions for the authenticated user.
    Optionally filter by category or transaction type.
    """
    holder_id = current_user["id"]

    sql = "SELECT * FROM transactions WHERE holder_id = %s"
    params = [holder_id]

    if category:
        sql += " AND LOWER(category) = LOWER(%s)"
        params.append(category)

    if tx_type:
        if tx_type not in ("Debit", "Credit"):
            raise HTTPException(status_code=400, detail="type must be 'Debit' or 'Credit'")
        sql += " AND type = %s"
        params.append(tx_type)

    sql += " ORDER BY id DESC"
    rows = execute_query(sql, params)
    return [dict(row) for row in rows]
