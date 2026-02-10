-- Product Catalog V5 Seed Data
-- Minimal seed with only price books (no sample products)

-- Clear existing data
DELETE FROM PriceBookEntry;
DELETE FROM PriceBookEntryHeader;
DELETE FROM PriceBook;
DELETE FROM BundleComponent;
DELETE FROM RateCardEntry;
DELETE FROM ProductLine;
DELETE FROM Product;

-- ============================================================================
-- Price Books (Essential for pricing configuration)
-- ============================================================================

INSERT INTO PriceBook (priceBookNumber, priceBookName, isStandard, description) VALUES
('PB-STANDARD', 'Standard Price Book', 1, 'Standard list prices for all products'),
('PB-ENTERPRISE', 'Enterprise Price Book', 0, 'Enterprise discounted pricing');
