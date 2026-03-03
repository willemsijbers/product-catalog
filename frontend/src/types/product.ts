// Product Catalog V5 Types
// Based on Everest Product Catalog V5 Architecture

export type LineType = 'recurring' | 'oneTime' | 'usage' | 'prepaid' | 'billableTime' | 'billableTravelExpense' | 'billablePassThrough';

export type PriceModel =
  | 'flat'
  | 'perUnit'
  | 'tiered'
  | 'volume'
  | 'rateCard';

export type UsageType =
  | 'PAYG'
  | 'minimumCommit'
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
  isBundleProduct?: boolean;
  bundleComponents?: BundleComponentInput[];
}

export interface CreateProductLineInput {
  name: string;
  lineType: LineType;
  priceModel: PriceModel;
  pricingTerm?: Term; // For recurring lines, "once" for one-time
  unitOfMeasure?: string; // For recurring and one-time lines
  isCurrency?: boolean; // For prepaid lines: true = dollar balance, false = credit-based (default)
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
  usageIsCurrency?: boolean; // true = usage input is a monetary amount (e.g. USD), UoM not applicable
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

// Bundle Component Types
export interface BundleComponentInput {
  bundleProductLineIndex: number;  // Index in productLines array
  componentProductNumber: string;
  componentProductLineNumber: string;
  componentPricingLevel: 'parent' | 'component';
  productLineType: 'recurring' | 'oneTime' | 'usage';
  componentQuantity: number;
  quantityDependency?: 'dependent' | 'independent';
  allocationPercentage?: number;
  discountPercentage?: number;
  isOptional: boolean;
  description?: string;
}

// Product with lines (for component selection)
export interface ProductWithLines {
  productNumber: string;
  productCode: string;
  productName: string;
  productLines: ProductLineDetail[];
}

export interface ProductLineDetail {
  productLineNumber: string;
  name: string;
  lineType: LineType;
  priceModel: PriceModel;
}
