'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { CreateProductInput, CreateProductLineInput, LineType, PriceModel } from '@/types/product';

export default function CreateProductPage() {
  const [product, setProduct] = useState<CreateProductInput>({
    productCode: '',
    name: '',
    description: '',
    effectiveStartDate: new Date().toISOString().split('T')[0],
    productLines: [],
  });

  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

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
    setProduct({ ...product, productLines: updatedLines });
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

    try {
      const response = await fetch('http://localhost:3000/api/products/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      alert(`Product created successfully!\n\nProduct Number: ${data.productNumber}\nProduct Lines: ${data.productLines?.length || 0} created`);

      // Reset form
      setProduct({
        productCode: '',
        name: '',
        description: '',
        effectiveStartDate: new Date().toISOString().split('T')[0],
        productLines: [],
      });
      setExpandedLines(new Set());
    } catch (error) {
      console.error('Error creating product:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const getRecurringLines = () => {
    return product.productLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.lineType === 'recurring');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
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
                    <Card key={index} className="border-l-4 border-l-primary/20">
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
                              ({lineTypeLabel} • {line.priceModel})
                            </span>
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

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`price-model-${index}`}>Price Model *</Label>
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
                            </div>

                            {line.lineType === 'recurring' && (
                              <div className="space-y-2">
                                <Label htmlFor={`has-usage-${index}`} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`has-usage-${index}`}
                                    checked={line.hasUsage || false}
                                    onChange={(e) => updateProductLine(index, 'hasUsage', e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                  Has Usage Component
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Check if this line includes usage-based charges
                                </p>
                              </div>
                            )}

                            {line.lineType === 'usage' && (
                              <div className="space-y-2">
                                <Label htmlFor={`parent-line-${index}`}>Parent Line (Optional)</Label>
                                <Select
                                  value={line.parentLine || undefined}
                                  onValueChange={(value) => updateProductLine(index, 'parentLine', value === 'none' ? undefined : value)}
                                >
                                  <SelectTrigger id={`parent-line-${index}`}>
                                    <SelectValue placeholder="No parent line" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getRecurringLines().length > 0 ? (
                                      getRecurringLines().map(({ line: parentLine, index: parentIndex }) => (
                                        <SelectItem key={parentIndex} value={`line-${parentIndex}`}>
                                          {parentLine.name || `Recurring Line ${parentIndex + 1}`}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No recurring lines available
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Link to a recurring line for commit/overage pattern
                                </p>
                              </div>
                            )}
                          </div>
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
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">
            Create Product
          </Button>
        </div>
      </form>
    </div>
  );
}
