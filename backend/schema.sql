-- backend/schema.sql
-- Active PostgreSQL database schema for personal_finance

CREATE TABLE IF NOT EXISTS account_holders (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    phone_number  TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id         SERIAL PRIMARY KEY,
    holder_id  INTEGER NOT NULL REFERENCES account_holders(id) ON DELETE CASCADE,
    date       TEXT,
    time       TEXT,
    merchant   TEXT,
    upi_ref    TEXT UNIQUE,
    amount     NUMERIC(12, 2),
    type       TEXT,   -- 'Debit' | 'Credit'
    category   TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_holder_id ON transactions(holder_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
