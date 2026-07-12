import { useState, useEffect } from 'react';
import { TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupplierProduct {
  id: number;
  supplier_id: number;
  product_name: string;
  price: number;
  unit: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface ComparisonItem {
  productName: string;
  unit: string;
  suppliers: {
    name: string;
    price: number;
    isLowest: boolean;
  }[];
}

export default function SupplierComparison() {
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch suppliers and their products
      const { data: suppliers, error: supplierErr } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('status', 'active');

      if (supplierErr) throw supplierErr;

      const { data: products, error: productErr } = await supabase
        .from('supplier_products')
        .select('*');

      if (productErr) throw productErr;

      if (!suppliers || !products || products.length === 0) {
        setComparisons([]);
        return;
      }

      // Build a supplier name lookup
      const supplierMap: Record<number, string> = {};
      suppliers.forEach((s: Supplier) => {
        supplierMap[s.id] = s.name;
      });

      // Group products by product_name
      const productGroups: Record<string, { name: string; price: number; unit: string }[]> = {};
      products.forEach((p: SupplierProduct) => {
        const supplierName = supplierMap[p.supplier_id] || 'Unknown';
        if (!productGroups[p.product_name]) {
          productGroups[p.product_name] = [];
        }
        productGroups[p.product_name].push({
          name: supplierName,
          price: Number(p.price),
          unit: p.unit,
        });
      });

      // Build comparison items with lowest price flagged
      const comparisonList: ComparisonItem[] = Object.entries(productGroups).map(
        ([productName, supplierList]) => {
          const minPrice = Math.min(...supplierList.map((s) => s.price));
          return {
            productName,
            unit: supplierList[0]?.unit || 'unit',
            suppliers: supplierList.map((s) => ({
              ...s,
              isLowest: s.price === minPrice && supplierList.length > 1,
            })),
          };
        }
      );

      setComparisons(comparisonList);
    } catch (err: any) {
      console.error('Error fetching supplier data:', err);
      setError(err.message || 'Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Supplier Price Comparison</h1>
        <p className="text-neutral-600">Compare prices across suppliers to optimize costs</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <TrendingDown className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <p className="font-semibold text-neutral-900 mb-1">Cost Optimization Tip</p>
            <p className="text-sm text-neutral-600">
              Items highlighted in green show the lowest price. Consider ordering from these suppliers to reduce costs.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p>Loading supplier data...</p>
        </div>
      ) : comparisons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 text-center py-16 text-neutral-500">
          <p className="text-lg font-medium">No supplier products found</p>
          <p className="text-sm">Add suppliers and their products to see price comparisons.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comparisons.map((item) => (
            <div key={item.productName} className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">{item.productName}</h3>
              <p className="text-xs text-neutral-500 mb-4">Unit: {item.unit}</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Supplier</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Price</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {item.suppliers.map((supplier) => (
                      <tr
                        key={supplier.name}
                        className={supplier.isLowest ? 'bg-green-50' : 'hover:bg-neutral-50'}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                          {supplier.name}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right">
                          <span className={supplier.isLowest ? 'text-green-600' : 'text-neutral-900'}>
                            ₦ {supplier.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {supplier.isLowest && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              <TrendingDown className="w-4 h-4" />
                              Lowest Price
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {item.suppliers.length > 1 && (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Potential Savings:</span>
                    <span className="text-sm font-semibold text-green-600">
                      ₦{' '}
                      {(
                        Math.max(...item.suppliers.map((s) => s.price)) -
                        Math.min(...item.suppliers.map((s) => s.price))
                      ).toLocaleString()}{' '}
                      per {item.unit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
