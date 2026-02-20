'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import type { CreateProductInput, CreateProductLineInput, CreateRateCardEntryInput, LineType, PriceModel, Term, UsageType, BundleComponentInput, ProductWithLines } from '@/types/product';

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
    isBundleProduct: false,
    bundleComponents: [],
  });

  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [productCodeExists, setProductCodeExists] = useState(false);
  const [checkingProductCode, setCheckingProductCode] = useState(false);

  // Bundle-specific state
  const [availableProducts, setAvailableProducts] = useState<ProductWithLines[]>([]);
  const [selectedComponentProducts, setSelectedComponentProducts] = useState<Map<number, string[]>>(new Map());
  const [bundleErrors, setBundleErrors] = useState<Map<number, string[]>>(new Map());

  // Helper functions for display formatting
  const formatLineType = (lineType: string) => {
    switch (lineType) {
      case 'recurring': return 'Recurring';
      case 'oneTime': return 'One-Time';
      case 'usage': return 'Usage';
      case 'prepaid': return 'Prepaid';
      case 'billableTime': return 'Billable Time';
      case 'billableTravelExpense': return 'Billable Travel Expense';
      case 'billablePassThrough': return 'Billable Pass-Through';
      default: return lineType.charAt(0).toUpperCase() + lineType.slice(1);
    }
  };

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

  // Check if product code exists
  const checkProductCode = async (code: string) => {
    if (!code || code.length < 2) {
      setProductCodeExists(false);
      return;
    }

    setCheckingProductCode(true);
    try {
      const response = await fetch(`http://localhost:3000/api/products`);
      if (response.ok) {
        const products = await response.json();
        const exists = products.some((p: any) => p.productCode.toLowerCase() === code.toLowerCase());
        setProductCodeExists(exists);
      }
    } catch (error) {
      console.error('Error checking product code:', error);
    } finally {
      setCheckingProductCode(false);
    }
  };

  // Debounced product code check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (product.productCode) {
        checkProductCode(product.productCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [product.productCode]);

  // Fetch available products for bundle component selection
  useEffect(() => {
    if (product.isBundleProduct) {
      fetchAvailableProducts();
    }
  }, [product.isBundleProduct]);

  const fetchAvailableProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      if (response.ok) {
        const products = await response.json();
        // Fetch product lines for each product
        const productsWithLines = await Promise.all(
          products.map(async (p: any) => {
            try {
              const linesResponse = await fetch(`http://localhost:3000/api/products/${p.productNumber}/lines`);
              const lines = await linesResponse.json();
              return {
                productNumber: p.productNumber,
                productCode: p.productCode,
                productName: p.productName,
                productLines: lines.map((l: any) => ({
                  productLineNumber: l.productLineNumber,
                  name: l.name,
                  lineType: l.lineType,
                  priceModel: l.priceModel
                }))
              };
            } catch {
              return {
                productNumber: p.productNumber,
                productCode: p.productCode,
                productName: p.productName,
                productLines: []
              };
            }
          })
        );
        setAvailableProducts(productsWithLines.filter(p => p.productLines.length > 0));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Validate bundle components for a specific bundle line
  const validateBundleComponents = (lineIndex: number): string[] => {
    const errors: string[] = [];
    const components = (product.bundleComponents || []).filter(
      c => c.bundleProductLineIndex === lineIndex
    );

    if (components.length === 0) {
      errors.push('Bundle line must have at least one component');
      return errors;
    }

    // Validate allocation percentage for parent-priced components
    const parentPricedComponents = components.filter(
      c => c.componentPricingLevel === 'parent' && !c.isOptional
    );

    if (parentPricedComponents.length > 0) {
      const allocationSum = parentPricedComponents.reduce(
        (sum, c) => sum + (c.allocationPercentage || 0),
        0
      );

      if (Math.abs(allocationSum - 100) > 0.01) {
        errors.push(`Allocation percentages must sum to 100% (currently ${allocationSum.toFixed(1)}%)`);
      }
    }

    // Check for duplicate component lines
    const lineNumbers = components.map(c => c.componentProductLineNumber);
    const duplicates = lineNumbers.filter((num, idx) => lineNumbers.indexOf(num) !== idx);
    if (duplicates.length > 0) {
      errors.push('Duplicate component product lines detected');
    }

    return errors;
  };

  // Calculate allocation status for display
  const getAllocationStatus = (components: BundleComponentInput[]) => {
    const parentPricedComponents = components.filter(
      c => c.componentPricingLevel === 'parent' && !c.isOptional
    );

    const total = parentPricedComponents.reduce(
      (sum, c) => sum + (c.allocationPercentage || 0),
      0
    );

    return {
      total,
      remaining: 100 - total,
      isValid: Math.abs(total - 100) < 0.01,
      color: Math.abs(total - 100) < 0.01 ? 'green' : total < 100 ? 'yellow' : 'red'
    };
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

    // When lineType changes to oneTime, set pricingTerm to 'once' and priceModel to 'perUnit'
    if (field === 'lineType' && value === 'oneTime') {
      updatedLines[index].pricingTerm = 'once';
      updatedLines[index].priceModel = 'perUnit';
    }

    // When lineType changes to prepaid, configure it automatically
    if (field === 'lineType' && value === 'prepaid') {
      updatedLines[index].pricingTerm = 'once';
      updatedLines[index].unitOfMeasure = 'credit';
      updatedLines[index].priceModel = 'perUnit';
      updatedLines[index].hasUsage = true;
      updatedLines[index].isCurrency = false; // Default to credit-based
      // Automatically create usage line for prepaid
      // IMPORTANT: billableUnitOfMeasure must match parent line's unitOfMeasure
      // to ensure drawdown happens in the same unit as the balance
      updatedLines[index].usageLine = {
        name: `${updatedLines[index].name || 'Prepaid'} Consumption`,
        priceModel: 'rateCard',
        rateCardEntries: [
          {
            usageType: 'consumption',
            identifier: '',
            conversion: 1, // No conversion (1:1 ratio)
            billableUnitOfMeasure: 'credit', // Matches parent unitOfMeasure (credit-based default)
            // usageUnitOfMeasure left blank - users configure based on their use case
          }
        ],
      };
    }

    // When isCurrency changes for prepaid, adjust unitOfMeasure and billableUnitOfMeasure
    // CRITICAL RULE: billableUnitOfMeasure MUST ALWAYS match parent line's unitOfMeasure
    // This ensures consumption draws down in the same unit as the balance
    // - Credit mode: unitOfMeasure = 'credit' → billableUnitOfMeasure = 'credit'
    // - Currency mode: unitOfMeasure = undefined (N/A) → billableUnitOfMeasure = undefined (N/A = currency)
    // Note: conversion stays 0 for consumption - it draws down directly from balance
    if (field === 'isCurrency' && updatedLines[index].lineType === 'prepaid') {
      if (value) {
        // Currency mode: both unitOfMeasure and billableUnitOfMeasure = undefined (N/A = currency)
        updatedLines[index].unitOfMeasure = undefined;
        if (updatedLines[index].usageLine?.rateCardEntries?.[0]) {
          updatedLines[index].usageLine!.rateCardEntries![0].billableUnitOfMeasure = undefined; // Must match parent (N/A = currency)
          // conversion remains 0 - consumption always draws down directly
        }
      } else {
        // Credit mode: both unitOfMeasure and billableUnitOfMeasure = 'credit'
        updatedLines[index].unitOfMeasure = 'credit';
        if (updatedLines[index].usageLine?.rateCardEntries?.[0]) {
          updatedLines[index].usageLine!.rateCardEntries![0].billableUnitOfMeasure = 'credit'; // Must match parent
          // conversion remains 0 - consumption always draws down directly
        }
      }
    }

    // When lineType changes to usage, set priceModel to 'rateCard' (required by DB constraint)
    if (field === 'lineType' && value === 'usage') {
      updatedLines[index].priceModel = 'rateCard';
      // Initialize empty rate card entries array if not exists
      if (!updatedLines[index].rateCardEntries) {
        updatedLines[index].rateCardEntries = [];
      }
    }

    // When lineType changes to billable types, set invoice frequency and appropriate defaults
    if (field === 'lineType' && ['billableTime', 'billableTravelExpense', 'billablePassThrough'].includes(value)) {
      updatedLines[index].pricingTerm = 'monthly'; // Default invoice frequency

      if (value === 'billableTime') {
        // Billable Time: needs rate card and unit of measure (e.g., hour)
        updatedLines[index].priceModel = 'rateCard'; // Different rates for different roles
        updatedLines[index].unitOfMeasure = 'hour';
      } else {
        // Billable Travel Expense & Pass-Through: rates come from external systems
        // Clear price model and unit of measure as they're not applicable
        delete updatedLines[index].priceModel;
        delete updatedLines[index].unitOfMeasure;
      }
    }

    // When hasUsage is toggled on for a recurring line, add a usage line reference
    if (field === 'hasUsage' && value === true && updatedLines[index].lineType === 'recurring') {
      updatedLines[index].usageLine = {
        name: `${updatedLines[index].name || 'Usage'} Charges`,
        priceModel: 'rateCard',
        rateCardEntries: [],
      };
    } else if (field === 'hasUsage' && value === false && updatedLines[index].lineType !== 'prepaid') {
      // Don't allow disabling hasUsage for prepaid
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

    // Validate bundle components if bundle product
    if (product.isBundleProduct) {
      const allErrors = new Map<number, string[]>();
      let hasErrors = false;

      product.productLines.forEach((_, lineIndex) => {
        const errors = validateBundleComponents(lineIndex);
        if (errors.length > 0) {
          allErrors.set(lineIndex, errors);
          hasErrors = true;
        }
      });

      if (hasErrors) {
        setBundleErrors(allErrors);
        const errorMessages = Array.from(allErrors.entries())
          .map(([lineIndex, errors]) => `Line ${lineIndex + 1}: ${errors.join(', ')}`)
          .join('\n');
        alert(`Please fix bundle component validation errors:\n\n${errorMessages}`);
        return;
      }
    }

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
        isBundleProduct: product.isBundleProduct || false,
        bundleComponents: product.bundleComponents || [],
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
        // Parse error message for better user feedback
        let errorMessage = data.error || 'Failed to create product';

        if (errorMessage.includes('UNIQUE constraint failed: Product.productCode')) {
          errorMessage = `Product code "${product.productCode}" already exists. Please use a different product code.`;
        } else if (errorMessage.includes('UNIQUE constraint failed')) {
          errorMessage = 'A duplicate value was detected. Please check your input and try again.';
        }

        throw new Error(errorMessage);
      }

      const successMessage = product.isBundleProduct
        ? `Bundle product created successfully!\n\nProduct Number: ${data.productNumber}\nProduct Lines: ${data.productLines?.length || 0} created\nBundle Components: ${data.bundleComponentsCreated || 0} created`
        : `Product created successfully!\n\nProduct Number: ${data.productNumber}\nProduct Lines: ${data.productLines?.length || 0} created`;

      alert(successMessage);

      // Navigate back to products list
      router.push('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create product:\n\n${errorMessage}`);
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
        {/* Product Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Product Type</CardTitle>
            <CardDescription>Choose whether to create a standard product or a bundle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="productType"
                  checked={!product.isBundleProduct}
                  onChange={() => setProduct({ ...product, isBundleProduct: false, bundleComponents: [] })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Standard Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="productType"
                  checked={product.isBundleProduct === true}
                  onChange={() => setProduct({ ...product, isBundleProduct: true })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Bundle Product</span>
              </label>
            </div>
            {product.isBundleProduct && (
              <p className="text-sm text-muted-foreground mt-2">
                Bundle products combine multiple product lines with configurable pricing allocation.
              </p>
            )}
          </CardContent>
        </Card>

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
                  className={productCodeExists ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {checkingProductCode && (
                  <p className="text-xs text-muted-foreground">Checking availability...</p>
                )}
                {productCodeExists && !checkingProductCode && (
                  <p className="text-xs text-red-500">⚠️ This product code already exists. Please choose a different one.</p>
                )}
                {!productCodeExists && !checkingProductCode && product.productCode.length >= 2 && (
                  <p className="text-xs text-green-600">✓ Product code is available</p>
                )}
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

        {/* Component Products Selection - Bundle Only */}
        {product.isBundleProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Component Products</CardTitle>
              <CardDescription>
                Select which products are included in this bundle (what you're selling)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No products available to add as components.</p>
                  <p className="text-sm">Create standard products first, then create bundles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {availableProducts.map(p => {
                      const isSelected = selectedComponentProducts.get(-1)?.includes(p.productNumber) || false;
                      return (
                        <div
                          key={p.productNumber}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            const currentSelected = selectedComponentProducts.get(-1) || [];
                            const newSelected = isSelected
                              ? currentSelected.filter(num => num !== p.productNumber)
                              : [...currentSelected, p.productNumber];
                            const newMap = new Map(selectedComponentProducts);
                            newMap.set(-1, newSelected);
                            setSelectedComponentProducts(newMap);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                />
                                <p className="font-medium text-sm">{p.productName}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{p.productCode}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {p.productLines.length} line{p.productLines.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(selectedComponentProducts.get(-1)?.length || 0) > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {selectedComponentProducts.get(-1)?.length || 0} product(s) selected
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                  const lineTypeLabel = formatLineType(line.lineType);
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
                                  <SelectItem value="prepaid">Prepaid</SelectItem>
                                  <SelectItem value="billableTime">Billable Time Line</SelectItem>
                                  <SelectItem value="billableTravelExpense">Billable Travel Expense Line</SelectItem>
                                  <SelectItem value="billablePassThrough">Billable Pass-Through</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Pricing Term / Invoice Frequency - varies by line type */}
                          <div className="grid grid-cols-2 gap-4">
                            {['recurring', 'oneTime', 'prepaid'].includes(line.lineType) ? (
                              <div className="space-y-2">
                                <Label htmlFor={`pricing-term-${index}`}>Pricing Term *</Label>
                                <Select
                                  value={(line.lineType === 'oneTime' || line.lineType === 'prepaid') ? 'once' : (line.pricingTerm || 'monthly')}
                                  onValueChange={(value) => updateProductLine(index, 'pricingTerm', value as Term)}
                                  disabled={line.lineType === 'oneTime' || line.lineType === 'prepaid'}
                                >
                                  <SelectTrigger id={`pricing-term-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(line.lineType === 'oneTime' || line.lineType === 'prepaid') ? (
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
                            ) : ['billableTime', 'billableTravelExpense', 'billablePassThrough'].includes(line.lineType) ? (
                              <div className="space-y-2">
                                <Label htmlFor={`invoice-frequency-${index}`}>Invoice Frequency *</Label>
                                <Select
                                  value={line.pricingTerm || 'monthly'}
                                  onValueChange={(value) => updateProductLine(index, 'pricingTerm', value as Term)}
                                >
                                  <SelectTrigger id={`invoice-frequency-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="biMonthly">Bi-Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="semiAnnually">Semi-Annually</SelectItem>
                                    <SelectItem value="annually">Annually</SelectItem>
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

                            {/* Price Model - Show for all line types except billable travel/pass-through */}
                            {!['billableTravelExpense', 'billablePassThrough'].includes(line.lineType) && (
                              <div className="space-y-2">
                                <Label htmlFor={`price-model-${index}`}>Price Model *</Label>
                                {line.lineType === 'usage' ? (
                                  <div className="h-9 flex items-center text-sm font-medium px-3 border rounded-md bg-muted">
                                    Rate Card
                                  </div>
                                ) : line.lineType === 'prepaid' || line.lineType === 'oneTime' ? (
                                  <div className="h-9 flex items-center text-sm font-medium px-3 border rounded-md bg-muted">
                                    Per Unit
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
                                      <SelectItem value="stairstep">Stairstep</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Currency Balance Toggle - Only for prepaid lines */}
                          {line.lineType === 'prepaid' && (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`is-currency-${index}`}
                                  checked={line.isCurrency || false}
                                  onChange={(e) => updateProductLine(index, 'isCurrency', e.target.checked)}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <Label htmlFor={`is-currency-${index}`} className="font-medium">
                                  Currency Balance
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground ml-6">
                                Enable this for prepaid dollar balances (e.g., $10,000 USD). Disable for credit-based prepaid (e.g., 1,000 credits).
                              </p>
                            </div>
                          )}

                          {/* Unit of Measure - Show for recurring, oneTime, prepaid, and billableTime */}
                          {['recurring', 'oneTime', 'prepaid', 'billableTime'].includes(line.lineType) && (
                            <div className="space-y-2">
                              <Label htmlFor={`unit-of-measure-${index}`}>Unit of Measure</Label>
                              {line.lineType === 'prepaid' && line.isCurrency ? (
                                <div className="h-9 flex items-center text-sm text-muted-foreground px-3 border rounded-md bg-muted">
                                  N/A
                                </div>
                              ) : (
                                <Select
                                  value={line.lineType === 'prepaid' ? 'credit' : (line.unitOfMeasure || '')}
                                  onValueChange={(value) => updateProductLine(index, 'unitOfMeasure', value)}
                                  disabled={line.lineType === 'prepaid' && !line.isCurrency}
                                >
                                  <SelectTrigger id={`unit-of-measure-${index}`}>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="credit">Credit</SelectItem>
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
                              )}
                            </div>
                          )}

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
                                        {/* Invoice Frequency - Hidden for allowance and consumption */}
                                        {entry.usageType !== 'allowance' && entry.usageType !== 'consumption' && (
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
                                        {/* Price Model - Hidden for allowance and consumption */}
                                        {entry.usageType !== 'allowance' && entry.usageType !== 'consumption' && (
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
                                        )}
                                        {(entry.usageType === 'allowance') && (
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

                          {(line.lineType === 'recurring' || line.lineType === 'prepaid') && (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`has-usage-${index}`}
                                  checked={line.hasUsage || false}
                                  onChange={(e) => updateProductLine(index, 'hasUsage', e.target.checked)}
                                  disabled={line.lineType === 'prepaid'}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <Label htmlFor={`has-usage-${index}`} className={`font-medium ${line.lineType === 'prepaid' ? 'text-muted-foreground' : ''}`}>
                                  Has Usage Component {line.lineType === 'prepaid' && '(Required)'}
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground ml-6">
                                {line.lineType === 'prepaid'
                                  ? 'Prepaid lines always require usage tracking for consumption and optional overage'
                                  : 'Enable usage-based charges linked to this recurring line'}
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
                                                      {line.lineType === 'recurring' && (
                                                        <SelectItem value="allowance">Allowance</SelectItem>
                                                      )}
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
                                                    {/* Step 1: Usage Unit of Measure (what comes in) */}
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
                                                    {/* Step 2: Conversion Factor (how to convert) */}
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Conversion Factor</Label>
                                                      <Input
                                                        className="h-8 text-xs"
                                                        type="number"
                                                        step="0.01"
                                                        value={entry.conversion ?? 1}
                                                        onChange={(e) => updateRateCardEntry(index, entryIndex, 'conversion', parseFloat(e.target.value))}
                                                        placeholder="1.0"
                                                        disabled={entry.usageType === 'consumption' && line.lineType === 'prepaid'}
                                                      />
                                                      {entry.usageType === 'consumption' && line.lineType === 'prepaid' && (
                                                        <p className="text-xs text-muted-foreground">
                                                          No conversion (1:1 ratio)
                                                        </p>
                                                      )}
                                                    </div>
                                                    {/* Step 3: Billable Unit of Measure (what gets billed) */}
                                                    <div className="space-y-1">
                                                      <Label className="text-xs">Billable Unit of Measure</Label>
                                                      {/* For prepaid consumption: billableUoM must match parent unitOfMeasure (non-editable) */}
                                                      {entry.usageType === 'consumption' && line.lineType === 'prepaid' ? (
                                                        <>
                                                          <div className="h-8 flex items-center text-xs px-3 border rounded-md bg-muted">
                                                            {line.isCurrency ? 'N/A (Currency)' : 'Credit'}
                                                          </div>
                                                          <p className="text-xs text-muted-foreground">
                                                            Must match parent line's unit of measure
                                                          </p>
                                                        </>
                                                      ) : (
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
                                                            <SelectItem value="credit">Credit</SelectItem>
                                                          </SelectContent>
                                                        </Select>
                                                      )}
                                                    </div>
                                                  </>
                                                )}
                                                {/* Invoice Frequency - Hidden for allowance and consumption */}
                                                {entry.usageType !== 'allowance' && entry.usageType !== 'consumption' && (
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
                                                {/* Price Model - Hidden for allowance and consumption */}
                                                {entry.usageType !== 'allowance' && entry.usageType !== 'consumption' && (
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
                                                )}
                                                {(entry.usageType === 'allowance') && (
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

        {/* Bundle Components Configuration */}
        {product.isBundleProduct && product.productLines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bundle Component Configuration</CardTitle>
              <CardDescription>
                Configure pricing and quantity for component lines in each bundle line
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {product.productLines.map((bundleLine, bundleLineIndex) => {
                const lineComponents = (product.bundleComponents || []).filter(
                  c => c.bundleProductLineIndex === bundleLineIndex
                );
                const allocationStatus = getAllocationStatus(lineComponents);
                const errors = bundleErrors.get(bundleLineIndex) || [];

                return (
                  <div key={bundleLineIndex} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {bundleLine.name || `Line ${bundleLineIndex + 1}`}
                      </h3>
                      {lineComponents.some(c => c.componentPricingLevel === 'parent' && !c.isOptional) && (
                        <div className={`text-sm px-3 py-1 rounded-full ${
                          allocationStatus.isValid ? 'bg-green-100 text-green-800' :
                          allocationStatus.remaining > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Allocation: {allocationStatus.total.toFixed(1)}% / 100%
                        </div>
                      )}
                    </div>

                    {errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-800 font-semibold">Validation Errors:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                          {errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Add Component Form */}
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="text-sm font-medium">Add Component Line</h4>
                      {(selectedComponentProducts.get(-1)?.length || 0) === 0 ? (
                        <div className="text-sm text-muted-foreground py-3">
                          No component products selected. Select products at the product level first.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Component Product Line</Label>
                            <Select
                              value=""
                              onValueChange={(productLineNumber) => {
                                // Find which product this line belongs to
                                const selectedProductNumbers = selectedComponentProducts.get(-1) || [];
                                const filteredProducts = availableProducts.filter(p =>
                                  selectedProductNumbers.includes(p.productNumber)
                                );

                                let selectedProduct = null;
                                let selectedLine = null;
                                for (const p of filteredProducts) {
                                  const line = p.productLines.find(l => l.productLineNumber === productLineNumber);
                                  if (line) {
                                    selectedProduct = p;
                                    selectedLine = line;
                                    break;
                                  }
                                }

                                if (selectedProduct && selectedLine) {
                                  const newComponent: BundleComponentInput = {
                                    bundleProductLineIndex: bundleLineIndex,
                                    componentProductNumber: selectedProduct.productNumber,
                                    componentProductLineNumber: selectedLine.productLineNumber,
                                    componentPricingLevel: 'parent',
                                    productLineType: selectedLine.lineType as any,
                                    componentQuantity: 1,
                                    allocationPercentage: 0,
                                    isOptional: false
                                  };
                                  setProduct({
                                    ...product,
                                    bundleComponents: [...(product.bundleComponents || []), newComponent]
                                  });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select component line..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const selectedProductNumbers = selectedComponentProducts.get(-1) || [];
                                  const filteredProducts = availableProducts.filter(p =>
                                    selectedProductNumbers.includes(p.productNumber)
                                  );

                                  return filteredProducts.flatMap(p =>
                                    p.productLines.map(line => (
                                      <SelectItem key={line.productLineNumber} value={line.productLineNumber}>
                                        {p.productName} - {line.name} ({line.lineType})
                                      </SelectItem>
                                    ))
                                  );
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Existing Components */}
                    {lineComponents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Components ({lineComponents.length})</h4>
                        {lineComponents.map((component, compIdx) => {
                          const componentIndex = (product.bundleComponents || []).indexOf(component);
                          const componentProduct = availableProducts.find(
                            p => p.productNumber === component.componentProductNumber
                          );
                          const componentLine = componentProduct?.productLines.find(
                            l => l.productLineNumber === component.componentProductLineNumber
                          );

                          return (
                            <div key={compIdx} className="border rounded p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">
                                    {componentProduct?.productName || 'Unknown Product'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {componentLine?.name || component.componentProductLineNumber}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updatedComponents = (product.bundleComponents || []).filter(
                                      (_, idx) => idx !== componentIndex
                                    );
                                    setProduct({ ...product, bundleComponents: updatedComponents });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Pricing Level</Label>
                                  <Select
                                    value={component.componentPricingLevel}
                                    onValueChange={(value: 'parent' | 'component') => {
                                      const updatedComponents = [...(product.bundleComponents || [])];
                                      updatedComponents[componentIndex] = {
                                        ...component,
                                        componentPricingLevel: value,
                                        allocationPercentage: value === 'parent' ? (component.allocationPercentage || 0) : undefined,
                                        discountPercentage: value === 'component' ? component.discountPercentage : undefined
                                      };
                                      setProduct({ ...product, bundleComponents: updatedComponents });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="parent">Parent</SelectItem>
                                      <SelectItem value="component">Component</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {component.componentPricingLevel === 'parent' ? (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Allocation %</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={component.allocationPercentage || 0}
                                      onChange={(e) => {
                                        const updatedComponents = [...(product.bundleComponents || [])];
                                        updatedComponents[componentIndex] = {
                                          ...component,
                                          allocationPercentage: parseFloat(e.target.value) || 0
                                        };
                                        setProduct({ ...product, bundleComponents: updatedComponents });
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Discount % <span className="text-muted-foreground">(optional)</span></Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      placeholder="None"
                                      value={component.discountPercentage ?? ''}
                                      onChange={(e) => {
                                        const updatedComponents = [...(product.bundleComponents || [])];
                                        updatedComponents[componentIndex] = {
                                          ...component,
                                          discountPercentage: e.target.value === '' ? undefined : parseFloat(e.target.value)
                                        };
                                        setProduct({ ...product, bundleComponents: updatedComponents });
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <Label className="text-xs">Quantity</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={component.componentQuantity}
                                    onChange={(e) => {
                                      const updatedComponents = [...(product.bundleComponents || [])];
                                      updatedComponents[componentIndex] = {
                                        ...component,
                                        componentQuantity: parseInt(e.target.value) || 1
                                      };
                                      setProduct({ ...product, bundleComponents: updatedComponents });
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`optional-${componentIndex}`}
                                  checked={component.isOptional}
                                  onChange={(e) => {
                                    const updatedComponents = [...(product.bundleComponents || [])];
                                    updatedComponents[componentIndex] = {
                                      ...component,
                                      isOptional: e.target.checked
                                    };
                                    setProduct({ ...product, bundleComponents: updatedComponents });
                                  }}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`optional-${componentIndex}`} className="text-sm cursor-pointer">
                                  Optional Component
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={productCodeExists || checkingProductCode}
          >
            Create Product
          </Button>
        </div>
      </form>
    </div>
  );
}
