import { useState, useEffect } from 'react';
import { TrendingDown, Plus, Edit2, Phone, Mail, MapPin, Package, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupplierItem {
  id: string;
  name: string;
  price: number;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  items: SupplierItem[];
}

type Tab = 'directory' | 'comparison';

export default function SupplierManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showManagePrices, setShowManagePrices] = useState<string | null>(null); // supplier ID

  // Add Supplier State
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', address: '' });

  // Manage Prices State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState<string>('');

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: suppliersData, error: suppliersErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (suppliersErr) throw suppliersErr;

      const { data: itemsData, error: itemsErr } = await supabase
        .from('supplier_products')
        .select('*')
        .order('product_name');

      if (itemsErr) throw itemsErr;

      const mappedSuppliers: Supplier[] = (suppliersData || []).map(s => {
        const sItems = (itemsData || []).filter(i => i.supplier_id === s.id);
        return {
          id: s.id.toString(),
          name: s.name || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          items: sItems.map(i => ({
            id: i.id.toString(),
            name: i.product_name || '',
            price: Number(i.price) || 0
          }))
        };
      });

      setSuppliers(mappedSuppliers);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error: insertErr } = await supabase
        .from('suppliers')
        .insert([{
          name: newSupplier.name,
          phone: newSupplier.phone,
          email: newSupplier.email,
          address: newSupplier.address,
          status: 'active'
        }]);
        
      if (insertErr) throw insertErr;
      
      setShowAddSupplier(false);
      setNewSupplier({ name: '', phone: '', email: '', address: '' });
      await fetchSuppliers();
    } catch (err: any) {
      console.error('Error adding supplier:', err);
      alert(err.message || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItemToSupplier = async (e: React.FormEvent, supplierId: string) => {
    e.preventDefault();
    try {
      const { error: insertErr } = await supabase
        .from('supplier_products')
        .insert([{
          supplier_id: Number(supplierId),
          product_name: newItemName,
          price: Number(newItemPrice),
          unit: 'crate'
        }]);

      if (insertErr) throw insertErr;

      setNewItemName('');
      setNewItemPrice('');
      await fetchSuppliers();
    } catch (err: any) {
      console.error('Error adding item:', err);
      alert(err.message || 'Failed to add item');
    }
  };

  const handleStartEdit = (item: SupplierItem) => {
    setEditingItemId(item.id);
    setEditingItemPrice(item.price.toString());
  };

  const handleSaveEdit = async (supplierId: string, itemId: string) => {
    try {
      const { error: updateErr } = await supabase
        .from('supplier_products')
        .update({
          price: Number(editingItemPrice)
        })
        .eq('id', Number(itemId));

      if (updateErr) throw updateErr;

      setEditingItemId(null);
      await fetchSuppliers();
    } catch (err: any) {
      console.error('Error updating price:', err);
      alert(err.message || 'Failed to update price');
    }
  };

  // Compute Comparison Data
  const getComparisonData = () => {
    const itemMap = new Map<string, { name: string; price: number; isLowest: boolean }[]>();
    
    suppliers.forEach(supplier => {
      supplier.items.forEach(item => {
        if (!itemMap.has(item.name)) {
          itemMap.set(item.name, []);
        }
        itemMap.get(item.name)!.push({ name: supplier.name, price: item.price, isLowest: false });
      });
    });

    const comparisonData = Array.from(itemMap.entries()).map(([itemName, supplierList]) => {
      const lowestPrice = Math.min(...supplierList.map(s => s.price));
      const evaluatedList = supplierList.map(s => ({
        ...s,
        isLowest: s.price === lowestPrice
      }));
      return { item: itemName, suppliers: evaluatedList };
    });

    return comparisonData;
  };

  const comparisonData = getComparisonData();

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Supplier Management</h1>
          <p className="text-neutral-600">Manage suppliers, contacts, and compare item prices</p>
        </div>
        {activeTab === 'directory' && !loading && !error && (
          <button
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Supplier</span>
          </button>
        )}
      </div>

      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'directory'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Supplier Directory
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'comparison'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Price Comparison
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-neutral-200">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
          <p className="text-neutral-600 font-medium">Loading suppliers...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mb-3" />
          <p className="text-red-800 font-semibold mb-2">Error Loading Suppliers</p>
          <p className="text-red-600 text-sm max-w-md mb-4">{error}</p>
          <button
            onClick={fetchSuppliers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'directory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(supplier => (
                <div key={supplier.id} className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-neutral-900">{supplier.name}</h3>
                    <span className="bg-neutral-100 text-neutral-600 text-xs font-medium px-2 py-1 rounded-full">
                      {supplier.items.length} items
                    </span>
                  </div>
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-start gap-3 text-sm text-neutral-600">
                      <Phone className="w-4 h-4 mt-0.5 text-neutral-400" />
                      <span>{supplier.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-neutral-600">
                      <Mail className="w-4 h-4 mt-0.5 text-neutral-400" />
                      <span>{supplier.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-neutral-600">
                      <MapPin className="w-4 h-4 mt-0.5 text-neutral-400" />
                      <span>{supplier.address || 'N/A'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManagePrices(supplier.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Manage Items & Prices
                  </button>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-neutral-200">
                  <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 font-medium">No suppliers found.</p>
                  <p className="text-sm text-neutral-400">Click "Add Supplier" to get started.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comparison' && (
            <div>
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

              <div className="space-y-6">
                {comparisonData.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                    <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500 font-medium">No items found.</p>
                    <p className="text-sm text-neutral-400">Add items to suppliers to see comparison.</p>
                  </div>
                ) : (
                  comparisonData.map((item) => (
                    <div key={item.item} className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">{item.item}</h3>
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
                              per unit
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Add New Supplier</h2>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Beverage Hub"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., +254 700 000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., sales@beveragehub.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Industrial Area"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-75 flex justify-center items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Prices Modal */}
      {showManagePrices && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Manage Items & Prices</h2>
                <p className="text-sm text-neutral-600">
                  {suppliers.find(s => s.id === showManagePrices)?.name}
                </p>
              </div>
              <button 
                onClick={() => setShowManagePrices(null)}
                className="text-neutral-500 hover:text-neutral-800 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => handleAddItemToSupplier(e, showManagePrices)} className="mb-6 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <h4 className="font-semibold text-sm text-neutral-900 mb-3">Add New Item</h4>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Item Name (e.g., Tusker Beer)"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Price (₦)"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>

            <div>
              <h4 className="font-semibold text-sm text-neutral-900 mb-3">Current Items</h4>
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Item Name</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900">Unit Price</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {suppliers.find(s => s.id === showManagePrices)?.items.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right">
                          {editingItemId === item.id ? (
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                value={editingItemPrice}
                                onChange={(e) => setEditingItemPrice(e.target.value)}
                                className="w-24 px-2 py-1 text-right border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          ) : (
                            `₦ ${item.price.toLocaleString()}`
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingItemId === item.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleSaveEdit(showManagePrices!, item.id)}
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingItemId(null)}
                                className="text-neutral-500 hover:text-neutral-700 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleStartEdit(item)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {suppliers.find(s => s.id === showManagePrices)?.items.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-neutral-500 text-sm">
                          No items added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowManagePrices(null)}
                className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
