'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import type { Currency, PriceableItem, PriceBook } from '@/types/pricing';

interface ProductLine {
  productLineNumber: string;
  name: string;
  lineType: string;
  hasUsage: boolean;
  rateCardEntries?: RateCardEntry[];
}

interface RateCardEntry {
  rateCardEntryNumber: string;
  usageType: string;
  identifier?: string;
  usageUnitOfMeasure?: string;
}

interface Product {
  productNumber: string;
  productName: string;
  productCode: string;
  productLines: ProductLine[];
}

interface PriceConfiguration {
  priceBookId: string;
  currency: Currency;
}

interface PriceTier {
  fromQuantity: number;
  listPrice: string;
}

interface PriceEntry {
  itemId: string; // productLineNumber or rateCardEntryNumber
  priceBookId: string;
  currency: Currency;
  tiers: PriceTier[];
}

export default function ProductPricingPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(true);

  // Pricing configuration state
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [selectedConfigs, setSelectedConfigs] = useState<PriceConfiguration[]>([
    { priceBookId: '', currency: 'USD' }
  ]);
  const [priceEntries, setPriceEntries] = useState<Map<string, PriceTier[]>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (params.productNumber) {
      fetchProduct(params.productNumber as string);
      fetchPriceBooks();
    }
  }, [params.productNumber]);

  const fetchProduct = async (productNumber: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/products/${productNumber}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceBooks = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/price-books');
      if (response.ok) {
        const data = await response.json();
        setPriceBooks(data);
      }
    } catch (error) {
      console.error('Error fetching price books:', error);
    }
  };

  // Extract priceable items from product lines
  const getPriceableItems = (): PriceableItem[] => {
    if (!product) return [];

    const items: PriceableItem[] = [];

    product.productLines.forEach(line => {
      // One-time and Recurring lines are directly priceable
      if (line.lineType === 'oneTime' || line.lineType === 'recurring') {
        items.push({
          productLineNumber: line.productLineNumber,
          name: line.name,
          lineType: line.lineType as 'oneTime' | 'recurring',
        });
      }

      // Usage lines with PAYG, Prepaid, or Overage are priceable
      if (line.lineType === 'usage' && line.rateCardEntries) {
        line.rateCardEntries.forEach(entry => {
          if (['PAYG', 'prepaid', 'overage'].includes(entry.usageType)) {
            items.push({
              productLineNumber: line.productLineNumber,
              name: `${line.name} - ${formatUsageType(entry.usageType)}`,
              lineType: 'usage',
              usageType: entry.usageType as 'PAYG' | 'prepaid' | 'overage',
              rateCardEntryNumber: entry.rateCardEntryNumber,
              unitOfMeasure: entry.usageUnitOfMeasure,
            });
          }
        });
      }
    });

    return items;
  };

  const formatUsageType = (type: string) => {
    if (type === 'PAYG') return 'PAYG';
    if (type === 'prepaid') return 'Prepaid';
    if (type === 'overage') return 'Overage';
    if (type === 'allowance') return 'Allowance';
    if (type === 'consumption') return 'Consumption';
    if (type === 'minimumCommit') return 'Minimum Commit';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatLineType = (lineType: string) => {
    if (lineType === 'oneTime') return 'One-Time';
    if (lineType === 'recurring') return 'Recurring';
    if (lineType === 'usage') return 'Usage';
    return lineType;
  };

  const addPriceConfiguration = () => {
    setSelectedConfigs([...selectedConfigs, { priceBookId: '', currency: 'USD' }]);
  };

  const removePriceConfiguration = (index: number) => {
    const newConfigs = selectedConfigs.filter((_, i) => i !== index);
    setSelectedConfigs(newConfigs);
  };

  const updatePriceConfiguration = (index: number, field: 'priceBookId' | 'currency', value: string) => {
    const newConfigs = [...selectedConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setSelectedConfigs(newConfigs);
  };

  const getPriceKey = (itemId: string, priceBookId: string, currency: Currency): string => {
    return `${itemId}|${priceBookId}|${currency}`;
  };

  const getTiers = (itemId: string, priceBookId: string, currency: Currency): PriceTier[] => {
    const key = getPriceKey(itemId, priceBookId, currency);
    return priceEntries.get(key) || [{ fromQuantity: 0, listPrice: '' }];
  };

  const updateTier = (itemId: string, priceBookId: string, currency: Currency, tierIndex: number, field: 'fromQuantity' | 'listPrice', value: string) => {
    const key = getPriceKey(itemId, priceBookId, currency);
    const tiers = [...getTiers(itemId, priceBookId, currency)];
    tiers[tierIndex] = { ...tiers[tierIndex], [field]: field === 'fromQuantity' ? parseInt(value) || 0 : value };

    const newMap = new Map(priceEntries);
    newMap.set(key, tiers);
    setPriceEntries(newMap);
  };

  const addTier = (itemId: string, priceBookId: string, currency: Currency) => {
    const key = getPriceKey(itemId, priceBookId, currency);
    const tiers = getTiers(itemId, priceBookId, currency);
    const lastTier = tiers[tiers.length - 1];
    const newFromQuantity = lastTier ? (parseInt(lastTier.fromQuantity?.toString()) || 0) + 100 : 0;

    const newMap = new Map(priceEntries);
    newMap.set(key, [...tiers, { fromQuantity: newFromQuantity, listPrice: '' }]);
    setPriceEntries(newMap);
  };

  const removeTier = (itemId: string, priceBookId: string, currency: Currency, tierIndex: number) => {
    const key = getPriceKey(itemId, priceBookId, currency);
    const tiers = getTiers(itemId, priceBookId, currency);

    if (tiers.length === 1) {
      const newMap = new Map(priceEntries);
      newMap.delete(key);
      setPriceEntries(newMap);
    } else {
      const newMap = new Map(priceEntries);
      newMap.set(key, tiers.filter((_, i) => i !== tierIndex));
      setPriceEntries(newMap);
    }
  };

  const toggleCellExpansion = (key: string) => {
    const newSet = new Set(expandedCells);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedCells(newSet);
  };

  const toggleItemSelection = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const handleSubmit = async () => {
    // Validate
    if (selectedItems.size === 0) {
      alert('Please select at least one item to price');
      return;
    }

    const validConfigs = selectedConfigs.filter(c => c.priceBookId);
    if (validConfigs.length === 0) {
      alert('Please configure at least one price book and currency');
      return;
    }

    // Build pricing data
    const pricingData: any = {
      productNumber: product?.productNumber,
      validFrom,
      entries: []
    };

    const priceableItems = getPriceableItems();

    selectedItems.forEach(itemId => {
      const item = priceableItems.find(i =>
        (i.rateCardEntryNumber || i.productLineNumber) === itemId
      );
      if (!item) return;

      validConfigs.forEach(config => {
        const tiers = getTiers(itemId, config.priceBookId, config.currency);

        tiers.forEach(tier => {
          if (tier.listPrice && parseFloat(tier.listPrice) > 0) {
            pricingData.entries.push({
              productLineNumber: item.productLineNumber,
              rateCardEntryId: item.rateCardEntryNumber || null,
              priceBookId: config.priceBookId,
              currency: config.currency,
              listPrice: parseFloat(tier.listPrice),
              fromQuantity: tier.fromQuantity,
            });
          }
        });
      });
    });

    if (pricingData.entries.length === 0) {
      alert('Please enter at least one price');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/pricing/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingData),
      });

      if (response.ok) {
        alert('Pricing created successfully!');
        router.push(`/products/${product?.productNumber}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create pricing'}`);
      }
    } catch (error) {
      console.error('Error creating pricing:', error);
      alert('Error creating pricing');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading pricing configuration...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Product not found</p>
            <Button onClick={() => router.push('/products')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceableItems = getPriceableItems();

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push(`/products/${product.productNumber}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Product
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Create Pricing</CardTitle>
            <CardDescription>
              Configure list prices for {product.productName} across multiple price books and currencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Code</p>
                <p className="font-mono text-sm">{product.productCode}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Number</p>
                <p className="font-mono text-sm">{product.productNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valid From Date */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Validity</CardTitle>
            <CardDescription>Set when these prices become effective</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="validFrom">Valid From Date *</Label>
              <Input
                id="validFrom"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Book & Currency Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Price Books & Currencies</CardTitle>
                <CardDescription>
                  Add combinations of price books and currencies to configure
                </CardDescription>
              </div>
              <Button type="button" onClick={addPriceConfiguration} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Configuration
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedConfigs.map((config, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Price Book *</Label>
                    <Select
                      value={config.priceBookId}
                      onValueChange={(value) => updatePriceConfiguration(index, 'priceBookId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select price book" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceBooks.map(pb => (
                          <SelectItem key={pb.priceBookNumber} value={pb.priceBookNumber}>
                            {pb.priceBookName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Currency *</Label>
                    <Select
                      value={config.currency}
                      onValueChange={(value) => updatePriceConfiguration(index, 'currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedConfigs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePriceConfiguration(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Price Configuration</CardTitle>
            <CardDescription>
              Select items and enter list prices for each price book and currency combination
            </CardDescription>
          </CardHeader>
          <CardContent>
            {priceableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No priceable items found for this product.</p>
                <p className="text-sm mt-2">
                  Only One-Time, Recurring lines and PAYG, Prepaid, Overage usage types can be priced.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === priceableItems.length}
                          onChange={() => {
                            if (selectedItems.size === priceableItems.length) {
                              setSelectedItems(new Set());
                            } else {
                              setSelectedItems(new Set(priceableItems.map(item =>
                                item.rateCardEntryNumber || item.productLineNumber
                              )));
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      {selectedConfigs.filter(c => c.priceBookId).map((config, idx) => (
                        <th key={idx} className="text-left p-3 font-medium min-w-[120px]">
                          {priceBooks.find(pb => pb.priceBookNumber === config.priceBookId)?.priceBookName || 'N/A'}
                          <br />
                          <span className="text-xs font-normal text-muted-foreground">{config.currency}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {priceableItems.map(item => {
                      const itemId = item.rateCardEntryNumber || item.productLineNumber;
                      const isSelected = selectedItems.has(itemId);

                      return (
                        <tr key={itemId} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(itemId)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{item.name}</div>
                            {item.unitOfMeasure && (
                              <div className="text-xs text-muted-foreground">
                                Unit: {item.unitOfMeasure.toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {item.lineType === 'usage' ? formatUsageType(item.usageType!) :
                               formatLineType(item.lineType)}
                            </span>
                          </td>
                          {selectedConfigs.filter(c => c.priceBookId).map((config, idx) => {
                            const priceKey = getPriceKey(itemId, config.priceBookId, config.currency);
                            const tiers = getTiers(itemId, config.priceBookId, config.currency);
                            const isExpanded = expandedCells.has(priceKey);

                            return (
                              <td key={idx} className="p-3 align-top">
                                <div className="space-y-2">
                                  {tiers.map((tier, tierIndex) => (
                                    <div key={tierIndex} className="flex items-center gap-2">
                                      {tiers.length > 1 && (
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder="From"
                                          value={tier.fromQuantity}
                                          onChange={(e) => updateTier(itemId, config.priceBookId, config.currency, tierIndex, 'fromQuantity', e.target.value)}
                                          disabled={!isSelected}
                                          className="h-8 w-20 text-xs"
                                        />
                                      )}
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-xs text-muted-foreground">{config.currency}</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          value={tier.listPrice}
                                          onChange={(e) => updateTier(itemId, config.priceBookId, config.currency, tierIndex, 'listPrice', e.target.value)}
                                          disabled={!isSelected}
                                          className="h-8 flex-1"
                                        />
                                      </div>
                                      {tiers.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeTier(itemId, config.priceBookId, config.currency, tierIndex)}
                                          disabled={!isSelected}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {isSelected && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addTier(itemId, config.priceBookId, config.currency)}
                                      className="h-7 text-xs w-full"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Tier
                                    </Button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/products/${product.productNumber}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Create Pricing
          </Button>
        </div>
      </div>
    </div>
  );
}
