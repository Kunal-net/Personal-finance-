"""
backend/database.py
PostgreSQL connection helper.
"""
import os

import psycopg2
import psycopg2.extras

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "personal_finance"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.environ["DB_PASSWORD"],
}


def get_connection():
    """Return a new psycopg2 connection using the shared DB config."""
    return psycopg2.connect(**DB_CONFIG)


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
