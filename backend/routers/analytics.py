"""
backend/routers/analytics.py
Analytics endpoints — protected, uses JWT identity.
GET /analytics/overview      — Total spent, received, net balance
GET /analytics/by-category   — Amount spent per category
GET /analytics/by-month      — Monthly spending trend
"""
from fastapi import APIRouter, Depends
from typing import List
from backend.database import execute_query
from backend.models import Overview, CategorySummary, MonthSummary
from backend.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=Overview)
def spending_overview(current_user: dict = Depends(get_current_user)):
    """
    Return total spent (Debit), total received (Credit), and net balance
    for the authenticated user.
    """
    holder_id = current_user["id"]
    email     = current_user["email"]

    row = execute_query(
        """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'Debit'  THEN ABS(amount) ELSE 0 END), 0) AS total_spent,
            COALESCE(SUM(CASE WHEN type = 'Credit' THEN amount       ELSE 0 END), 0) AS total_received,
            COUNT(*) AS transaction_count
        FROM transactions
        WHERE holder_id = %s
        """,
        (holder_id,),
        fetch="one",
    )

    total_spent    = float(row["total_spent"])
    total_received = float(row["total_received"])

    return Overview(
        email=email,
        total_spent=total_spent,
        total_received=total_received,
        net_balance=round(total_received - total_spent, 2),
        transaction_count=row["transaction_count"],
    )


@router.get("/by-category", response_model=List[CategorySummary])
def spending_by_category(current_user: dict = Depends(get_current_user)):
    """
    Return total amount spent and count per category for the authenticated user.
    Only Debit (outgoing) transactions are counted.
    """
    holder_id = current_user["id"]

    rows = execute_query(
        """
        SELECT
            COALESCE(category, 'Others/Uncategorized') AS category,
            ROUND(SUM(ABS(amount))::numeric, 2)        AS total,
            COUNT(*)                                    AS count
        FROM transactions
        WHERE holder_id = %s AND type = 'Debit'
        GROUP BY category
        ORDER BY total DESC
        """,
        (holder_id,),
    )
    return [dict(row) for row in rows]


@router.get("/by-month", response_model=List[MonthSummary])
def spending_by_month(current_user: dict = Depends(get_current_user)):
    """
    Return monthly debit and credit totals for the authenticated user.
    """
    holder_id = current_user["id"]

    rows = execute_query(
        """
        SELECT
            TO_CHAR(TO_DATE(date, 'DD Mon YYYY'), 'Mon YYYY') AS month,
            ROUND(SUM(CASE WHEN type = 'Debit'  THEN ABS(amount) ELSE 0 END)::numeric, 2) AS total_debit,
            ROUND(SUM(CASE WHEN type = 'Credit' THEN amount       ELSE 0 END)::numeric, 2) AS total_credit
        FROM transactions
        WHERE holder_id = %s
        GROUP BY TO_DATE(date, 'DD Mon YYYY'), TO_CHAR(TO_DATE(date, 'DD Mon YYYY'), 'Mon YYYY')
        ORDER BY TO_DATE(date, 'DD Mon YYYY') DESC
        """,
        (holder_id,),
    )
    return [dict(row) for row in rows]
