-- Migration: Add PaymentTransactionItem table and uin_count field
-- Created: 2026-01-15
-- Description: Adds support for tracking individual UIN status in multi-payment transactions

-- Add uin_count field to payment_transactions table
ALTER TABLE payment_transactions ADD COLUMN uin_count INTEGER DEFAULT 1;

-- Create payment_transaction_items table
CREATE TABLE payment_transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL,
    uin VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_transaction_items_transaction_id ON payment_transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_uin ON payment_transaction_items(uin);
CREATE INDEX idx_transaction_items_transaction_uin ON payment_transaction_items(transaction_id, uin);

-- Add comment for documentation
COMMENT ON TABLE payment_transaction_items IS 'Tracks individual UIN status in payment transactions for multi-payment support';
COMMENT ON COLUMN payment_transaction_items.status IS 'Status values: pending, paid, failed, cancelled';
