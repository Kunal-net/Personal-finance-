"""
backend/parser.py
PDF statement parser — extracted from ai_model.ipynb for reuse in the FastAPI backend.
Parses any Paytm-style PDF statement and returns clean transaction records.
"""
import re
import json
import pdfplumber
from datetime import datetime
from pathlib import Path

# Load category mapping from the project root
CATEGORIES_PATH = Path(__file__).parent.parent / "categories.json"
with open(CATEGORIES_PATH, "r") as f:
    CATEGORY_MAPPING = json.load(f)

# ── Regex patterns ────────────────────────────────────────────────────────────
DATE_PATTERN = re.compile(r"^\d+\s+[A-Za-z]{3}$")
TIME_PATTERN = re.compile(r"^\d+:\d+\s+(?:AM|PM)$")
COL_BOUNDARIES = [85, 390, 485]  # [Date/Time, Details, Account, Amount]

SKIP_KEYWORDS = [
    "passbook payments history", "all payments done", "date &",
    "transaction details", "notes & tags", "your account", "amount",
    "page ", "for any queries", "contact us", "paytm statement for",
    "total money", "payments made", "self transfer",
    "payments that you might", "paytm payments bank wallet",
    "accounts payment made", "state bank of india - 30 rs",
    "(3 payments)", "(2 payments)",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_noise(cols: list) -> bool:
    joined = " ".join(cols).lower()
    return any(kw in joined for kw in SKIP_KEYWORDS)


def _extract_merchant(details: str) -> str:
    match = re.search(
        r"(?:Paid to|Received from|Cashback Received from)\s+([^:\n#]+)",
        details,
        re.IGNORECASE,
    )
    if match:
        org = match.group(1).strip()
        org = re.split(r"\b(?:Note|UPI|Tag|Ref|using|on|via)\b", org, flags=re.IGNORECASE)[0].strip()
        org = re.sub(r"\s+(Limited|Private|Pvt)$", "", org, flags=re.IGNORECASE)
        return org.strip()
    return "Unknown"


def _extract_upi_ref(details: str):
    match = re.search(r"UPI Ref No:\s*(\d+)", details, re.IGNORECASE)
    return match.group(1).strip() if match else None


def _parse_amount(amount_raw: str):
    s = amount_raw.strip() if amount_raw else ""
    is_credit = s.startswith("+")
    m = re.search(r"[\d,]+\.?\d*", s)
    if not m:
        return None, None
    cleaned = m.group(0).replace(",", "")
    try:
        val = float(cleaned)
        return (val, "Credit") if is_credit else (-val, "Debit")
    except ValueError:
        return None, None


def _infer_year(date_str: str, date_range) -> str:
    if not date_range:
        return f"{date_str} {datetime.now().year}"
    try:
        start = datetime.strptime(date_range[0].replace("'", " 20"), "%d %b  20%y")
        end   = datetime.strptime(date_range[1].replace("'", " 20"), "%d %b  20%y")
        tx_date = datetime.strptime(date_str, "%d %b")
        for year in [end.year, start.year]:
            candidate = tx_date.replace(year=year)
            if start <= candidate <= end:
                return f"{date_str} {year}"
        return f"{date_str} {end.year}"
    except Exception:
        return f"{date_str} {datetime.now().year}"


def _categorize(merchant: str, details: str) -> str:
    merchant_l, details_l = merchant.lower(), details.lower()
    for category, keywords in CATEGORY_MAPPING.items():
        if any(kw in merchant_l for kw in keywords):
            return category
    for category, keywords in CATEGORY_MAPPING.items():
        if any(kw in details_l for kw in keywords):
            return category
    return "Others/Uncategorized"


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_pdf(pdf_path: str, col_boundaries: list = COL_BOUNDARIES) -> tuple:
    """
    Parse a PDF statement and return:
      - meta: dict with phone, name, date_range
      - records: list of clean transaction dicts (model-safe + _upi_ref for DB dedup)
    """
    raw_txns = []
    current_tx = None
    meta = {"phone": None, "name": None, "date_range": None}

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            lines = []
            for w in words:
                placed = False
                for line in lines:
                    if abs(line[0]["top"] - w["top"]) < 3:
                        line.append(w)
                        placed = True
                        break
                if not placed:
                    lines.append([w])

            lines.sort(key=lambda l: l[0]["top"])

            for line in lines:
                line.sort(key=lambda w: w["x0"])
                raw_text = " ".join(w["text"] for w in line)

                # Extract header metadata
                phone_match = re.search(r"(\d{10})", raw_text)
                if phone_match and not meta["phone"]:
                    meta["phone"] = phone_match.group(1)

                range_match = re.search(r"(\d+\s+[A-Z]+'\d+)\s*-\s*(\d+\s+[A-Z]+'\d+)", raw_text)
                if range_match and not meta["date_range"]:
                    meta["date_range"] = (range_match.group(1), range_match.group(2))

                if "Paytm User" in raw_text:
                    meta["name"] = "Paytm User"

                # Assign words to columns
                cols = ["", "", "", ""]
                for w in line:
                    x0 = w["x0"]
                    col_idx = 0
                    while col_idx < len(col_boundaries) and x0 >= col_boundaries[col_idx]:
                        col_idx += 1
                    cols[col_idx] = (cols[col_idx] + " " + w["text"]).strip()

                if _is_noise(cols):
                    continue

                val0 = cols[0]
                if DATE_PATTERN.match(val0):
                    if current_tx:
                        raw_txns.append(current_tx)
                    current_tx = {
                        "Date": val0, "Time": "",
                        "Details": cols[1], "Account": cols[2], "Amount_raw": cols[3],
                    }
                elif current_tx:
                    if TIME_PATTERN.match(val0):
                        current_tx["Time"] = val0
                    if cols[1]:
                        current_tx["Details"] = (current_tx["Details"] + " " + cols[1]).strip()
                    if cols[2]:
                        current_tx["Account"] = (current_tx["Account"] + " " + cols[2]).strip()
                    if cols[3]:
                        current_tx["Amount_raw"] = (current_tx["Amount_raw"] + " " + cols[3]).strip()

        if current_tx:
            raw_txns.append(current_tx)

    # Enrich each raw transaction
    records = []
    for tx in raw_txns:
        merchant        = _extract_merchant(tx["Details"])
        upi_ref         = _extract_upi_ref(tx["Details"])
        amount, tx_type = _parse_amount(tx["Amount_raw"])
        date_full       = _infer_year(tx["Date"], meta["date_range"])
        category        = _categorize(merchant, tx["Details"])

        records.append({
            "date"    : date_full,
            "time"    : tx["Time"],
            "merchant": merchant,
            "amount"  : amount,
            "type"    : tx_type,
            "category": category,
            "_upi_ref": upi_ref,  # internal — used for DB dedup, not exposed in API
        })

    return meta, records
