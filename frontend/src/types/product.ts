// Product Catalog V5 Types
// Based on Everest Product Catalog V5 Architecture

export type LineType = 'recurring' | 'oneTime' | 'usage';

export type PriceModel =
  | 'flat'
  | 'perUnit'
  | 'tiered'
  | 'volume'
  | 'rateCard';

export type UsageType =
  | 'PAYG'
  | 'minimumCommit'
  | 'prepaid'
  | 'consumption'
  | 'allowance'
  | 'overage';

export type Term = 'daily' | 'monthly' | 'quarterly' | 'annually';

export interface Product {
  productNumber: string;
  productCode: string;
  name: string;
  description?: string;
  effectiveStartDate: Date;
  effectiveEndDate?: Date;
  productLines: ProductLine[];
}

export interface ProductLine {
  productLineNumber: string;
  productNumber: string;
  name: string;
  lineType: LineType;
  priceModel: PriceModel;
  hasUsage: boolean;
  parentLine?: string; // FK to parent ProductLine for commit/overage
  rateCardEntries?: RateCardEntry[];
}

export interface RateCardEntry {
  rateCardEntryNumber: string;
  productLineId: string;
  usageType: UsageType;
  identifier?: string; // billableComponentId
  conversion?: number; // unit conversion factor
  allowance?: number; // included credits
  term?: Term; // allowance period
  rollover?: boolean; // can credits roll over
  rolloverDuration?: number; // max rollover periods
  maximumRolloverLimit?: number; // max rollover amount
  expiration?: number; // credit expiration in months
  fromQuantity?: number; // tier start
  toQuantity?: number; // tier end
}

// Form types for creation
export interface CreateProductInput {
  productCode: string;
  name: string;
  description?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  productFamily?: 'software' | 'hardware' | 'service' | 'bundle' | 'other';
  productType?: 'sub' | 'perpetual' | 'consumption' | 'other';
  productLines: CreateProductLineInput[];
}

export interface CreateProductLineInput {
  name: string;
  lineType: LineType;
  priceModel: PriceModel;
  pricingTerm?: Term; // For recurring lines, "once" for one-time
  unitOfMeasure?: string; // For recurring and one-time lines
  hasUsage?: boolean;
  parentLine?: string;
  usageLine?: { // Nested usage line config when hasUsage is true
    name: string;
    priceModel: 'rateCard';
    rateCardEntries?: CreateRateCardEntryInput[];
  };
  rateCardEntries?: CreateRateCardEntryInput[];
}

export interface CreateRateCardEntryInput {
  usageType: UsageType;
  identifier?: string;
  usageUnitOfMeasure?: string;
  billableUnitOfMeasure?: string;
  invoiceFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  priceModel?: 'perUnit' | 'tiered' | 'volume' | 'stairstep';
  conversion?: number;
  allowance?: number;
  term?: Term;
  rollover?: boolean;
  rolloverDuration?: number;
  maximumRolloverLimit?: number;
  expiration?: number;
}
