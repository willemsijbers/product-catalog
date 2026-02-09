# Product Catalog - Technical Architecture

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Component library
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **NestJS** - TypeScript Node.js framework
- **TypeORM** - ORM for database
- **PostgreSQL** - Database
- **Class Validator** - DTO validation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Product    │  │  Product     │  │  Rate Card   │     │
│  │   Create     │  │  Line Form   │  │  Builder     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                       Backend (NestJS)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Product    │  │  ProductLine │  │  RateCard    │     │
│  │   Module     │  │  Module      │  │  Module      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │ TypeORM
┌─────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                   │
│  Product → ProductLine → RateCardEntry → PriceBookEntry     │
└─────────────────────────────────────────────────────────────┘
```

## Data Model (V5)

Based on [Architecture Review - Product Catalog V5](../../Product Catalog/Architecture Review - Product Catalog V5.md)

### Core Entities

```typescript
// Product (Main entity)
Product {
  productNumber: string (PK)
  productCode: string (unique)
  name: string
  description?: string
  effectiveStartDate: Date
  effectiveEndDate?: Date
  productLines: ProductLine[]
}

// ProductLine (Billable components)
ProductLine {
  productLineNumber: string (PK)
  productNumber: string (FK → Product)
  lineType: 'recurring' | 'oneTime' | 'usage'
  priceModel: 'flat' | 'perUnit' | 'tiered' | 'volume' | 'rateCard'
  hasUsage: boolean
  parentLine?: string (FK → ProductLine, for commit/overage)
  rateCardEntries: RateCardEntry[]
}

// RateCardEntry (Pricing structure)
RateCardEntry {
  rateCardEntryNumber: string (PK)
  productLineId: string (FK → ProductLine)
  usageType: 'allowance' | 'consumption' | 'overage' | 'prepaid'
  conversion?: number
  allowance?: number
  term?: 'daily' | 'monthly' | 'quarterly' | 'annually'
  rollover?: boolean
  rolloverDuration?: number
  maximumRolloverLimit?: number
  expiration?: number
}

// PriceBookEntry (Actual prices)
PriceBookEntry {
  priceBookEntryNumber: string (PK)
  rateCardEntryId: string (FK → RateCardEntry)
  listPrice: Decimal
  fromQuantity: number
  toQuantity?: number
}
```

### Key Patterns

#### 1. Product → ProductLine Direct Relationship
- V5 removes the ProductOffering layer for simplicity
- Products contain ProductLines directly
- Different pricing tiers = different products

#### 2. Commit/Overage Pattern
```typescript
// Recurring line with usage
RecurringLine {
  lineType: 'recurring',
  hasUsage: true,
  childLines: [UsageLine]
}

// Usage line linked to parent
UsageLine {
  lineType: 'usage',
  parentLine: RecurringLine.productLineNumber,
  rateCardEntries: [...]
}
```

#### 3. Structure vs. Pricing Separation
- **RateCardEntry**: Defines WHAT and HOW (structure, tiers, allowances)
- **PriceBookEntry**: Defines HOW MUCH (actual prices, currency)
- Enables multi-currency and multi-segment pricing

## API Design

### RESTful Endpoints

```
POST   /api/products                    Create product with lines
GET    /api/products                    List products
GET    /api/products/:id                Get product details
PUT    /api/products/:id                Update product
DELETE /api/products/:id                Delete product

POST   /api/products/:id/lines          Add product line
PUT    /api/products/:id/lines/:lineId  Update product line
DELETE /api/products/:id/lines/:lineId  Delete product line

POST   /api/rate-cards                  Create rate card entry
GET    /api/rate-cards/:id              Get rate card details
PUT    /api/rate-cards/:id              Update rate card entry
```

### DTOs

```typescript
// CreateProductDto
{
  productCode: string
  name: string
  description?: string
  effectiveStartDate: Date
  productLines?: CreateProductLineDto[]
}

// CreateProductLineDto
{
  lineType: 'recurring' | 'oneTime' | 'usage'
  name: string
  priceModel: string
  hasUsage?: boolean
  parentLine?: string
  rateCardEntries?: CreateRateCardEntryDto[]
}

// CreateRateCardEntryDto
{
  usageType: 'allowance' | 'consumption' | 'overage' | 'prepaid'
  conversion?: number
  allowance?: number
  term?: string
  rollover?: boolean
  // ... other fields
}
```

## UI/UX Flow

### Seamless Product + Product Line Creation

**Single-page workflow (no tabs):**

1. **Product Information** (top section)
   - Product code, name, description
   - Effective dates

2. **Product Lines** (expandable sections below)
   - Add Line button
   - Inline forms for each line
   - Each line shows:
     - Line type (recurring/one-time/usage)
     - Price model
     - Usage configuration (if applicable)
     - Rate card entries (if rateCard model)

3. **Actions**
   - Save Draft (saves product + all lines)
   - Publish (validates and activates)
   - Cancel

**Design Pattern:**
```
┌─────────────────────────────────────────────────────┐
│ Product Information                                 │
│ [Product Code] [Product Name]                      │
│ [Description...]                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Product Lines                        [+ Add Line]   │
│                                                      │
│ ▼ Recurring Line: Monthly Subscription              │
│   Price Model: Flat                                 │
│   Has Usage: [x]                                    │
│   [Configure Rate Card...]                          │
│                                                      │
│ ▼ Usage Line: API Calls (linked to above)          │
│   Parent: Monthly Subscription                      │
│   Rate Card: Tiered pricing                         │
│   [Configure Tiers...]                              │
└─────────────────────────────────────────────────────┘

[Save Draft]  [Publish]  [Cancel]
```

## Database Schema

```sql
-- Core tables from V5 spec
CREATE TABLE Product (
    productNumber VARCHAR(50) PRIMARY KEY,
    productCode VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    effectiveStartDate DATE NOT NULL,
    effectiveEndDate DATE,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ProductLine (
    productLineNumber VARCHAR(50) PRIMARY KEY,
    productNumber VARCHAR(50) NOT NULL REFERENCES Product(productNumber),
    name VARCHAR(255) NOT NULL,
    lineType VARCHAR(20) NOT NULL CHECK (lineType IN ('recurring', 'oneTime', 'usage')),
    priceModel VARCHAR(20) NOT NULL,
    hasUsage BOOLEAN DEFAULT false,
    parentLine VARCHAR(50) REFERENCES ProductLine(productLineNumber),

    -- Constraints from V5 spec
    CONSTRAINT chk_hasUsage_recurring CHECK (hasUsage = false OR lineType = 'recurring'),
    CONSTRAINT chk_parentLine_usage CHECK (parentLine IS NULL OR lineType = 'usage'),
    CONSTRAINT chk_no_self_reference CHECK (parentLine IS NULL OR parentLine != productLineNumber)
);

CREATE TABLE RateCardEntry (
    rateCardEntryNumber VARCHAR(50) PRIMARY KEY,
    productLineId VARCHAR(50) NOT NULL REFERENCES ProductLine(productLineNumber),
    usageType VARCHAR(20) CHECK (usageType IN ('allowance', 'consumption', 'overage', 'prepaid')),
    conversion NUMERIC(15,6),
    allowance NUMERIC(19,4),
    term VARCHAR(20) CHECK (term IN ('daily', 'monthly', 'quarterly', 'annually')),
    rollover BOOLEAN DEFAULT false,
    rolloverDuration SMALLINT,
    maximumRolloverLimit NUMERIC(19,4),
    expiration SMALLINT,

    -- Constraints from V5 spec
    CONSTRAINT chk_rollover_duration CHECK (rolloverDuration IS NULL OR rollover = true),
    CONSTRAINT chk_rollover_limit CHECK (maximumRolloverLimit IS NULL OR rollover = true),
    CONSTRAINT chk_allowance_type CHECK (allowance IS NULL OR usageType = 'allowance'),
    CONSTRAINT chk_conversion_positive CHECK (conversion IS NULL OR conversion > 0)
);

-- Indexes for performance
CREATE INDEX idx_productline_product ON ProductLine(productNumber);
CREATE INDEX idx_productline_parent ON ProductLine(parentLine);
CREATE INDEX idx_ratecard_productline ON RateCardEntry(productLineId);
```

## Development Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### Backend

```bash
cd backend
npm install
npm run start:dev
# http://localhost:3001
```

### Database

```bash
docker-compose up -d
# PostgreSQL on localhost:5432
```

## Next Steps

1. ✅ Set up Next.js frontend
2. ✅ Set up NestJS backend
3. ✅ Configure database schema
4. 🔄 Build product creation UI
5. 🔄 Implement seamless product line addition
6. 🔄 Add rate card configuration
7. 🔄 Add validation and error handling
8. 🔄 Add list/view functionality

---

**Built with Claude Code** | Based on Everest Product Catalog V5 Architecture
