-- Product Catalog V5 Seed Data
-- Sample data matching V5 specification

-- Clear existing data
DELETE FROM PriceBookEntry;
DELETE FROM PriceBookEntryHeader;
DELETE FROM PriceBook;
DELETE FROM BundleComponent;
DELETE FROM RateCardEntry;
DELETE FROM ProductLine;
DELETE FROM Product;

-- ============================================================================
-- Products
-- ============================================================================

INSERT INTO Product (productNumber, productName, productCode, description, effectiveStartDate, productFamily, productType, productStatus, isBundleProduct, isInventory) VALUES
('P-1', 'Flow Video', 'FLOW-VID', 'Video processing and streaming platform', '2025-01-01', 'software', 'sub', 'active', 0, 0),
('P-2', 'Flow Image', 'FLOW-IMG', 'Image processing and optimization service', '2025-01-01', 'software', 'sub', 'active', 0, 0),
('P-3', 'Flow Bundle', 'FLOW-BUNDLE', 'Complete media processing bundle (Video + Image)', '2025-01-01', 'bundle', 'sub', 'active', 1, 0);

-- ============================================================================
-- Product Lines
-- ============================================================================

-- P-1: Flow Video
INSERT INTO ProductLine (productLineNumber, productNumber, lineType, priceModel, pricingTerm, unitOfMeasure, name, hasUsage, parentLine, description) VALUES
('PL-1', 'P-1', 'recurring', 'flat', 'annually', 'platform', 'Flow Video Platform', 1, NULL, 'Annual platform fee with usage allowance'),
('PL-2', 'P-1', 'usage', 'rateCard', NULL, NULL, 'Flow Video Usage', 0, 'PL-1', 'Usage charges linked to platform (commit/overage)'),
('PL-3', 'P-1', 'usage', 'rateCard', NULL, NULL, 'Flow Video PAYG', 0, NULL, 'Pay-as-you-go usage (no commitment)');

-- P-2: Flow Image
INSERT INTO ProductLine (productLineNumber, productNumber, lineType, priceModel, pricingTerm, unitOfMeasure, name, hasUsage, parentLine, description) VALUES
('PL-4', 'P-2', 'recurring', 'perUnit', 'annually', 'user', 'Flow Image Users', 0, NULL, 'Per user annual subscription');

-- P-3: Flow Bundle
INSERT INTO ProductLine (productLineNumber, productNumber, lineType, priceModel, pricingTerm, unitOfMeasure, name, hasUsage, parentLine, description) VALUES
('PL-5', 'P-3', 'recurring', 'perUnit', 'annually', 'user', 'Flow Bundle Users', 0, NULL, 'Bundle: Video + Image per user');

-- ============================================================================
-- Rate Card Entries
-- ============================================================================

-- PL-2: Flow Video Usage (Commit/Overage Pattern)
INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, conversion, billableUnitOfMeasure, allowance, term, rollover, rolloverDuration, maximumRolloverLimit) VALUES
('RCE-1', 'PL-2', NULL, 'allowance', NULL, NULL, 'credit', 1000, 'monthly', 1, 3, 500);

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, conversion, billableUnitOfMeasure) VALUES
('RCE-2', 'PL-2', 'RDS', 'consumption', 'gb', 1, 'credit'),
('RCE-3', 'PL-2', 'EBS', 'consumption', 'message', 2, 'credit');

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, invoiceFrequency, priceModel) VALUES
('RCE-4', 'PL-2', 'RDS', 'overage', 'gb', 'monthly', 'perUnit'),
('RCE-5', 'PL-2', 'EBS', 'overage', 'message', 'monthly', 'tiered');

-- PL-3: Flow Video PAYG (No Commitment)
INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, invoiceFrequency, priceModel) VALUES
('RCE-6', 'PL-3', 'EBS', 'PAYG', 'message', 'monthly', 'volume'),
('RCE-7', 'PL-3', 'RDS', 'PAYG', 'message', 'monthly', 'volume'),
('RCE-8', 'PL-3', 'RBS', 'PAYG', 'gb', 'monthly', 'perUnit');

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, invoiceFrequency) VALUES
('RCE-9', 'PL-3', 'RBS', 'minimumCommit', 'monthly');

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, invoiceFrequency, priceModel, expiration) VALUES
('RCE-10', 'PL-3', NULL, 'prepaid', 'once', 'perUnit', 12);

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, conversion, billableUnitOfMeasure) VALUES
('RCE-11', 'PL-3', NULL, 'consumption', 'gb', 0.1, 'credit');

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure) VALUES
('RCE-12', 'PL-3', NULL, 'overage', 'gb');

-- ============================================================================
-- Bundle Components
-- ============================================================================

-- P-3 Flow Bundle includes PL-1 (Flow Video) and PL-4 (Flow Image) with parent-level pricing
INSERT INTO BundleComponent (bundleComponentNumber, bundleProductLine, componentProductLine, componentPricingLevel, productLineType, componentQuantity, quantityDependency, allocationPercentage, isOptional) VALUES
('BC-1', 'PL-5', 'PL-1', 'parent', 'recurring', 1, 'dependent', 60, 0),
('BC-2', 'PL-5', 'PL-4', 'parent', 'recurring', 1, 'dependent', 40, 0);

-- ============================================================================
-- Price Books
-- ============================================================================

INSERT INTO PriceBook (priceBookNumber, priceBookName, isStandard, description) VALUES
('PB-STANDARD', 'Standard Price Book', 1, 'Standard list prices for all products'),
('PB-ENTERPRISE', 'Enterprise Price Book', 0, 'Enterprise discounted pricing');

-- ============================================================================
-- Price Book Entry Headers (Product Line + Currency)
-- ============================================================================

-- PL-1: Flow Video Platform (Standard & Enterprise in USD, EUR, GBP)
INSERT INTO PriceBookEntryHeader (headerNumber, priceBookId, productLineNumber, currency, validFrom) VALUES
('PBH-1-STD-USD', 'PB-STANDARD', 'PL-1', 'USD', '2025-01-01'),
('PBH-1-STD-EUR', 'PB-STANDARD', 'PL-1', 'EUR', '2025-01-01'),
('PBH-1-STD-GBP', 'PB-STANDARD', 'PL-1', 'GBP', '2025-01-01'),
('PBH-1-ENT-USD', 'PB-ENTERPRISE', 'PL-1', 'USD', '2025-01-01'),
('PBH-1-ENT-EUR', 'PB-ENTERPRISE', 'PL-1', 'EUR', '2025-01-01'),
('PBH-1-ENT-GBP', 'PB-ENTERPRISE', 'PL-1', 'GBP', '2025-01-01');

-- PL-4: Flow Image Users (Standard & Enterprise in USD, EUR, GBP)
INSERT INTO PriceBookEntryHeader (headerNumber, priceBookId, productLineNumber, currency, validFrom) VALUES
('PBH-4-STD-USD', 'PB-STANDARD', 'PL-4', 'USD', '2025-01-01'),
('PBH-4-STD-EUR', 'PB-STANDARD', 'PL-4', 'EUR', '2025-01-01'),
('PBH-4-STD-GBP', 'PB-STANDARD', 'PL-4', 'GBP', '2025-01-01'),
('PBH-4-ENT-USD', 'PB-ENTERPRISE', 'PL-4', 'USD', '2025-01-01'),
('PBH-4-ENT-EUR', 'PB-ENTERPRISE', 'PL-4', 'EUR', '2025-01-01'),
('PBH-4-ENT-GBP', 'PB-ENTERPRISE', 'PL-4', 'GBP', '2025-01-01');

-- PL-5: Flow Bundle Users (Standard & Enterprise in USD, EUR, GBP)
INSERT INTO PriceBookEntryHeader (headerNumber, priceBookId, productLineNumber, currency, validFrom) VALUES
('PBH-5-STD-USD', 'PB-STANDARD', 'PL-5', 'USD', '2025-01-01'),
('PBH-5-STD-EUR', 'PB-STANDARD', 'PL-5', 'EUR', '2025-01-01'),
('PBH-5-STD-GBP', 'PB-STANDARD', 'PL-5', 'GBP', '2025-01-01'),
('PBH-5-ENT-USD', 'PB-ENTERPRISE', 'PL-5', 'USD', '2025-01-01'),
('PBH-5-ENT-EUR', 'PB-ENTERPRISE', 'PL-5', 'EUR', '2025-01-01'),
('PBH-5-ENT-GBP', 'PB-ENTERPRISE', 'PL-5', 'GBP', '2025-01-01');

-- Rate Card Entry Headers (for usage pricing)
INSERT INTO PriceBookEntryHeader (headerNumber, priceBookId, productLineNumber, currency, validFrom) VALUES
('PBH-2-STD-USD', 'PB-STANDARD', 'PL-2', 'USD', '2025-01-01'),
('PBH-2-STD-EUR', 'PB-STANDARD', 'PL-2', 'EUR', '2025-01-01'),
('PBH-2-STD-GBP', 'PB-STANDARD', 'PL-2', 'GBP', '2025-01-01'),
('PBH-2-ENT-USD', 'PB-ENTERPRISE', 'PL-2', 'USD', '2025-01-01'),
('PBH-2-ENT-EUR', 'PB-ENTERPRISE', 'PL-2', 'EUR', '2025-01-01'),
('PBH-2-ENT-GBP', 'PB-ENTERPRISE', 'PL-2', 'GBP', '2025-01-01');

-- ============================================================================
-- Price Book Entries (Actual Prices)
-- ============================================================================

-- PL-1: Flow Video Platform - Flat annual fee (Standard pricing)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-1-STD-USD', 'PBH-1-STD-USD', 10000.00, 0),   -- $10,000/year
('PBE-1-STD-EUR', 'PBH-1-STD-EUR', 9000.00, 0),    -- €9,000/year
('PBE-1-STD-GBP', 'PBH-1-STD-GBP', 8000.00, 0);    -- £8,000/year

-- PL-1: Flow Video Platform - Flat annual fee (Enterprise pricing - 20% discount)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-1-ENT-USD', 'PBH-1-ENT-USD', 8000.00, 0),    -- $8,000/year
('PBE-1-ENT-EUR', 'PBH-1-ENT-EUR', 7200.00, 0),    -- €7,200/year
('PBE-1-ENT-GBP', 'PBH-1-ENT-GBP', 6400.00, 0);    -- £6,400/year

-- PL-4: Flow Image Users - Per user pricing (Standard pricing)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-4-STD-USD', 'PBH-4-STD-USD', 120.00, 0),     -- $120/user/year
('PBE-4-STD-EUR', 'PBH-4-STD-EUR', 108.00, 0),     -- €108/user/year
('PBE-4-STD-GBP', 'PBH-4-STD-GBP', 96.00, 0);      -- £96/user/year

-- PL-4: Flow Image Users - Per user pricing (Enterprise pricing - 20% discount)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-4-ENT-USD', 'PBH-4-ENT-USD', 96.00, 0),      -- $96/user/year
('PBE-4-ENT-EUR', 'PBH-4-ENT-EUR', 86.40, 0),      -- €86.40/user/year
('PBE-4-ENT-GBP', 'PBH-4-ENT-GBP', 76.80, 0);      -- £76.80/user/year

-- PL-5: Flow Bundle Users - Bundle pricing (Standard pricing)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-5-STD-USD', 'PBH-5-STD-USD', 150.00, 0),     -- $150/user/year
('PBE-5-STD-EUR', 'PBH-5-STD-EUR', 135.00, 0),     -- €135/user/year
('PBE-5-STD-GBP', 'PBH-5-STD-GBP', 120.00, 0);     -- £120/user/year

-- PL-5: Flow Bundle Users - Bundle pricing (Enterprise pricing - 25% discount)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity) VALUES
('PBE-5-ENT-USD', 'PBH-5-ENT-USD', 112.50, 0),     -- $112.50/user/year
('PBE-5-ENT-EUR', 'PBH-5-ENT-EUR', 101.25, 0),     -- €101.25/user/year
('PBE-5-ENT-GBP', 'PBH-5-ENT-GBP', 90.00, 0);      -- £90/user/year

-- PL-2: Usage Overage Pricing (RDS - linked to RCE-4) - Standard
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity, rateCardEntryId) VALUES
('PBE-2-RDS-STD-USD', 'PBH-2-STD-USD', 0.10, 0, 'RCE-4'),     -- $0.10/GB overage
('PBE-2-RDS-STD-EUR', 'PBH-2-STD-EUR', 0.09, 0, 'RCE-4'),     -- €0.09/GB overage
('PBE-2-RDS-STD-GBP', 'PBH-2-STD-GBP', 0.08, 0, 'RCE-4');     -- £0.08/GB overage

-- PL-2: Usage Overage Pricing (RDS) - Enterprise (10% discount)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity, rateCardEntryId) VALUES
('PBE-2-RDS-ENT-USD', 'PBH-2-ENT-USD', 0.09, 0, 'RCE-4'),     -- $0.09/GB overage
('PBE-2-RDS-ENT-EUR', 'PBH-2-ENT-EUR', 0.081, 0, 'RCE-4'),    -- €0.081/GB overage
('PBE-2-RDS-ENT-GBP', 'PBH-2-ENT-GBP', 0.072, 0, 'RCE-4');    -- £0.072/GB overage

-- PL-2: Usage Overage Pricing (EBS - tiered, linked to RCE-5) - Standard
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity, rateCardEntryId) VALUES
('PBE-2-EBS-T1-STD-USD', 'PBH-2-STD-USD', 0.02, 0, 'RCE-5'),      -- $0.02/message (0-10000)
('PBE-2-EBS-T2-STD-USD', 'PBH-2-STD-USD', 0.015, 10001, 'RCE-5'), -- $0.015/message (10001+)
('PBE-2-EBS-T1-STD-EUR', 'PBH-2-STD-EUR', 0.018, 0, 'RCE-5'),     -- €0.018/message (0-10000)
('PBE-2-EBS-T2-STD-EUR', 'PBH-2-STD-EUR', 0.0135, 10001, 'RCE-5'),-- €0.0135/message (10001+)
('PBE-2-EBS-T1-STD-GBP', 'PBH-2-STD-GBP', 0.016, 0, 'RCE-5'),     -- £0.016/message (0-10000)
('PBE-2-EBS-T2-STD-GBP', 'PBH-2-STD-GBP', 0.012, 10001, 'RCE-5'); -- £0.012/message (10001+)

-- PL-2: Usage Overage Pricing (EBS - tiered) - Enterprise (10% discount)
INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity, rateCardEntryId) VALUES
('PBE-2-EBS-T1-ENT-USD', 'PBH-2-ENT-USD', 0.018, 0, 'RCE-5'),     -- $0.018/message
('PBE-2-EBS-T2-ENT-USD', 'PBH-2-ENT-USD', 0.0135, 10001, 'RCE-5'),-- $0.0135/message
('PBE-2-EBS-T1-ENT-EUR', 'PBH-2-ENT-EUR', 0.0162, 0, 'RCE-5'),    -- €0.0162/message
('PBE-2-EBS-T2-ENT-EUR', 'PBH-2-ENT-EUR', 0.01215, 10001, 'RCE-5'),-- €0.01215/message
('PBE-2-EBS-T1-ENT-GBP', 'PBH-2-ENT-GBP', 0.0144, 0, 'RCE-5'),    -- £0.0144/message
('PBE-2-EBS-T2-ENT-GBP', 'PBH-2-ENT-GBP', 0.0108, 10001, 'RCE-5');-- £0.0108/message
