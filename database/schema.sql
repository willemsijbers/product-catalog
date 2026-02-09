-- Product Catalog Database Schema V5
-- Multi-tenant Order-to-Cash System
-- Simplified model: 7 entities (removed ProductOffering and ProductOfferingLine)

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. Product Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS Product (
    productNumber TEXT PRIMARY KEY,
    productName TEXT NOT NULL,
    productCode TEXT UNIQUE NOT NULL,
    internalDescription TEXT,
    description TEXT,
    effectiveStartDate TEXT,
    effectiveEndDate TEXT,
    productFamily TEXT CHECK(productFamily IN ('software', 'hardware', 'service', 'bundle', 'other')),
    productType TEXT CHECK(productType IN ('sub', 'perpetual', 'consumption', 'other')),
    productStatus TEXT CHECK(productStatus IN ('draft', 'active', 'inactive', 'retired')),
    externalProvisioningIdRequired INTEGER DEFAULT 0 CHECK(externalProvisioningIdRequired IN (0, 1)),
    isBundleProduct INTEGER DEFAULT 0 CHECK(isBundleProduct IN (0, 1)),
    isInventory INTEGER DEFAULT 0 CHECK(isInventory IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    -- Date validation
    CHECK (effectiveEndDate IS NULL OR effectiveEndDate > effectiveStartDate)
);

-- ============================================================================
-- 2. ProductLine Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS ProductLine (
    productLineNumber TEXT PRIMARY KEY,
    productNumber TEXT NOT NULL,
    lineType TEXT NOT NULL CHECK(lineType IN ('recurring', 'oneTime', 'usage', 'billableTime', 'billableTravelExpense', 'billablePassThrough')),
    priceModel TEXT NOT NULL CHECK(priceModel IN ('flat', 'perUnit', 'tiered', 'volume', 'stairstep', 'rateCard')),
    pricingTerm TEXT CHECK(pricingTerm IN ('once', 'monthly', 'biMonthly', 'quarterly', 'semiAnnually', 'annually', 'weekly', 'custom', 'template', 'allAtOnce')),
    unitOfMeasure TEXT,
    hasBeenUsed INTEGER DEFAULT 0 CHECK(hasBeenUsed IN (0, 1)),
    crmProductId TEXT,
    name TEXT NOT NULL,
    hasUsage INTEGER DEFAULT 0 CHECK(hasUsage IN (0, 1)),
    parentLine TEXT,
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (productNumber) REFERENCES Product(productNumber) ON DELETE CASCADE,
    FOREIGN KEY (parentLine) REFERENCES ProductLine(productLineNumber) ON DELETE CASCADE,

    -- P0 Constraints: hasUsage and parentLine patterns
    CHECK (hasUsage = 0 OR lineType = 'recurring'),
    CHECK (parentLine IS NULL OR lineType = 'usage'),
    CHECK (parentLine IS NULL OR parentLine != productLineNumber),

    -- P0 Constraint: Usage lines must use rateCard price model
    CHECK (lineType != 'usage' OR priceModel = 'rateCard')
);

-- ============================================================================
-- 3. RateCardEntry Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS RateCardEntry (
    rateCardEntryNumber TEXT PRIMARY KEY,
    productLineId TEXT NOT NULL,
    identifier TEXT,
    usageType TEXT NOT NULL CHECK(usageType IN ('PAYG', 'allowance', 'consumption', 'overage', 'minimumCommit', 'prepaid')),
    usageUnitOfMeasure TEXT,
    conversion REAL,
    billableUnitOfMeasure TEXT,
    invoiceFrequency TEXT CHECK(invoiceFrequency IN ('once', 'monthly', 'biMonthly', 'quarterly', 'semiAnnually', 'annually')),
    priceModel TEXT CHECK(priceModel IN ('perUnit', 'tiered', 'volume', 'stairstep')),
    allowance REAL,
    term TEXT CHECK(term IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
    rollover INTEGER DEFAULT 0 CHECK(rollover IN (0, 1)),
    rolloverDuration INTEGER,
    maximumRolloverLimit REAL,
    expiration INTEGER,
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (productLineId) REFERENCES ProductLine(productLineNumber) ON DELETE CASCADE,

    -- P0 Constraints: Enhanced field validations
    CHECK (rolloverDuration IS NULL OR rollover = 1),
    CHECK (maximumRolloverLimit IS NULL OR rollover = 1),
    CHECK (allowance IS NULL OR usageType = 'allowance'),
    CHECK (conversion IS NULL OR conversion > 0),
    CHECK (expiration IS NULL OR usageType = 'prepaid')
);

-- ============================================================================
-- 4. BundleComponent Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS BundleComponent (
    bundleComponentNumber TEXT PRIMARY KEY,
    bundleProductLine TEXT NOT NULL,
    componentProductLine TEXT NOT NULL,
    componentPricingLevel TEXT NOT NULL CHECK(componentPricingLevel IN ('parent', 'component')),
    productLineType TEXT NOT NULL CHECK(productLineType IN ('recurring', 'oneTime', 'usage')),
    componentQuantity REAL DEFAULT 1,
    quantityDependency TEXT CHECK(quantityDependency IN ('dependent', 'independent')),
    allocationPercentage REAL,
    discountPercentage REAL,
    overrideRateCardId TEXT,
    isOptional INTEGER DEFAULT 0 CHECK(isOptional IN (0, 1)),
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (bundleProductLine) REFERENCES ProductLine(productLineNumber) ON DELETE CASCADE,
    FOREIGN KEY (componentProductLine) REFERENCES ProductLine(productLineNumber) ON DELETE CASCADE,
    FOREIGN KEY (overrideRateCardId) REFERENCES RateCardEntry(rateCardEntryNumber) ON DELETE SET NULL,

    -- P0 Constraints: Bundle validations
    CHECK (bundleProductLine != componentProductLine),
    CHECK (allocationPercentage IS NULL OR (allocationPercentage >= 0 AND allocationPercentage <= 100)),
    CHECK (discountPercentage IS NULL OR (discountPercentage >= 0 AND discountPercentage <= 100)),
    CHECK (allocationPercentage IS NULL OR componentPricingLevel = 'parent'),
    CHECK (discountPercentage IS NULL OR componentPricingLevel = 'component')
);

-- ============================================================================
-- 5. PriceBook Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS PriceBook (
    priceBookNumber TEXT PRIMARY KEY,
    priceBookName TEXT NOT NULL,
    isStandard INTEGER DEFAULT 0 CHECK(isStandard IN (0, 1)),
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. PriceBookEntryHeader Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS PriceBookEntryHeader (
    headerNumber TEXT PRIMARY KEY,
    priceBookId TEXT NOT NULL,
    productLineNumber TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD', 'EUR', 'GBP')),
    validFrom TEXT,
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (priceBookId) REFERENCES PriceBook(priceBookNumber) ON DELETE CASCADE,
    FOREIGN KEY (productLineNumber) REFERENCES ProductLine(productLineNumber) ON DELETE CASCADE
);

-- ============================================================================
-- 7. PriceBookEntry Entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS PriceBookEntry (
    priceBookEntryNumber TEXT PRIMARY KEY,
    headerId TEXT NOT NULL,
    listPrice REAL NOT NULL,
    fromQuantity REAL DEFAULT 0,
    rateCardEntryId TEXT,
    description TEXT,
    isActive INTEGER DEFAULT 1 CHECK(isActive IN (0, 1)),
    createdDate TEXT DEFAULT CURRENT_TIMESTAMP,
    modifiedDate TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (headerId) REFERENCES PriceBookEntryHeader(headerNumber) ON DELETE CASCADE,
    FOREIGN KEY (rateCardEntryId) REFERENCES RateCardEntry(rateCardEntryNumber) ON DELETE SET NULL
);

-- ============================================================================
-- P0 INDEXES: Foreign Keys and Common Queries
-- ============================================================================

-- ProductLine indexes
CREATE INDEX IF NOT EXISTS idx_productline_product ON ProductLine(productNumber);
CREATE INDEX IF NOT EXISTS idx_productline_parent ON ProductLine(parentLine);
CREATE INDEX IF NOT EXISTS idx_productline_linetype ON ProductLine(lineType);
CREATE INDEX IF NOT EXISTS idx_productline_hasusage ON ProductLine(hasUsage) WHERE hasUsage = 1;
CREATE INDEX IF NOT EXISTS idx_productline_parent_composite ON ProductLine(parentLine, lineType, productLineNumber);

-- RateCardEntry indexes
CREATE INDEX IF NOT EXISTS idx_ratecard_productline ON RateCardEntry(productLineId);
CREATE INDEX IF NOT EXISTS idx_ratecard_usagetype ON RateCardEntry(usageType);
CREATE INDEX IF NOT EXISTS idx_ratecard_identifier ON RateCardEntry(identifier) WHERE identifier IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ratecard_identifier_type ON RateCardEntry(productLineId, identifier, usageType) WHERE identifier IS NOT NULL;

-- BundleComponent indexes
CREATE INDEX IF NOT EXISTS idx_bundle_bundle_line ON BundleComponent(bundleProductLine);
CREATE INDEX IF NOT EXISTS idx_bundle_component_line ON BundleComponent(componentProductLine);

-- PriceBookEntryHeader indexes
CREATE INDEX IF NOT EXISTS idx_pbheader_pricebook ON PriceBookEntryHeader(priceBookId);
CREATE INDEX IF NOT EXISTS idx_pbheader_productline ON PriceBookEntryHeader(productLineNumber);
CREATE INDEX IF NOT EXISTS idx_pbheader_lookup ON PriceBookEntryHeader(productLineNumber, currency, priceBookId);

-- PriceBookEntry indexes
CREATE INDEX IF NOT EXISTS idx_pbentry_header ON PriceBookEntry(headerId);
CREATE INDEX IF NOT EXISTS idx_pbentry_ratecard ON PriceBookEntry(rateCardEntryId);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_product_status ON Product(productStatus);
CREATE INDEX IF NOT EXISTS idx_product_isbundle ON Product(isBundleProduct) WHERE isBundleProduct = 1;
CREATE INDEX IF NOT EXISTS idx_product_effective ON Product(effectiveStartDate, effectiveEndDate);

-- P0: Only one standard price book
CREATE UNIQUE INDEX IF NOT EXISTS uq_standard_pricebook ON PriceBook(isStandard) WHERE isStandard = 1;

-- ============================================================================
-- P1 HELPER VIEW: Commit/Overage Structures
-- ============================================================================
CREATE VIEW IF NOT EXISTS vw_commit_overage_structures AS
SELECT
    parent.productLineNumber as parent_line,
    parent.name as parent_name,
    parent.productNumber as product_number,
    child.productLineNumber as usage_line,
    child.name as usage_name,
    COUNT(rce.rateCardEntryNumber) as rate_card_count
FROM ProductLine parent
LEFT JOIN ProductLine child ON parent.productLineNumber = child.parentLine
LEFT JOIN RateCardEntry rce ON child.productLineNumber = rce.productLineId
WHERE parent.hasUsage = 1
GROUP BY parent.productLineNumber, parent.name, parent.productNumber, child.productLineNumber, child.name;
