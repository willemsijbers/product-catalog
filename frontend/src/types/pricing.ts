// Pricing type definitions for V5 architecture

export type Currency = 'USD' | 'EUR' | 'GBP';

export interface PriceBook {
  priceBookNumber: string;
  priceBookName: string;
  isStandard: boolean;
  description?: string;
  isActive: boolean;
}

export interface PriceBookEntryHeader {
  headerNumber: string;
  priceBookId: string;
  productLineNumber: string;
  currency: Currency;
  validFrom: string;
  description?: string;
  isActive: boolean;
}

export interface PriceBookEntry {
  priceBookEntryNumber: string;
  headerId: string;
  listPrice: number;
  fromQuantity?: number;
  rateCardEntryId?: string;
  description?: string;
  isActive: boolean;
}

// Extended types for UI
export interface PriceableItem {
  productLineNumber: string;
  name: string;
  lineType: 'oneTime' | 'recurring' | 'usage';
  usageType?: 'PAYG' | 'prepaid' | 'overage';
  rateCardEntryNumber?: string;
  unitOfMeasure?: string;
}

export interface PricingEntry {
  priceableItem: PriceableItem;
  priceBook: string;
  currency: Currency;
  listPrice: number;
}

export interface CreatePricingInput {
  productNumber: string;
  validFrom: string;
  entries: PricingEntry[];
}
