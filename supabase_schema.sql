-- Supabase Database Schema for Bar Kitchen Lodge Management System
-- Paste this script into the Supabase SQL Editor to initialize your database tables and mock data.

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

-- Insert Mock Data for Lodge Entries
INSERT INTO lodge_entries (date, customers, price_per_customer, revenue) VALUES
('2026-05-06', 12, 1500, 18000),
('2026-05-05', 8, 1500, 12000),
('2026-05-04', 15, 1500, 22500),
('2026-05-03', 10, 1500, 15000)
ON CONFLICT DO NOTHING;


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

-- Insert Mock Data for Inventory Items
INSERT INTO inventory_items (name, opening, addition, total, unit_price, sold, waste, closing, department) VALUES
('Tusker Beer', 200, 100, 300, 250, 150, 5, 145, 'bar'),
('Guinness', 150, 50, 200, 300, 80, 2, 118, 'bar'),
('Pilsner', 180, 120, 300, 240, 140, 3, 157, 'bar'),
('White Cap', 100, 80, 180, 260, 90, 1, 89, 'bar'),
('Coca Cola', 300, 200, 500, 80, 250, 10, 240, 'bar'),
('Fanta Orange', 250, 150, 400, 80, 200, 8, 192, 'bar')
ON CONFLICT DO NOTHING;


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

-- Insert Mock Data for Expenses
INSERT INTO expenses (date, category, description, amount, department) VALUES
('2026-05-06', 'Utilities', 'Electricity bill', 8500, 'general'),
('2026-05-05', 'Supplies', 'Cleaning supplies', 2400, 'general'),
('2026-05-04', 'Maintenance', 'Plumbing repair', 5000, 'general'),
('2026-05-03', 'Salaries', 'Staff wages (Week 18)', 45000, 'general'),
('2026-05-02', 'Transport', 'Delivery charges', 1500, 'general')
ON CONFLICT DO NOTHING;


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

-- Insert Mock Data for Cash Submissions
INSERT INTO cash_submissions (date, cash_at_hand, creditor_payments, total_cash, status) VALUES
('2026-05-06', 28500, 3500, 32000, 'Pending'),
('2026-05-05', 32000, 5000, 37000, 'Approved'),
('2026-05-04', 25000, 2500, 27500, 'Approved')
ON CONFLICT DO NOTHING;


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

-- Insert Mock Data for Record Book Entries
INSERT INTO record_book_entries (date, description, category, amount_in, amount_out, balance) VALUES
('2023-10-25 08:30:00+00', 'Opening Balance', 'System', 5000, 0, 5000),
('2023-10-25 10:15:00+00', 'Table 4 Drinks', 'Sales', 3500, 0, 8500),
('2023-10-25 14:00:00+00', 'Bought Ice', 'Expense', 0, 500, 8000),
('2023-10-25 18:45:00+00', 'Table 12 Dinner', 'Sales', 6200, 0, 14200)
ON CONFLICT DO NOTHING;


-- -------------------------------------------------------------
-- 6. Creditors Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creditors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    reason TEXT,
    item_bought VARCHAR(255),
    phone_number VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_date DATE,
    department VARCHAR(50) DEFAULT 'bar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- No mock data for Creditors (production-ready)


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

-- Insert Mock Data for Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, status, rating) VALUES
('East African Breweries', 'Jane Doe', '+254711223344', 'sales@eabl.com', 'Nairobi, Kenya', 'active', 4.8),
('Coca-Cola Bottlers', 'John Smith', '+254722334455', 'orders@coca-cola.co.ke', 'Industrial Area, Nairobi', 'active', 4.5),
('Kenchic Depot', 'David Maina', '+254733445566', 'delivery@kenchic.com', 'Mombasa Road, Nairobi', 'active', 4.2)
ON CONFLICT DO NOTHING;


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

-- Insert Mock Data for Supplier Products
INSERT INTO supplier_products (supplier_id, product_name, price, unit) 
SELECT id, 'Tusker Lager', 3200, 'crate' FROM suppliers WHERE name = 'East African Breweries'
UNION ALL
SELECT id, 'Guinness Stout', 3800, 'crate' FROM suppliers WHERE name = 'East African Breweries'
UNION ALL
SELECT id, 'Coca Cola 500ml', 1200, 'crate' FROM suppliers WHERE name = 'Coca-Cola Bottlers'
UNION ALL
SELECT id, 'Fanta Orange 500ml', 1200, 'crate' FROM suppliers WHERE name = 'Coca-Cola Bottlers'
UNION ALL
SELECT id, 'Chicken Breast 1kg', 850, 'kg' FROM suppliers WHERE name = 'Kenchic Depot'
ON CONFLICT DO NOTHING;


-- -------------------------------------------------------------
-- 9. Supplier Deliveries Table (Synced with stock book)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_deliveries (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
    items VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    item_qty_per_pack INTEGER NOT NULL DEFAULT 1 CHECK (item_qty_per_pack >= 1),
    receipt_url TEXT,
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert Mock Data for Supplier Deliveries
INSERT INTO supplier_deliveries (date, supplier, price, items, quantity, item_qty_per_pack, receipt_url, department) VALUES
('2026-05-06', 'East African Breweries', 3200, 'Tusker Beer', 4, 24, 'receipt_001.pdf', 'bar'),
('2026-05-05', 'Coca-Cola Bottlers', 1200, 'Coca Cola', 8, 24, 'receipt_002.pdf', 'bar'),
('2026-05-04', 'East African Breweries', 3800, 'Guinness', 2, 24, NULL, 'bar')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- 10. Store Inventory Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_inventory (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    opening INTEGER NOT NULL DEFAULT 0,
    supplied INTEGER NOT NULL DEFAULT 0,
    loaded INTEGER NOT NULL DEFAULT 0,
    closing INTEGER NOT NULL DEFAULT 0,
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(name, department)
);

-- Insert Mock Data for Store Inventory
INSERT INTO store_inventory (name, opening, supplied, loaded, closing, department) VALUES
('Tusker Beer', 0, 96, 0, 96, 'bar'),
('Coca Cola', 0, 192, 0, 192, 'bar'),
('Guinness', 0, 48, 0, 48, 'bar')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- 11. Sales Reports Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_reports (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sales NUMERIC NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
    cash_at_hand NUMERIC NOT NULL DEFAULT 0 CHECK (cash_at_hand >= 0),
    pos_transfer NUMERIC NOT NULL DEFAULT 0 CHECK (pos_transfer >= 0),
    not_paid NUMERIC NOT NULL DEFAULT 0 CHECK (not_paid >= 0),
    additions_summary JSONB DEFAULT '[]'::jsonb,
    department VARCHAR(50) NOT NULL DEFAULT 'bar' CHECK (department IN ('bar', 'kitchen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(date, department)
);

-- Insert Mock Data for Sales Reports
INSERT INTO sales_reports (date, total_sales, cash_at_hand, pos_transfer, not_paid, additions_summary, department) VALUES
('2026-06-17', 25000, 10000, 15000, 0, '[{"name": "Tusker Beer", "quantity": 24}, {"name": "Guinness", "quantity": 12}]'::jsonb, 'bar')
ON CONFLICT DO NOTHING;
