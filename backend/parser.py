"""
backend/parser.py
Universal PDF statement parser powered by Google Gemini.

Works with any bank or wallet app statement (HDFC, SBI, ICICI, Paytm,
PhonePe, GPay, Axis, Kotak, etc.) by letting Gemini extract transactions
from the raw PDF — no hardcoded column layouts or regex heuristics.
"""
import json
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).parent.parent / ".env")

# Load category mapping from project root
CATEGORIES_PATH = Path(__file__).parent.parent / "categories.json"
with open(CATEGORIES_PATH, "r") as f:
    CATEGORY_MAPPING = json.load(f)

# ── Gemini client ─────────────────────────────────────────────────────────────

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── Extraction prompt ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """
You are a financial data extraction assistant.
Your job is to extract ALL transactions from a bank or wallet statement PDF.

Return ONLY a valid JSON object with this exact structure — no markdown, no extra text:

{
  "meta": {
    "account_holder": "<name if found, else null>",
    "phone": "<10-digit phone if found, else null>",
    "bank": "<bank or app name>"
  },
  "transactions": [
    {
      "date": "<DD Mon YYYY, e.g. 12 Aug 2024>",
      "time": "<HH:MM AM/PM if available, else null>",
      "merchant": "<payee or payer name, cleaned — no bank codes or ref numbers>",
      "amount": <absolute numeric value, no currency symbol, no commas>,
      "type": "<Debit or Credit>",
      "ref": "<transaction/UPI/cheque reference number if present, else null>"
    }
  ]
}

Rules:
- Extract EVERY transaction row — do not skip any.
- "type" must be exactly "Debit" or "Credit" (capital D or C).
- "amount" must be a positive number — never negative.
- For "merchant": extract the meaningful name (shop, person, service). Strip account numbers, IFSC, bank names, UPI handles, and ref numbers.
- For "date": always output in "DD Mon YYYY" format (e.g. "03 Jan 2024"). Infer year from statement period if not explicitly shown per row.
- If time is not present in the statement, output null.
- "ref" is used for deduplication — include any UPI Ref, Txn ID, Cheque No, or similar unique identifier if present.
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _categorize(merchant: str, raw_text: str = "") -> str:
    """Map a merchant/details string to a category using keyword matching."""
    merchant_l = merchant.lower()
    details_l  = raw_text.lower()
    for category, keywords in CATEGORY_MAPPING.items():
        if any(kw in merchant_l for kw in keywords):
            return category
    for category, keywords in CATEGORY_MAPPING.items():
        if any(kw in details_l for kw in keywords):
            return category
    return "Others/Uncategorized"


def _clean_amount(raw) -> "Optional[float]":
    """Ensure amount is a positive float."""
    try:
        val = float(str(raw).replace(",", "").strip())
        return abs(val)
    except (ValueError, TypeError):
        return None


def _normalize_date(date_str: str) -> str:
    """Attempt to normalize date string to 'DD Mon YYYY'. Returns as-is if already clean."""
    if not date_str:
        return date_str
    # Already in desired format
    if re.match(r"^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$", date_str.strip()):
        return date_str.strip()
    return date_str.strip()


def _safe_parse_json(raw_text: str) -> dict:
    """
    Parse JSON from Gemini output with multiple fallback strategies.
    Handles truncated output from very large statements gracefully.
    """
    # Strategy 1: direct parse
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: extract the outermost {...} block
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Strategy 3: truncated JSON — close open arrays/objects and try again
    # This handles cases where a large statement hits token limits mid-JSON
    text = match.group(0) if match else raw_text
    # Remove the last incomplete transaction object
    last_complete = max(text.rfind("},"), text.rfind("}\n"))
    if last_complete > 0:
        truncated = text[: last_complete + 1]
        # Close open structures
        truncated = truncated.rstrip(", \n")
        truncated += "]}}"
        try:
            return json.loads(truncated)
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not parse Gemini response as JSON. "
        f"First 300 chars: {raw_text[:300]}"
    )




# ── Main parser ───────────────────────────────────────────────────────────────

def parse_pdf(pdf_path: str) -> tuple[dict, list[dict]]:
    """
    Parse ANY bank/wallet statement PDF using Gemini.

    Returns:
        meta    — dict with phone, name, bank
        records — list of transaction dicts ready for DB insertion
    """
    # ── Upload PDF to Gemini Files API ────────────────────────────────────────
    with open(pdf_path, "rb") as f:
        uploaded = _client.files.upload(
            file=f,
            config=types.UploadFileConfig(
                mime_type="application/pdf",
                display_name=Path(pdf_path).name,
            ),
        )

    # Wait until the file is ACTIVE (usually instant for small PDFs)
    file_ref = uploaded
    for _ in range(10):
        if file_ref.state and file_ref.state.name == "ACTIVE":
            break
        time.sleep(1)
        file_ref = _client.files.get(name=uploaded.name)

    # ── Call Gemini ───────────────────────────────────────────────────────────
    response = _client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[
            types.Part.from_uri(file_uri=file_ref.uri, mime_type="application/pdf"),
            types.Part.from_text(text=_SYSTEM_PROMPT),
        ],
        config=types.GenerateContentConfig(
            temperature=0,          # deterministic
            max_output_tokens=65536,  # large enough for 6+ month statements
        ),
    )

    # ── Parse the JSON response ───────────────────────────────────────────────
    raw_text = ""
    if hasattr(response, "text") and response.text:
        raw_text = response.text
    elif hasattr(response, "candidates") and response.candidates:
        parts = getattr(response.candidates[0].content, "parts", [])
        raw_text = "".join(getattr(p, "text", "") or "" for p in parts)
    
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    payload = _safe_parse_json(raw_text)

    # ── Build meta ────────────────────────────────────────────────────────────
    raw_meta = payload.get("meta", {})
    meta = {
        "phone": raw_meta.get("phone"),
        "name":  raw_meta.get("account_holder"),
        "bank":  raw_meta.get("bank", "Unknown"),
    }

    # ── Build records ─────────────────────────────────────────────────────────
    records = []
    for tx in payload.get("transactions", []):
        merchant = (tx.get("merchant") or "Unknown").strip() or "Unknown"
        amount   = _clean_amount(tx.get("amount"))
        tx_type  = tx.get("type", "").strip()
        date_str = _normalize_date(tx.get("date") or "")
        time_str = tx.get("time") or ""
        ref      = tx.get("ref")

        # Validate type
        if tx_type not in ("Debit", "Credit"):
            continue
        if amount is None or amount == 0:
            continue

        # Store debits as negative (matches existing DB convention)
        signed_amount = -amount if tx_type == "Debit" else amount

        category = _categorize(merchant)

        records.append({
            "date":     date_str,
            "time":     time_str,
            "merchant": merchant,
            "amount":   round(signed_amount, 2),
            "type":     tx_type,
            "category": category,
            "_upi_ref": ref,   # internal — used for DB dedup
        })

    # Clean up uploaded file from Gemini servers
    try:
        _client.files.delete(name=uploaded.name)
    except Exception:
        pass  # non-critical

    return meta, records
