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
-- Products
-- ============================================================================

INSERT INTO Product (productNumber, productName, productCode, internalDescription, description, effectiveStartDate, effectiveEndDate, productFamily, productType, productStatus, externalProvisioningIdRequired, isBundleProduct, isInventory) VALUES
('P-1', 'Flow Video', 'FLOW-VID', '', '', '2025-01-01', NULL, 'software', 'sub', 'active', 0, 0, 0),
('P-2', 'Flow Image', 'FLOW-IMG', '', '', '2025-01-01', NULL, 'software', 'sub', 'active', 0, 0, 0),
('P-3', 'Flow Bundle', 'FLOW-BUNDLE', '', '', '2025-01-01', NULL, 'bundle', 'sub', 'active', 0, 1, 0),
('P-4', 'Flow Software', 'FLOW-SOFTWARE', '', '', '2025-01-01', NULL, 'software', 'sub', 'active', 0, 0, 0);

-- ============================================================================
-- Product Lines
-- ============================================================================

INSERT INTO ProductLine (productLineNumber, productNumber, lineType, priceModel, pricingTerm, unitOfMeasure, hasBeenUsed, crmProductId, name, hasUsage, parentLine) VALUES
-- Recurring subscription with usage children
('PL-1', 'P-1', 'recurring', 'flat', 'annually', 'platform', 1, NULL, 'Flow Video Platform', 1, NULL),
('PL-2', 'P-1', 'usage', 'rateCard', NULL, NULL, 0, NULL, 'Flow Video Usage - Commit/Overage', 0, 'PL-1'),
('PL-3', 'P-1', 'usage', 'rateCard', NULL, NULL, 0, NULL, 'Flow Video Usage - PAYG', 0, NULL),

-- Per-unit recurring
('PL-4', 'P-2', 'recurring', 'perUnit', 'annually', 'user', 0, NULL, 'Flow Image Per User', 0, NULL),

-- Bundle
('PL-5', 'P-3', 'recurring', 'perUnit', 'annually', 'user', 0, NULL, 'Flow Bundle', 0, NULL),

-- Prepaid with usage child (NEW STRUCTURE)
('PL-6', 'P-4', 'prepaid', 'perUnit', 'once', 'credit', 1, NULL, 'Flow Software Credits', 1, NULL),
('PL-7', 'P-4', 'usage', 'rateCard', NULL, NULL, 0, NULL, 'Flow Software Consumption', 0, 'PL-6');

-- ============================================================================
-- Bundle Components
-- ============================================================================

INSERT INTO BundleComponent (bundleComponentNumber, bundleProductLine, componentProductLine, componentPricingLevel, productLineType, componentQuantity, quantityDependency, allocationPercentage, discountPercentage, overrideRateCardId, isOptional) VALUES
('BC-1', 'PL-5', 'PL-1', 'parent', 'recurring', 1, 'dependent', 60, NULL, NULL, 0),
('BC-2', 'PL-5', 'PL-4', 'parent', 'recurring', 1, 'dependent', 40, NULL, NULL, 0);

-- ============================================================================
-- Rate Card Entries
-- ============================================================================

INSERT INTO RateCardEntry (rateCardEntryNumber, productLineId, identifier, usageType, usageUnitOfMeasure, conversion, billableUnitOfMeasure, invoiceFrequency, priceModel, allowance, term, rollover, rolloverDuration, maximumRolloverLimit, expiration) VALUES
-- PL-2: Commit/Overage structure
('RCE-1', 'PL-2', 'RDS', 'allowance', NULL, NULL, 'credit', NULL, NULL, 1000, 'monthly', 1, 3, 500, NULL),
('RCE-2', 'PL-2', 'RDS', 'consumption', 'gb', 1, 'credit', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
('RCE-3', 'PL-2', 'EBS', 'consumption', 'message', 2, 'credit', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
('RCE-4', 'PL-2', 'RDS', 'overage', 'gb', NULL, NULL, 'monthly', 'perUnit', NULL, NULL, 0, NULL, NULL, NULL),
('RCE-5', 'PL-2', 'EBS', 'overage', 'message', NULL, NULL, 'monthly', 'tiered', NULL, NULL, 0, NULL, NULL, NULL),

-- PL-3: PAYG structure
('RCE-6', 'PL-3', 'EBS', 'PAYG', 'message', NULL, 'message', 'monthly', 'volume', NULL, NULL, 0, NULL, NULL, NULL),
('RCE-7', 'PL-3', 'RDS', 'PAYG', 'message', NULL, 'message', 'monthly', 'volume', NULL, NULL, 0, NULL, NULL, NULL),
('RCE-8', 'PL-3', 'RBS', 'PAYG', 'gb', NULL, NULL, 'monthly', 'perUnit', NULL, NULL, 0, NULL, NULL, NULL),
('RCE-9', 'PL-3', 'RBS', 'minimumCommit', NULL, NULL, NULL, NULL, 'perUnit', NULL, NULL, 0, NULL, NULL, NULL),

-- PL-7: Prepaid consumption and overage (NEW STRUCTURE)
('RCE-11', 'PL-7', NULL, 'consumption', 'gb', 0.1, 'credit', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
('RCE-12', 'PL-7', NULL, 'overage', 'gb', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);

-- ============================================================================
-- Price Books (Essential for pricing configuration)
-- ============================================================================

INSERT INTO PriceBook (priceBookNumber, priceBookName, isStandard, description) VALUES
('PB-STANDARD', 'Standard Price Book', 1, 'Standard list prices for all products'),
('PB-ENTERPRISE', 'Enterprise Price Book', 0, 'Enterprise discounted pricing');

-- ============================================================================
-- Price Book Entry Headers
-- ============================================================================

INSERT INTO PriceBookEntryHeader (headerNumber, priceBookId, productLineNumber, currency, validFrom) VALUES
('PBH-1', 'PB-STANDARD', 'PL-1', 'USD', '2025-01-01'),
('PBH-2', 'PB-STANDARD', 'PL-4', 'USD', '2025-01-01'),
('PBH-3', 'PB-STANDARD', 'PL-5', 'USD', '2025-01-01'),
('PBH-4', 'PB-STANDARD', 'PL-6', 'USD', '2025-01-01');

-- ============================================================================
-- Price Book Entries
-- ============================================================================

INSERT INTO PriceBookEntry (priceBookEntryNumber, headerId, listPrice, fromQuantity, rateCardEntryId) VALUES
-- Platform pricing
('PBE-1', 'PBH-1', 10000.00, 0, NULL),

-- Per-user pricing
('PBE-2', 'PBH-2', 50.00, 0, NULL),

-- Bundle pricing
('PBE-3', 'PBH-3', 100.00, 0, NULL),

-- Prepaid credit pricing
('PBE-4', 'PBH-4', 1.00, 0, NULL),

-- Rate card overage pricing for RCE-4
('PBE-5', 'PBH-1', 0.15, 0, 'RCE-4'),

-- Rate card overage pricing tiered for RCE-5
('PBE-6', 'PBH-1', 0.10, 0, 'RCE-5'),
('PBE-7', 'PBH-1', 0.08, 1000, 'RCE-5'),
('PBE-8', 'PBH-1', 0.06, 10000, 'RCE-5'),

-- PAYG pricing for PL-3
('PBE-9', 'PBH-1', 0.20, 0, 'RCE-6'),
('PBE-10', 'PBH-1', 0.18, 1000, 'RCE-6'),
('PBE-11', 'PBH-1', 0.25, 0, 'RCE-7'),
('PBE-12', 'PBH-1', 0.12, 0, 'RCE-8'),
('PBE-13', 'PBH-1', 500.00, 0, 'RCE-9'),

-- Prepaid overage pricing for PL-7
('PBE-14', 'PBH-4', 1.50, 0, 'RCE-12');
