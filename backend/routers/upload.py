"""
backend/routers/upload.py
POST /upload — Protected. Accepts a PDF statement, parses it, inserts into PostgreSQL.
The authenticated user's email is used to identify the account holder.
"""
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.database import get_connection
from backend.parser import parse_pdf
from backend.models import UploadResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse)
async def upload_statement(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a bank statement PDF.
    Requires a valid Bearer token (login first via POST /auth/login).
    - Parses transactions from the PDF.
    - Stores phone number extracted from PDF on the account holder row.
    - Inserts transactions, deduplicating on UPI Ref No.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        meta, records = parse_pdf(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")
    finally:
        os.unlink(tmp_path)

    holder_id = current_user["id"]
    email     = current_user["email"]

    conn = get_connection()
    try:
        cur = conn.cursor()

        # Update phone_number on the holder if extracted from PDF and not yet set
        if meta.get("phone"):
            cur.execute(
                """
                UPDATE account_holders
                SET phone_number = %s
                WHERE id = %s AND phone_number IS NULL;
                """,
                (meta["phone"], holder_id),
            )

        # Insert transactions
        inserted, skipped = 0, 0
        for tx in records:
            cur.execute(
                """
                INSERT INTO transactions
                    (holder_id, date, time, merchant, upi_ref, amount, type, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (upi_ref) DO NOTHING;
                """,
                (
                    holder_id,
                    tx["date"], tx["time"],
                    tx["merchant"], tx["_upi_ref"],
                    tx["amount"], tx["type"], tx["category"],
                ),
            )
            if cur.rowcount > 0:
                inserted += 1
            else:
                skipped += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

    return UploadResponse(
        message="Statement processed successfully.",
        holder_id=holder_id,
        email=email,
        inserted=inserted,
        skipped=skipped,
    )
