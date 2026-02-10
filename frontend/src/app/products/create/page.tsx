'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import type { CreateProductInput, CreateProductLineInput, CreateRateCardEntryInput, LineType, PriceModel, Term, UsageType } from '@/types/product';

export default function CreateProductPage() {
  const router = useRouter();
  const [product, setProduct] = useState<CreateProductInput>({
    productCode: '',
    name: '',
    description: '',
    effectiveStartDate: new Date().toISOString().split('T')[0],
    productFamily: 'software',
    productType: 'sub',
    productLines: [],
  });

  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  // Helper functions for display formatting
  const formatPriceModel = (priceModel: string) => {
    if (priceModel === 'rateCard') return 'Rate Card';
    if (priceModel === 'perUnit') return 'Per Unit';
    return priceModel.charAt(0).toUpperCase() + priceModel.slice(1);
  };

  const formatUnitOfMeasure = (unit: string) => {
    if (unit === 'gb') return 'GB';
    if (unit === 'tb') return 'TB';
    if (unit === 'apiCall') return 'API Call';
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };

  const addProductLine = () => {
    setProduct({
      ...product,
      productLines: [
        ...product.productLines,
        {
          name: '',
          lineType: 'recurring',
          priceModel: 'flat',
          hasUsage: false,
        },
      ],
    });
    // Auto-expand the new line
    setExpandedLines(new Set([...expandedLines, product.productLines.length]));
  };

  const updateProductLine = (index: number, field: keyof CreateProductLineInput, value: any) => {
    const updatedLines = [...product.productLines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };

    // When lineType changes to oneTime, set pricingTerm to 'once'
    if (field === 'lineType' && value === 'oneTime') {
      updatedLines[index].pricingTerm = 'once';
    }

    // When lineType changes to usage, set priceModel to 'rateCard' (required by DB constraint)
    if (field === 'lineType' && value === 'usage') {
      updatedLines[index].priceModel = 'rateCard';
      // Initialize empty rate card entries array if not exists
      if (!updatedLines[index].rateCardEntries) {
        updatedLines[index].rateCardEntries = [];
      }
    }

    // When hasUsage is toggled on for a recurring line, add a usage line reference
    if (field === 'hasUsage' && value === true && updatedLines[index].lineType === 'recurring') {
      updatedLines[index].usageLine = {
        name: `${updatedLines[index].name || 'Usage'} Charges`,
        priceModel: 'rateCard',
        rateCardEntries: [],
      };
    } else if (field === 'hasUsage' && value === false) {
      delete updatedLines[index].usageLine;
    }

    setProduct({ ...product, productLines: updatedLines });
  };

  const updateUsageLine = (parentIndex: number, field: string, value: any) => {
    const updatedLines = [...product.productLines];
    if (updatedLines[parentIndex].usageLine) {
      updatedLines[parentIndex].usageLine = {
        ...updatedLines[parentIndex].usageLine!,
        [field]: value,
      };
      setProduct({ ...product, productLines: updatedLines });
    }
  };

  const addRateCardEntry = (parentIndex: number) => {
    const updatedLines = [...product.productLines];
    if (updatedLines[parentIndex].usageLine) {
      const currentEntries = updatedLines[parentIndex].usageLine!.rateCardEntries || [];
      updatedLines[parentIndex].usageLine!.rateCardEntries = [
        ...currentEntries,
        {
          usageType: 'consumption',
          identifier: '',
          conversion: 1,
        },
      ];
      setProduct({ ...product, productLines: updatedLines });
    }
  };

  const updateRateCardEntry = (parentIndex: number, entryIndex: number, field: string, value: any) => {
    const updatedLines = [...product.productLines];
    if (updatedLines[parentIndex].usageLine?.rateCardEntries) {
      const entries = [...updatedLines[parentIndex].usageLine!.rateCardEntries!];
      entries[entryIndex] = { ...entries[entryIndex], [field]: value };
      updatedLines[parentIndex].usageLine!.rateCardEntries = entries;
      setProduct({ ...product, productLines: updatedLines });
    }
  };

  const removeRateCardEntry = (parentIndex: number, entryIndex: number) => {
    const updatedLines = [...product.productLines];
    if (updatedLines[parentIndex].usageLine?.rateCardEntries) {
      updatedLines[parentIndex].usageLine!.rateCardEntries =
        updatedLines[parentIndex].usageLine!.rateCardEntries!.filter((_, i) => i !== entryIndex);
      setProduct({ ...product, productLines: updatedLines });
    }
  };

  const removeProductLine = (index: number) => {
    const updatedLines = product.productLines.filter((_, i) => i !== index);
    setProduct({ ...product, productLines: updatedLines });
    expandedLines.delete(index);
    setExpandedLines(new Set(expandedLines));
  };

  const toggleLineExpansion = (index: number) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLines(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submitted!');
    console.log('Product data:', product);

    // Transform the data to include usage lines as separate lines
    const transformedProductLines: any[] = [];
    product.productLines.forEach((line, index) => {
      // Prepare line data without usageLine (internal only)
      const { usageLine, ...lineData } = line;

      // Set pricingTerm to 'once' for one-time lines if not set
      if (lineData.lineType === 'oneTime') {
        lineData.pricingTerm = 'once';
      }

      transformedProductLines.push(lineData);

      // If this recurring line has usage, add the usage line
      // Usage lines do NOT have pricingTerm (consumption-based)
      if (line.hasUsage && usageLine) {
        transformedProductLines.push({
          name: usageLine.name,
          lineType: 'usage',
          priceModel: 'rateCard',
          parentLine: `line-${transformedProductLines.length - 1}`, // Reference the parent
          rateCardEntries: usageLine.rateCardEntries || [],
          // No pricingTerm for usage lines - consumption-based
        });
      }
    });

    try {
      const payload = {
        ...product,
        productLines: transformedProductLines,
      };

      console.log('Sending payload:', payload);

      const response = await fetch('http://localhost:3000/api/products/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      alert(`Product created successfully!\n\nProduct Number: ${data.productNumber}\nProduct Lines: ${data.productLines?.length || 0} created`);

      // Navigate back to products list
      router.push('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/products')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
        <h1 className="text-3xl font-bold mb-2">Create Product</h1>
        <p className="text-muted-foreground">
          Add product information and product lines in one seamless workflow
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Basic product details and effective dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCode">Product Code *</Label>
                <Input
                  id="productCode"
                  value={product.productCode}
                  onChange={(e) => setProduct({ ...product, productCode: e.target.value })}
                  placeholder="PROD-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  placeholder="Flow Video Pro"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                placeholder="Professional video streaming platform"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productFamily">Product Family *</Label>
                <Select
                  value={product.productFamily}
                  onValueChange={(value) => setProduct({ ...product, productFamily: value as any })}
                >
                  <SelectTrigger id="productFamily">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Select
                  value={product.productType}
                  onValueChange={(value) => setProduct({ ...product, productType: value as any })}
                >
                  <SelectTrigger id="productType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sub">Subscription</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                    <SelectItem value="consumption">Consumption</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveStartDate">Effective Start Date *</Label>
                <Input
                  id="effectiveStartDate"
                  type="date"
                  value={product.effectiveStartDate}
                  onChange={(e) => setProduct({ ...product, effectiveStartDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveEndDate">Effective End Date</Label>
                <Input
                  id="effectiveEndDate"
                  type="date"
                  value={product.effectiveEndDate || ''}
                  onChange={(e) => setProduct({ ...product, effectiveEndDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Lines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Lines</CardTitle>
                <CardDescription>
                  Add billable components (recurring, one-time, or usage-based)
                </CardDescription>
              </div>
              <Button type="button" onClick={addProductLine} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.productLines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No product lines yet. Click "Add Line" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {product.productLines.map((line, index) => {
                  const isExpanded = expandedLines.has(index);
                  const lineTypeLabel = line.lineType.charAt(0).toUpperCase() + line.lineType.slice(1);
                  const displayName = line.name || `${lineTypeLabel} Line`;

                  return (
                    <Card key={index} className="border-l-4 border-l-primary/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleLineExpansion(index)}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold">{displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({lineTypeLabel} • {formatPriceModel(line.priceModel)})
                            </span>
                            {line.hasUsage && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                + Usage
                              </span>
                            )}
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductLine(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`line-name-${index}`}>Line Name *</Label>
                              <Input
                                id={`line-name-${index}`}
                                value={line.name}
                                onChange={(e) => updateProductLine(index, 'name', e.target.value)}
                                placeholder="Monthly Subscription"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`line-type-${index}`}>Line Type *</Label>
                              <Select
                                value={line.lineType}
                                onValueChange={(value) => updateProductLine(index, 'lineType', value as LineType)}
                              >
                                <SelectTrigger id={`line-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="recurring">Recurring</SelectItem>
                                  <SelectItem value="oneTime">One-Time</SelectItem>
                                  <SelectItem value="usage">Usage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Pricing Term - Show for recurring and one-time only, N/A for usage */}
                          <div className="grid grid-cols-2 gap-4">
                            {line.lineType !== 'usage' ? (
                              <div className="space-y-2">
                                <Label htmlFor={`pricing-term-${index}`}>Pricing Term *</Label>
                                <Select
                                  value={line.lineType === 'oneTime' ? 'once' : (line.pricingTerm || 'monthly')}
                                  onValueChange={(value) => updateProductLine(index, 'pricingTerm', value as Term)}
                                  disabled={line.lineType === 'oneTime'}
                                >
                                  <SelectTrigger id={`pricing-term-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {line.lineType === 'oneTime' ? (
                                      <SelectItem value="once">Once</SelectItem>
                                    ) : (
                                      <>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="biMonthly">Bi-Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="semiAnnually">Semi-Annually</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Pricing Term</Label>
                                <div className="h-9 flex items-center text-sm text-muted-foreground">
                                  N/A
                                </div>
                              </div>
                            )}

                            {/* Price Model - Show for recurring and usage lines */}
                            {(line.lineType === 'recurring' || line.lineType === 'usage') && (
                              <div className="space-y-2">
                                <Label htmlFor={`price-model-${index}`}>Price Model *</Label>
                                {line.lineType === 'usage' ? (
                                  <div className="h-9 flex items-center text-sm font-medium px-3 border rounded-md bg-muted">
                                    Rate Card
                                  </div>
                                ) : (
                                  <Select
                                    value={line.priceModel}
                                    onValueChange={(value) => updateProductLine(index, 'priceModel', value as PriceModel)}
                                  >
                                    <SelectTrigger id={`price-model-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="flat">Flat</SelectItem>
                                      <SelectItem value="perUnit">Per Unit</SelectItem>
                                      <SelectItem value="tiered">Tiered</SelectItem>
                                      <SelectItem value="volume">Volume</SelectItem>
                                      <SelectItem value="rateCard">Rate Card</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}

                            {/* Unit of Measure - Show for recurring and one-time */}
                            {(line.lineType === 'recurring' || line.lineType === 'oneTime') && (
                              <div className="space-y-2">
                                <Label htmlFor={`unit-of-measure-${index}`}>Unit of Measure</Label>
                                <Select
                                  value={line.unitOfMeasure || ''}
                                  onValueChange={(value) => updateProductLine(index, 'unitOfMeasure', value)}
                                >
                                  <SelectTrigger id={`unit-of-measure-${index}`}>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="each">Each</SelectItem>
                                    <SelectItem value="seat">Seat</SelectItem>
                                    <SelectItem value="license">License</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="platform">Platform</SelectItem>
                                    <SelectItem value="gb">GB</SelectItem>
                                    <SelectItem value="tb">TB</SelectItem>
                                    <SelectItem value="hour">Hour</SelectItem>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="transaction">Transaction</SelectItem>
                                    <SelectItem value="apiCall">API Call</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Rate Card Configuration for Usage Lines */}
                          {line.lineType === 'usage' && (
                            <div className="pt-3 border-t space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Rate Card Entries</Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const updatedLines = [...product.productLines];
                                    const currentEntries = updatedLines[index].rateCardEntries || [];
                                    updatedLines[index].rateCardEntries = [
                                      ...currentEntries,
                                      {
                                        usageType: 'consumption',
                                        identifier: '',
                                        conversion: 1,
                                      },
                                    ];
                                    setProduct({ ...product, productLines: updatedLines });
                                  }}
                                  className="h-7 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Entry
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Define usage types, allowances, and pricing tiers
                              </p>

                              {line.rateCardEntries && line.rateCardEntries.length > 0 ? (
                                <div className="space-y-3">
                                  {line.rateCardEntries.map((entry, entryIndex) => (
                                    <div key={entryIndex} className="border rounded p-3 bg-muted/30 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Entry {entryIndex + 1}</span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const updatedLines = [...product.productLines];
                                            updatedLines[index].rateCardEntries =
                                              updatedLines[index].rateCardEntries!.filter((_, i) => i !== entryIndex);
                                            setProduct({ ...product, productLines: updatedLines });
                                          }}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Usage Type *</Label>
                                          <Select
                                            value={entry.usageType}
                                            onValueChange={(value) => {
                                              const updatedLines = [...product.productLines];
                                              const entries = [...updatedLines[index].rateCardEntries!];
                                              entries[entryIndex] = { ...entries[entryIndex], usageType: value as UsageType };
                                              updatedLines[index].rateCardEntries = entries;
                                              setProduct({ ...product, productLines: updatedLines });
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="PAYG">PAYG</SelectItem>
                                              <SelectItem value="minimumCommit">Minimum Commit</SelectItem>
                                              <SelectItem value="prepaid">Prepaid</SelectItem>
                                              <SelectItem value="consumption">Consumption</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Identifier</Label>
                                          <Input
                                            className="h-8 text-xs"
                                            value={entry.identifier || ''}
                                            onChange={(e) => {
                                              const updatedLines = [...product.productLines];
                                              const entries = [...updatedLines[index].rateCardEntries!];
                                              entries[entryIndex] = { ...entries[entryIndex], identifier: e.target.value };
                                              updatedLines[index].rateCardEntries = entries;
                                              setProduct({ ...product, productLines: updatedLines });
                                            }}
                                            placeholder="billable-component-id"
                                          />
                                        </div>
                                        {/* Conversion Factor - Hide for PAYG and allowance (no credits) */}
                                        {entry.usageType !== 'PAYG' && entry.usageType !== 'allowance' && (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Conversion Factor</Label>
                                            <Input
                                              className="h-8 text-xs"
                                              type="number"
                                              step="0.01"
                                              value={entry.conversion || 1}
                                              onChange={(e) => {
                                                const updatedLines = [...product.productLines];
                                                const entries = [...updatedLines[index].rateCardEntries!];
                                                entries[entryIndex] = { ...entries[entryIndex], conversion: parseFloat(e.target.value) };
                                                updatedLines[index].rateCardEntries = entries;
                                                setProduct({ ...product, productLines: updatedLines });
                                              }}
                                              placeholder="1.0"
                                            />
                                          </div>
                                        )}
                                        {/* For PAYG and allowance: single Unit of Measure (usage = billable) */}
                                        {(entry.usageType === 'PAYG' || entry.usageType === 'allowance') ? (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Unit of Measure</Label>
                                            <Select
                                              value={entry.usageUnitOfMeasure || ''}
                                              onValueChange={(value) => {
                                                const updatedLines = [...product.productLines];
                                                const entries = [...updatedLines[index].rateCardEntries!];
                                                // For PAYG and allowance, usage UoM = billable UoM
                                                entries[entryIndex] = {
                                                  ...entries[entryIndex],
                                                  usageUnitOfMeasure: value,
                                                  billableUnitOfMeasure: value
                                                };
                                                updatedLines[index].rateCardEntries = entries;
                                                setProduct({ ...product, productLines: updatedLines });
                                              }}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="each">Each</SelectItem>
                                                <SelectItem value="seat">Seat</SelectItem>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="gb">GB</SelectItem>
                                                <SelectItem value="tb">TB</SelectItem>
                                                <SelectItem value="hour">Hour</SelectItem>
                                                <SelectItem value="transaction">Transaction</SelectItem>
                                                <SelectItem value="apiCall">API Call</SelectItem>
                                                <SelectItem value="request">Request</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Usage Unit of Measure</Label>
                                              <Select
                                                value={entry.usageUnitOfMeasure || ''}
                                                onValueChange={(value) => {
                                                  const updatedLines = [...product.productLines];
                                                  const entries = [...updatedLines[index].rateCardEntries!];
                                                  entries[entryIndex] = { ...entries[entryIndex], usageUnitOfMeasure: value };
                                                  updatedLines[index].rateCardEntries = entries;
                                                  setProduct({ ...product, productLines: updatedLines });
                                                }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="each">Each</SelectItem>
                                                  <SelectItem value="seat">Seat</SelectItem>
                                                  <SelectItem value="user">User</SelectItem>
                                                  <SelectItem value="gb">GB</SelectItem>
                                                  <SelectItem value="tb">TB</SelectItem>
                                                  <SelectItem value="hour">Hour</SelectItem>
                                                  <SelectItem value="transaction">Transaction</SelectItem>
                                                  <SelectItem value="apiCall">API Call</SelectItem>
                                                  <SelectItem value="request">Request</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Billable Unit of Measure</Label>
                                              <Select
                                                value={entry.billableUnitOfMeasure || ''}
                                                onValueChange={(value) => {
                                                  const updatedLines = [...product.productLines];
                                                  const entries = [...updatedLines[index].rateCardEntries!];
                                                  entries[entryIndex] = { ...entries[entryIndex], billableUnitOfMeasure: value };
                                                  updatedLines[index].rateCardEntries = entries;
                                                  setProduct({ ...product, productLines: updatedLines });
                                                }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="each">Each</SelectItem>
                                                  <SelectItem value="seat">Seat</SelectItem>
                                                  <SelectItem value="user">User</SelectItem>
                                                  <SelectItem value="gb">GB</SelectItem>
                                                  <SelectItem value="tb">TB</SelectItem>
                                                  <SelectItem value="hour">Hour</SelectItem>
                                                  <SelectItem value="transaction">Transaction</SelectItem>
                                                  <SelectItem value="apiCall">API Call</SelectItem>
                                                  <SelectItem value="request">Request</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </>
                                        )}
                                        {/* Invoice Frequency - N/A for allowance (inherited from recurring line) */}
                                        {entry.usageType === 'allowance' ? (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Invoice Frequency</Label>
                                            <div className="h-8 flex items-center text-xs text-muted-foreground px-3 border rounded-md bg-muted">
                                              N/A
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Invoice Frequency</Label>
                                            <Select
                                              value={entry.invoiceFrequency || ''}
                                              onValueChange={(value) => {
                                                const updatedLines = [...product.productLines];
                                                const entries = [...updatedLines[index].rateCardEntries!];
                                                entries[entryIndex] = { ...entries[entryIndex], invoiceFrequency: value as any };
                                                updatedLines[index].rateCardEntries = entries;
                                                setProduct({ ...product, productLines: updatedLines });
                                              }}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                                <SelectItem value="annually">Annually</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          <Label className="text-xs">Price Model</Label>
                                          <Select
                                            value={entry.priceModel || ''}
                                            onValueChange={(value) => {
                                              const updatedLines = [...product.productLines];
                                              const entries = [...updatedLines[index].rateCardEntries!];
                                              entries[entryIndex] = { ...entries[entryIndex], priceModel: value as any };
                                              updatedLines[index].rateCardEntries = entries;
                                              setProduct({ ...product, productLines: updatedLines });
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="perUnit">Per Unit</SelectItem>
                                              <SelectItem value="tiered">Tiered</SelectItem>
                                              <SelectItem value="volume">Volume</SelectItem>
                                              <SelectItem value="stairstep">Stairstep</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {(entry.usageType === 'allowance' || entry.usageType === 'prepaid') && (
                                          <>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Allowance Amount</Label>
                                              <Input
                                                className="h-8 text-xs"
                                                type="number"
                                                value={entry.allowance || ''}
                                                onChange={(e) => {
                                                  const updatedLines = [...product.productLines];
                                                  const entries = [...updatedLines[index].rateCardEntries!];
                                                  entries[entryIndex] = { ...entries[entryIndex], allowance: parseFloat(e.target.value) };
                                                  updatedLines[index].rateCardEntries = entries;
                                                  setProduct({ ...product, productLines: updatedLines });
                                                }}
                                                placeholder="100"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs">Term</Label>
                                              <Select
                                                value={entry.term || ''}
                                                onValueChange={(value) => {
                                                  const updatedLines = [...product.productLines];
                                                  const entries = [...updatedLines[index].rateCardEntries!];
                                                  entries[entryIndex] = { ...entries[entryIndex], term: value as Term };
                                                  updatedLines[index].rateCardEntries = entries;
                                                  setProduct({ ...product, productLines: updatedLines });
                                                }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="daily">Daily</SelectItem>
                                                  <SelectItem value="monthly">Monthly</SelectItem>
                                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                                  <SelectItem value="annually">Annually</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-center text-muted-foreground py-4">
                                  No rate card entries yet. Click "Add Entry" to define usage pricing.
                                </p>
                              )}
                            </div>
                          )}

                          {line.lineType === 'recurring' && (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`has-usage-${index}`}
                                  checked={line.hasUsage || false}
                                  onChange={(e) => updateProductLine(index, 'hasUsage', e.target.checked)}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <Label htmlFor={`has-usage-${index}`} className="font-medium">
                                  Has Usage Component (Commit/Overage)
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground ml-6">
                                Enable usage-based charges linked to this recurring line
                              </p>

                              {line.hasUsage && line.usageLine && (
                                <Card className="ml-6 border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                      Usage Line Configuration
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                      Automatically linked to the recurring line above
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`usage-name-${index}`}>Usage Line Name *</Label>
                                      <Input
                                        id={`usage-name-${index}`}
                                        value={line.usageLine.name}
                                        onChange={(e) => updateUsageLine(index, 'name', e.target.value)}
                                        placeholder="Storage Overage Charges"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                      <div>
                                        <span className="font-medium">Pricing Term:</span> N/A
                                      </div>
                                      <div>
                                        <span className="font-medium">Price Model:</span> Rate Card
                                      </div>
                                    </div>

                                    {/* Rate Card Entries */}
                                    <div className="pt-3 border-t space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Rate Card Entries</Label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addRateCardEntry(index)}
                                          className="h-7 text-xs"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add Entry
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Define usage types, allowances, and pricing tiers
                                      </p>

                                      {line.usageLine.rateCardEntries && line.usageLine.rateCardEntries.length > 0 ? (
                                        <div className="space-y-3">
                                          {line.usageLine.rateCardEntries.map((entry, entryIndex) => (
                                            <div key={entryIndex} className="border rounded p-3 bg-white dark:bg-gray-900 space-y-3">
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-muted-foreground">Entry {entryIndex + 1}</span>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => removeRateCardEntry(index, entryIndex)}
                                                  className="h-6 w-6 p-0"
                                                >
                                                  <Trash2 className="w-3 h-3 text-destructive" />
                                                </Button>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Usage Type *</Label>
                                                  <Select
                                                    value={entry.usageType}
                                                    onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'usageType', value as UsageType)}
                                                  >
                                                    <SelectTrigger className="h-8 text-xs">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="allowance">Allowance</SelectItem>
                                                      <SelectItem value="consumption">Consumption</SelectItem>
                                                      <SelectItem value="overage">Overage</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Identifier</Label>
                                                  <Input
                                                    className="h-8 text-xs"
                                                    value={entry.identifier || ''}
                                                    onChange={(e) => updateRateCardEntry(index, entryIndex, 'identifier', e.target.value)}
                                                    placeholder="billable-component-id"
                                                  />
                                                </div>
                                                {/* Conversion Factor - Hide for allowance (no credits) */}
                                                {entry.usageType !== 'allowance' && (
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Conversion Factor</Label>
                                                    <Input
                                                      className="h-8 text-xs"
                                                      type="number"
                                                      step="0.01"
                                                      value={entry.conversion || 1}
                                                      onChange={(e) => updateRateCardEntry(index, entryIndex, 'conversion', parseFloat(e.target.value))}
                                                      placeholder="1.0"
                                                    />
                                                  </div>
                                                )}
                                                {/* For allowance: single Unit of Measure (usage = billable) */}
                                                {entry.usageType === 'allowance' ? (
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Unit of Measure</Label>
                                                    <Select
                                                      value={entry.usageUnitOfMeasure || ''}
                                                      onValueChange={(value) => {
                                                        // For allowance, usage UoM = billable UoM
                                                        updateRateCardEntry(index, entryIndex, 'usageUnitOfMeasure', value);
                                                        updateRateCardEntry(index, entryIndex, 'billableUnitOfMeasure', value);
                                                      }}
                                                    >
                                                      <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="each">Each</SelectItem>
                                                        <SelectItem value="seat">Seat</SelectItem>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="gb">GB</SelectItem>
                                                        <SelectItem value="tb">TB</SelectItem>
                                                        <SelectItem value="hour">Hour</SelectItem>
                                                        <SelectItem value="transaction">Transaction</SelectItem>
                                                        <SelectItem value="apiCall">API Call</SelectItem>
                                                        <SelectItem value="request">Request</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Usage Unit of Measure</Label>
                                                      <Select
                                                        value={entry.usageUnitOfMeasure || ''}
                                                        onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'usageUnitOfMeasure', value)}
                                                      >
                                                        <SelectTrigger className="h-8 text-xs">
                                                          <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="each">Each</SelectItem>
                                                          <SelectItem value="seat">Seat</SelectItem>
                                                          <SelectItem value="user">User</SelectItem>
                                                          <SelectItem value="gb">GB</SelectItem>
                                                          <SelectItem value="tb">TB</SelectItem>
                                                          <SelectItem value="hour">Hour</SelectItem>
                                                          <SelectItem value="transaction">Transaction</SelectItem>
                                                          <SelectItem value="apiCall">API Call</SelectItem>
                                                          <SelectItem value="request">Request</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Billable Unit of Measure</Label>
                                                      <Select
                                                        value={entry.billableUnitOfMeasure || ''}
                                                        onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'billableUnitOfMeasure', value)}
                                                      >
                                                        <SelectTrigger className="h-8 text-xs">
                                                          <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="each">Each</SelectItem>
                                                          <SelectItem value="seat">Seat</SelectItem>
                                                          <SelectItem value="user">User</SelectItem>
                                                          <SelectItem value="gb">GB</SelectItem>
                                                          <SelectItem value="tb">TB</SelectItem>
                                                          <SelectItem value="hour">Hour</SelectItem>
                                                          <SelectItem value="transaction">Transaction</SelectItem>
                                                          <SelectItem value="apiCall">API Call</SelectItem>
                                                          <SelectItem value="request">Request</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  </>
                                                )}
                                                {/* Invoice Frequency - N/A for allowance (inherited from recurring line) */}
                                                {entry.usageType === 'allowance' ? (
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Invoice Frequency</Label>
                                                    <div className="h-8 flex items-center text-xs text-muted-foreground px-3 border rounded-md bg-muted">
                                                      N/A
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    <Label className="text-xs">Invoice Frequency</Label>
                                                    <Select
                                                      value={entry.invoiceFrequency || ''}
                                                      onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'invoiceFrequency', value as any)}
                                                    >
                                                      <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                                        <SelectItem value="annually">Annually</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                )}
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Price Model</Label>
                                                  <Select
                                                    value={entry.priceModel || ''}
                                                    onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'priceModel', value as any)}
                                                  >
                                                    <SelectTrigger className="h-8 text-xs">
                                                      <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="perUnit">Per Unit</SelectItem>
                                                      <SelectItem value="tiered">Tiered</SelectItem>
                                                      <SelectItem value="volume">Volume</SelectItem>
                                                      <SelectItem value="stairstep">Stairstep</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                {(entry.usageType === 'allowance' || entry.usageType === 'prepaid') && (
                                                  <>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Allowance Amount</Label>
                                                      <Input
                                                        className="h-8 text-xs"
                                                        type="number"
                                                        value={entry.allowance || ''}
                                                        onChange={(e) => updateRateCardEntry(index, entryIndex, 'allowance', parseFloat(e.target.value))}
                                                        placeholder="100"
                                                      />
                                                    </div>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Term</Label>
                                                      <Select
                                                        value={entry.term || ''}
                                                        onValueChange={(value) => updateRateCardEntry(index, entryIndex, 'term', value as Term)}
                                                      >
                                                        <SelectTrigger className="h-8 text-xs">
                                                          <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="daily">Daily</SelectItem>
                                                          <SelectItem value="monthly">Monthly</SelectItem>
                                                          <SelectItem value="quarterly">Quarterly</SelectItem>
                                                          <SelectItem value="annually">Annually</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                    <div className="col-span-2 flex items-center space-x-2">
                                                      <input
                                                        type="checkbox"
                                                        id={`rollover-${index}-${entryIndex}`}
                                                        checked={entry.rollover || false}
                                                        onChange={(e) => updateRateCardEntry(index, entryIndex, 'rollover', e.target.checked)}
                                                        className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-primary"
                                                      />
                                                      <Label htmlFor={`rollover-${index}-${entryIndex}`} className="text-xs">
                                                        Allow Rollover
                                                      </Label>
                                                    </div>
                                                    {entry.rollover && (
                                                      <>
                                                        <div className="space-y-1">
                                                          <Label className="text-xs">Rollover Duration (periods)</Label>
                                                          <Input
                                                            className="h-8 text-xs"
                                                            type="number"
                                                            value={entry.rolloverDuration || ''}
                                                            onChange={(e) => updateRateCardEntry(index, entryIndex, 'rolloverDuration', parseInt(e.target.value))}
                                                            placeholder="3"
                                                          />
                                                        </div>
                                                        <div className="space-y-1">
                                                          <Label className="text-xs">Max Rollover Limit</Label>
                                                          <Input
                                                            className="h-8 text-xs"
                                                            type="number"
                                                            value={entry.maximumRolloverLimit || ''}
                                                            onChange={(e) => updateRateCardEntry(index, entryIndex, 'maximumRolloverLimit', parseFloat(e.target.value))}
                                                            placeholder="300"
                                                          />
                                                        </div>
                                                      </>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-center text-muted-foreground py-4">
                                          No rate card entries yet. Click "Add Entry" to define usage pricing.
                                        </p>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/products')}
          >
            Cancel
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Create Product
          </Button>
        </div>
      </form>
    </div>
  );
}
