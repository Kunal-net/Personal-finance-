"""
backend/database.py
PostgreSQL connection helper.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
import psycopg2
import psycopg2.extras

# Load .env from project root (two levels up from this file)
load_dotenv(Path(__file__).parent.parent / ".env")

def _get_db_config():
    password = os.getenv("DB_PASSWORD")
    if not password:
        raise RuntimeError(
            "DB_PASSWORD is not set. Please create a .env file based on .env.example."
        )
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "personal_finance"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": password,
    }


def get_connection():
    """Return a new psycopg2 connection using the shared DB config."""
    return psycopg2.connect(**_get_db_config())


def execute_query(sql: str, params=None, fetch: str = "all"):
    """
    Helper to run a query and return results.
    fetch: 'all' | 'one' | 'none'
    """
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        if fetch == "all":
            result = cur.fetchall()
        elif fetch == "one":
            result = cur.fetchone()
        else:
            result = None
        conn.commit()
        return result
    finally:
        conn.close()
