-- Database Schema for ERP System

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- e.g., kg, piece
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Stock Table
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    supplier_id INT REFERENCES suppliers(id),
    quantity_added DECIMAL(10, 2) NOT NULL,
    remaining_stock DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Billing Table (Invoices)
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bill Items Table (Line items for each bill)
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES bills(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity DECIMAL(10, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

-- 8. Transport Table
CREATE TABLE IF NOT EXISTS transport (
    id SERIAL PRIMARY KEY,
    driver_name VARCHAR(255),
    vehicle_number VARCHAR(100),
    bill_id INT REFERENCES bills(id),
    cost DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Salary Table
CREATE TABLE IF NOT EXISTS salary (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    month VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Rent Table
CREATE TABLE IF NOT EXISTS rent (
    id SERIAL PRIMARY KEY,
    property_name VARCHAR(255) NOT NULL,
    landlord_name VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Investments Table
CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    investment_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount_invested DECIMAL(12, 2) NOT NULL,
    expected_return DECIMAL(12, 2),
    investment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Other Expenses Table
CREATE TABLE IF NOT EXISTS other_expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
