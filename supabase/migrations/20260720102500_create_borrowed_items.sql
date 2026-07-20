CREATE TABLE IF NOT EXISTS borrowed_items (
    id BIGSERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    borrowed_from VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RETURNED')),
    returned_date DATE,
    department VARCHAR(50) NOT NULL DEFAULT 'bar',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
