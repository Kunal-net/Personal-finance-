"""
backend/routers/auth.py
POST /auth/register — Create a new account
POST /auth/login    — Authenticate and receive a JWT access token
"""
from fastapi import APIRouter, HTTPException, status
from backend.database import execute_query, get_connection
from backend.auth import hash_password, verify_password, create_access_token
from backend.models import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest):
    """
    Register a new user with email and password.
    Returns a JWT access token immediately — no separate login step needed.
    """
    existing = execute_query(
        "SELECT id FROM account_holders WHERE email = %s",
        (body.email,),
        fetch="one",
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = hash_password(body.password)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO account_holders (email, password_hash, name)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (body.email, hashed, body.name),
        )
        _new_id = cur.fetchone()  # consume RETURNING id
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        conn.close()

    token = create_access_token({"sub": body.email})
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    """
    Authenticate with email and password.
    Returns a JWT access token valid for 24 hours.
    """
    user = execute_query(
        "SELECT email, password_hash FROM account_holders WHERE email = %s",
        (body.email,),
        fetch="one",
    )

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token({"sub": body.email})
    return TokenResponse(access_token=token, token_type="bearer")
