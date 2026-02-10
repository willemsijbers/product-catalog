'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';

interface Product {
  productNumber: string;
  productName: string;
  productCode: string;
  description?: string;
  productFamily?: string;
  productType?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  productStatus: string;
}

interface RateCardEntry {
  rateCardEntryNumber: string;
  usageType: string;
  identifier?: string;
  usageUnitOfMeasure?: string;
  billableUnitOfMeasure?: string;
  invoiceFrequency?: string;
  priceModel?: string;
  conversion?: number;
  allowance?: number;
  term?: string;
  rollover?: number;
  rolloverDuration?: number;
  maximumRolloverLimit?: number;
  expiration?: number;
}

interface ProductLine {
  productLineNumber: string;
  name: string;
  lineType: string;
  priceModel: string;
  pricingTerm?: string;
  unitOfMeasure?: string;
  hasUsage: boolean;
  parentLine?: string;
  rateCardEntries?: RateCardEntry[];
}

interface ProductDetail extends Product {
  productLines: ProductLine[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.productNumber) {
      fetchProductDetail(params.productNumber as string);
    }
  }, [params.productNumber]);

  const fetchProductDetail = async (productNumber: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/products/${productNumber}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        console.error('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'retired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLineType = (lineType: string) => {
    if (lineType === 'oneTime') return 'One-Time';
    if (lineType === 'recurring') return 'Recurring';
    if (lineType === 'usage') return 'Usage';
    return lineType;
  };

  const formatPricingTerm = (term?: string) => {
    if (!term) return 'N/A';
    if (term === 'once') return 'Once';
    return term.charAt(0).toUpperCase() + term.slice(1);
  };

  const formatPriceModel = (priceModel: string) => {
    if (priceModel === 'rateCard') return 'Rate Card';
    if (priceModel === 'perUnit') return 'Per Unit';
    return priceModel.charAt(0).toUpperCase() + priceModel.slice(1);
  };

  const formatUnitOfMeasure = (unit?: string) => {
    if (!unit) return '-';
    if (unit === 'gb') return 'GB';
    if (unit === 'tb') return 'TB';
    if (unit === 'apiCall') return 'API Call';
    return unit.charAt(0).toUpperCase() + unit.slice(1);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading product details...
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

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/products')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="space-y-6">
        {/* Product Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl">{product.productName}</CardTitle>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(
                      product.productStatus
                    )}`}
                  >
                    {product.productStatus}
                  </span>
                </div>
                <CardDescription className="text-base">
                  {product.description || 'No description provided'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/products/${product.productNumber}/pricing`)}>
                  Create Pricing
                </Button>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Code</p>
                <p className="font-mono text-sm">{product.productCode}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Number</p>
                <p className="font-mono text-sm">{product.productNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Family</p>
                <p className="capitalize">{product.productFamily || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Product Type</p>
                <p className="capitalize">
                  {product.productType === 'sub'
                    ? 'Subscription'
                    : product.productType || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Effective Start Date</p>
                <p>{formatDate(product.effectiveStartDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Effective End Date</p>
                <p>{formatDate(product.effectiveEndDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Product Lines</CardTitle>
            <CardDescription>
              {product.productLines.length} line{product.productLines.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.productLines.map((line, index) => (
                <div
                  key={line.productLineNumber}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{line.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {line.productLineNumber}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {formatLineType(line.lineType)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Price Model</p>
                      <p className="font-medium">{formatPriceModel(line.priceModel)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Pricing Term</p>
                      <p className="font-medium">
                        {line.lineType === 'usage'
                          ? 'N/A'
                          : formatPricingTerm(line.pricingTerm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Unit of Measure</p>
                      <p className="font-medium">{formatUnitOfMeasure(line.unitOfMeasure)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Has Usage Component</p>
                      <p className="font-medium">{line.hasUsage ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  {line.parentLine && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Linked to parent line: <span className="font-mono">{line.parentLine}</span>
                      </p>
                    </div>
                  )}
                  {line.rateCardEntries && line.rateCardEntries.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-sm font-semibold mb-3">Rate Card Entries ({line.rateCardEntries.length})</h5>
                      <div className="space-y-2">
                        {line.rateCardEntries.map((entry, idx) => (
                          <div key={entry.rateCardEntryNumber} className="bg-muted/30 rounded p-3 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-muted-foreground mb-0.5">Usage Type</p>
                                <p className="font-medium capitalize">
                                  {entry.usageType === 'PAYG' ? 'PAYG' : entry.usageType === 'minimumCommit' ? 'Minimum Commit' : entry.usageType}
                                </p>
                              </div>
                              {entry.identifier && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Identifier</p>
                                  <p className="font-medium font-mono">{entry.identifier}</p>
                                </div>
                              )}
                              {entry.usageUnitOfMeasure && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">
                                    {entry.usageType === 'PAYG' ? 'Unit of Measure' : 'Usage UoM'}
                                  </p>
                                  <p className="font-medium">{formatUnitOfMeasure(entry.usageUnitOfMeasure)}</p>
                                </div>
                              )}
                              {entry.billableUnitOfMeasure && entry.usageType !== 'PAYG' && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Billable UoM</p>
                                  <p className="font-medium">{formatUnitOfMeasure(entry.billableUnitOfMeasure)}</p>
                                </div>
                              )}
                              {entry.invoiceFrequency && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Invoice Frequency</p>
                                  <p className="font-medium capitalize">{entry.invoiceFrequency}</p>
                                </div>
                              )}
                              {entry.priceModel && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Price Model</p>
                                  <p className="font-medium">{formatPriceModel(entry.priceModel)}</p>
                                </div>
                              )}
                              {entry.conversion && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Conversion</p>
                                  <p className="font-medium">{entry.conversion}</p>
                                </div>
                              )}
                              {entry.allowance && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Allowance</p>
                                  <p className="font-medium">{entry.allowance}</p>
                                </div>
                              )}
                              {entry.term && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Term</p>
                                  <p className="font-medium capitalize">{entry.term}</p>
                                </div>
                              )}
                              {entry.rollover === 1 && (
                                <div>
                                  <p className="text-muted-foreground mb-0.5">Rollover</p>
                                  <p className="font-medium">
                                    {entry.rolloverDuration && `${entry.rolloverDuration} periods`}
                                    {entry.maximumRolloverLimit && ` (max: ${entry.maximumRolloverLimit})`}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
