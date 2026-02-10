'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and pricing structures
          </p>
        </div>
        <Button onClick={() => router.push('/products/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading products...
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No products found</p>
            <Button onClick={() => router.push('/products/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>{products.length} products in catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 font-semibold text-sm">Product Code</th>
                    <th className="pb-3 font-semibold text-sm">Name</th>
                    <th className="pb-3 font-semibold text-sm">Family</th>
                    <th className="pb-3 font-semibold text-sm">Type</th>
                    <th className="pb-3 font-semibold text-sm">Effective Date</th>
                    <th className="pb-3 font-semibold text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.productNumber}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/products/${product.productNumber}`)}
                    >
                      <td className="py-4 font-mono text-sm">{product.productCode}</td>
                      <td className="py-4">
                        <div className="font-medium">{product.productName}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="capitalize text-sm">
                          {product.productFamily || '-'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="capitalize text-sm">
                          {product.productType === 'sub'
                            ? 'Subscription'
                            : product.productType || '-'}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {formatDate(product.effectiveStartDate)}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(
                            product.productStatus
                          )}`}
                        >
                          {product.productStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
