-- Supabase Database Schema for Bar Kitchen Lodge Management System

-- -------------------------------------------------------------
-- 1. Lodge Entries Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lodge_entries (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customers INTEGER NOT NULL DEFAULT 0 CHECK (customers >= 0),
    price_per_customer NUMERIC NOT NULL DEFAULT 1500 CHECK (price_per_customer >= 0),
    revenue NUMERIC NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 2. Inventory Items Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    opening INTEGER NOT NULL DEFAULT 0 CHECK (opening >= 0),
    addition INTEGER NOT NULL DEFAULT 0 CHECK (addition >= 0),
    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
    waste INTEGER NOT NULL DEFAULT 0 CHECK (waste >= 0),
    closing INTEGER NOT NULL DEFAULT 0 CHECK (closing >= 0),
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 3. Expenses Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    receipt_url TEXT,
    department VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 4. Cash Submissions Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_submissions (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    cash_at_hand NUMERIC NOT NULL DEFAULT 0 CHECK (cash_at_hand >= 0),
    creditor_payments NUMERIC NOT NULL DEFAULT 0 CHECK (creditor_payments >= 0),
    total_cash NUMERIC NOT NULL DEFAULT 0 CHECK (total_cash >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    department VARCHAR(50) DEFAULT 'bar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 5. Record Book Table (Daily spreadsheet log)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS record_book_entries (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount_in NUMERIC NOT NULL DEFAULT 0 CHECK (amount_in >= 0),
    amount_out NUMERIC NOT NULL DEFAULT 0 CHECK (amount_out >= 0),
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 6. Creditors Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creditors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_date DATE,
    department VARCHAR(50) DEFAULT 'bar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 7. Suppliers Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);




-- -------------------------------------------------------------
-- 8. Supplier Products / Prices Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_products (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'crate',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


