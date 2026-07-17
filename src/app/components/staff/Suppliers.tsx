import { useState, useEffect } from 'react';
import { Plus, Eye, Loader2, AlertCircle, Package, ArrowRight, Truck, Upload, Pencil, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────
interface SupplierDelivery {
  id: number;
  date: string;
  supplier: string;
  price: number;
  items: string;
  quantity: number;
  itemQtyPerPack: number;
  totalPrice: number;
  receiptUrl?: string;
}

interface StoreItem {
  id: number;
  name: string;
  opening: number;
  supplied: number;
  loaded: number;
  closing: number;
}

interface SuppliersProps {
  department?: 'bar' | 'kitchen';
}

type Tab = 'deliveries' | 'store';

// ─── Component ──────────────────────────────────────────────────────
export default function Suppliers({ department: propDepartment }: SuppliersProps) {
  const location = useLocation();
  const department = propDepartment || (location.pathname.includes('kitchen') ? 'kitchen' : 'bar');

  const [activeTab, setActiveTab] = useState<Tab>('deliveries');

  // Supplier deliveries state
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);

  // Store inventory state
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add delivery modal
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [showEditDelivery, setShowEditDelivery] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SupplierDelivery | null>(null);

  // Opening stock modal
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [openingStockItem, setOpeningStockItem] = useState<StoreItem | null>(null);
  const [openingStockName, setOpeningStockName] = useState('');
  const [openingStockValue, setOpeningStockValue] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);

  // Form fields — delivery
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [items, setItems] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [itemQtyPerPack, setItemQtyPerPack] = useState<number | ''>(24);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const resetDeliveryForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSupplier('');
    setPrice('');
    setItems('');
    setQuantity('');
    setItemQtyPerPack(24);
    setReceiptFile(null);
  };

  // ─── Data Fetching ─────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch supplier deliveries
      const { data: delData, error: delErr } = await supabase
        .from('supplier_deliveries')
        .select('*')
        .eq('department', department)
        .order('date', { ascending: false });

      if (delErr) throw delErr;

      if (delData) {
        setDeliveries(delData.map((d: any) => ({
          id: Number(d.id),
          date: d.date,
          supplier: d.supplier,
          price: Number(d.price),
          items: d.items,
          quantity: Number(d.quantity),
          itemQtyPerPack: Number(d.item_qty_per_pack),
          totalPrice: Number(d.price) * Number(d.quantity),
          receiptUrl: d.receipt_url || '',
        })));
      }

      // Fetch store inventory
      const { data: storeData, error: storeErr } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('department', department)
        .order('name', { ascending: true });

      if (storeErr) throw storeErr;

      if (storeData) {
        setStoreItems(storeData.map((s: any) => ({
          id: Number(s.id),
          name: s.name,
          opening: Number(s.opening),
          supplied: Number(s.supplied),
          loaded: Number(s.loaded),
          closing: Number(s.closing),
        })));
      }
    } catch (err: any) {
      console.error('Error fetching supplier data:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [department]);

  // ─── Add Delivery (Supplier → Store) ──────────────────────────────
  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQuantity = Number(quantity) || 0;
    const parsedPrice = Number(price) || 0;
    const parsedItemQtyPerPack = Number(itemQtyPerPack) || 1;

    if (!supplier || !items || parsedQuantity <= 0) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);

    const totalUnits = parsedQuantity * parsedItemQtyPerPack;
    const unitPricePerItem = parsedItemQtyPerPack > 0 ? Math.round(parsedPrice / parsedItemQtyPerPack) : 0;
    let finalReceiptUrl = '';

    try {
      // 1. Upload receipt if file selected
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${department}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        finalReceiptUrl = publicUrlData.publicUrl;
      }

      // 2. Log the delivery record
      const { error: insertErr } = await supabase
        .from('supplier_deliveries')
        .insert([{
          date,
          supplier,
          price: parsedPrice,
          items,
          quantity: parsedQuantity,
          item_qty_per_pack: parsedItemQtyPerPack,
          receipt_url: finalReceiptUrl || null,
          department,
        }]);

      if (insertErr) throw insertErr;

      // 3. Update store inventory (upsert — add to existing or create new)
      //    Use case-insensitive matching to prevent duplicates like "Legend" vs "legend"
      const { data: existing, error: findErr } = await supabase
        .from('store_inventory')
        .select('*')
        .ilike('name', items.trim())
        .eq('department', department)
        .maybeSingle();

      if (findErr) throw findErr;

      // Use existing name casing if found, otherwise use trimmed input
      const normalizedItemName = existing ? existing.name : items.trim();

      if (existing) {
        const newSupplied = Number(existing.supplied) + totalUnits;
        const newClosing = Number(existing.opening) + newSupplied - Number(existing.loaded);

        const { error: updateErr } = await supabase
          .from('store_inventory')
          .update({
            supplied: newSupplied,
            closing: newClosing,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: createErr } = await supabase
          .from('store_inventory')
          .insert([{
            name: normalizedItemName,
            opening: 0,
            supplied: totalUnits,
            loaded: 0,
            closing: totalUnits,
            department,
          }]);

        if (createErr) throw createErr;
      }

      setShowAddDelivery(false);
      resetDeliveryForm();
      await fetchAll();
    } catch (err: any) {
      console.error('Error saving delivery:', err);
      alert(err.message || 'Failed to save delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit Delivery ─────────────────────────────────────────────────
  const handleEditDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    const oldItems = editingDelivery.items;
    const oldTotalUnits = editingDelivery.quantity * editingDelivery.itemQtyPerPack;

    const parsedQuantity = Number(quantity) || 0;
    const parsedPrice = Number(price) || 0;
    const parsedItemQtyPerPack = Number(itemQtyPerPack) || 1;

    if (!supplier || !items || parsedQuantity <= 0) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);

    const newTotalUnits = parsedQuantity * parsedItemQtyPerPack;
    let finalReceiptUrl = editingDelivery.receiptUrl || '';

    try {
      // 1. Upload receipt if new file selected
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${department}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        finalReceiptUrl = publicUrlData.publicUrl;
      }

      // 2. Update the delivery record
      const { error: updateDeliveryErr } = await supabase
        .from('supplier_deliveries')
        .update({
          date,
          supplier,
          price: parsedPrice,
          items,
          quantity: parsedQuantity,
          item_qty_per_pack: parsedItemQtyPerPack,
          receipt_url: finalReceiptUrl || null,
        })
        .eq('id', editingDelivery.id);

      if (updateDeliveryErr) throw updateDeliveryErr;

      // 3. Update store inventory
      if (oldItems === items) {
        // Name did not change: adjust supplied on the item
        const { data: existing, error: findErr } = await supabase
          .from('store_inventory')
          .select('*')
          .ilike('name', items.trim())
          .eq('department', department)
          .maybeSingle();

        if (findErr) throw findErr;

        if (existing) {
          const difference = newTotalUnits - oldTotalUnits;
          const newSupplied = Number(existing.supplied) + difference;
          const newClosing = Number(existing.opening) + newSupplied - Number(existing.loaded);

          const { error: updateErr } = await supabase
            .from('store_inventory')
            .update({
              supplied: newSupplied,
              closing: newClosing,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateErr) throw updateErr;
        } else {
          // If somehow the existing record doesn't exist, create it
          const { error: createErr } = await supabase
            .from('store_inventory')
            .insert([{
              name: items,
              opening: 0,
              supplied: newTotalUnits,
              loaded: 0,
              closing: newTotalUnits,
              department,
            }]);

          if (createErr) throw createErr;
        }
      } else {
        // Name changed:
        // a. Subtract oldTotalUnits from oldItems
        const { data: existingOld, error: findOldErr } = await supabase
          .from('store_inventory')
          .select('*')
          .ilike('name', oldItems.trim())
          .eq('department', department)
          .maybeSingle();

        if (findOldErr) throw findOldErr;

        if (existingOld) {
          const newSupplied = Number(existingOld.supplied) - oldTotalUnits;
          const newClosing = Number(existingOld.opening) + newSupplied - Number(existingOld.loaded);

          const { error: updateOldErr } = await supabase
            .from('store_inventory')
            .update({
              supplied: newSupplied,
              closing: newClosing,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOld.id);

          if (updateOldErr) throw updateOldErr;
        }

        // b. Add newTotalUnits to newItems
        const { data: existingNew, error: findNewErr } = await supabase
          .from('store_inventory')
          .select('*')
          .ilike('name', items.trim())
          .eq('department', department)
          .maybeSingle();

        if (findNewErr) throw findNewErr;

        if (existingNew) {
          const newSupplied = Number(existingNew.supplied) + newTotalUnits;
          const newClosing = Number(existingNew.opening) + newSupplied - Number(existingNew.loaded);

          const { error: updateNewErr } = await supabase
            .from('store_inventory')
            .update({
              supplied: newSupplied,
              closing: newClosing,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingNew.id);

          if (updateNewErr) throw updateNewErr;
        } else {
          const { error: createErr } = await supabase
            .from('store_inventory')
            .insert([{
              name: items,
              opening: 0,
              supplied: newTotalUnits,
              loaded: 0,
              closing: newTotalUnits,
              department,
            }]);

          if (createErr) throw createErr;
        }
      }

      setShowEditDelivery(false);
      setEditingDelivery(null);
      resetDeliveryForm();
      await fetchAll();
    } catch (err: any) {
      console.error('Error updating delivery:', err);
      alert(err.message || 'Failed to update delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Save Opening Stock ────────────────────────────────────────────
  const handleSaveOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = Number(openingStockValue) || 0;
    if (!openingStockName) {
      alert('Please enter or select an item name.');
      return;
    }
    setSubmitting(true);

    try {
      // Check if item exists in store_inventory for this department (case-insensitive)
      const { data: existing, error: findErr } = await supabase
        .from('store_inventory')
        .select('*')
        .ilike('name', openingStockName.trim())
        .eq('department', department)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        // Update existing record
        const newClosing = parsedValue + Number(existing.supplied) - Number(existing.loaded);
        const { error: updateErr } = await supabase
          .from('store_inventory')
          .update({
            opening: parsedValue,
            closing: newClosing,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        // Create new record
        const { error: createErr } = await supabase
          .from('store_inventory')
          .insert([{
            name: openingStockName.trim(),
            opening: parsedValue,
            supplied: 0,
            loaded: 0,
            closing: parsedValue,
            department,
          }]);

        if (createErr) throw createErr;
      }

      setShowOpeningStockModal(false);
      setOpeningStockItem(null);
      setOpeningStockName('');
      setOpeningStockValue('');
      await fetchAll();
    } catch (err: any) {
      console.error('Error saving opening stock:', err);
      alert(err.message || 'Failed to save opening stock.');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to determine stock level color
  const getStockLevelData = (closing: number) => {
    if (closing > 50) return { label: 'High', class: 'bg-green-100 text-green-700' };
    if (closing > 10) return { label: 'Low', class: 'bg-orange-100 text-orange-700' };
    return { label: 'Critically Low', class: 'bg-red-100 text-red-700' };
  };

  const handleDeleteDelivery = async (id: number) => {
    const userInput = window.prompt('Type "delete" to confirm:');
    if (userInput?.toLowerCase() !== 'delete') return;

    try {
      const { error } = await supabase.from('supplier_deliveries').delete().eq('id', id);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete delivery.');
    }
  };

  const handleDeleteStoreItem = async (id: number) => {
    const userInput = window.prompt('Type "delete" to confirm:');
    if (userInput?.toLowerCase() !== 'delete') return;

    try {
      const { error } = await supabase.from('store_inventory').delete().eq('id', id);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete store item.');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Suppliers & Store ({department.charAt(0).toUpperCase() + department.slice(1)})
          </h1>
          <p className="text-neutral-600">
            Manage supplier deliveries and track store stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'store' && (
            <button
              onClick={() => {
                setOpeningStockItem(null);
                setOpeningStockName('');
                setOpeningStockValue('');
                setShowOpeningStockModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Add Opening Stock</span>
            </button>
          )}
          {activeTab === 'deliveries' && (
            <button
              onClick={() => { resetDeliveryForm(); setShowAddDelivery(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Delivery</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'deliveries'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            Supplier Deliveries
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'store'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Store Inventory
          </button>
        </nav>
      </div>

      {/* Loading & Error */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-neutral-200">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
          <p className="text-neutral-600 font-medium">Loading data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-xl border border-red-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mb-3" />
          <p className="text-red-800 font-semibold mb-2">Error Connecting to Database</p>
          <p className="text-red-600 text-sm max-w-md mb-4">{error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* ─── Tab 1: Supplier Deliveries ─────────────────────────── */}
          {activeTab === 'deliveries' && (
            <div>
              {/* Info banner */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                <Truck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Supplier → Store Flow</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    When you log a delivery here, the items are automatically added to the Store Inventory.
                    Staff can then take from the store to their daily stockbook.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Date</th>
                        <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Supplier</th>
                        <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Items</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Price</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Qty</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">P/P</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Total</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Receipt</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {deliveries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{entry.date}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{entry.supplier}</td>
                          <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{entry.items}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 text-right">₦ {entry.price.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 text-right font-medium">{entry.quantity}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 text-right">{entry.itemQtyPerPack}</td>
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900 text-right">₦ {entry.totalPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            {entry.receiptUrl ? (
                              <a href={entry.receiptUrl} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                                <Eye className="w-4 h-4" /> View
                              </a>
                            ) : (
                              <span className="text-sm text-neutral-400">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingDelivery(entry);
                                setDate(entry.date);
                                setSupplier(entry.supplier);
                                setItems(entry.items);
                                setPrice(entry.price);
                                setQuantity(entry.quantity);
                                setItemQtyPerPack(entry.itemQtyPerPack);
                                setReceiptFile(null);
                                setShowEditDelivery(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                            >
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDelivery(entry.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium ml-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {deliveries.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-sm text-neutral-500">
                            No deliveries recorded yet. Click "Add Delivery" to receive stock from a supplier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab 2: Store Inventory ─────────────────────────────── */}
          {activeTab === 'store' && (
            <div>
              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Store → Stockbook Flow</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    This shows current stock levels in the store. When staff add "Addition" stock in the Stockbook (Inventory page),
                    it is automatically deducted from this store ("Loaded or Moved to Stock").
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Item</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Opening</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-green-700">Supplied</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-orange-700">Loaded</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 bg-neutral-100">Level</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {storeItems.map((item) => {
                        const levelData = getStockLevelData(item.closing);
                        return (
                          <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium text-neutral-600">{item.opening}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">+{item.supplied}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">-{item.loaded}</td>
                            <td className="px-6 py-4 text-right bg-neutral-50">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-bold text-neutral-900">{item.closing}</span>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${levelData.class}`}>
                                  {levelData.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setOpeningStockItem(item);
                                  setOpeningStockName(item.name);
                                  setOpeningStockValue(item.opening);
                                  setShowOpeningStockModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                              >
                                <Pencil className="w-4 h-4" /> Edit Opening
                              </button>
                              <button
                                onClick={() => handleDeleteStoreItem(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium ml-2"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {storeItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                            Store is empty. Add supplier deliveries or set opening stock to stock the store.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Add Delivery Modal ──────────────────────────────────────── */}
      {showAddDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Add Supplier Delivery</h2>
            <form onSubmit={handleAddDelivery} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Supplier Name</label>
                <input type="text" required value={supplier} onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., East African Breweries" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Item (Product Name)</label>
                <input type="text" required value={items} onChange={(e) => setItems(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Tusker Beer"
                  list="store-items-list" />
                <datalist id="store-items-list">
                  {storeItems.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
                <p className="text-xs text-neutral-400 mt-1">Select existing item or type a new name.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Price/Pack (₦)</label>
                  <input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Qty (Packs)</label>
                  <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Items/Pack</label>
                  <input type="number" min="1" required value={itemQtyPerPack} onChange={(e) => setItemQtyPerPack(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Upload Receipt (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors text-sm font-medium text-neutral-700">
                    <Upload className="w-4 h-4" />
                    {receiptFile ? 'Change File' : 'Choose File'}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                  {receiptFile && (
                    <span className="text-sm text-neutral-600 truncate max-w-[200px]">{receiptFile.name}</span>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-neutral-500">Total Price:</span>
                  <span className="ml-2 text-neutral-900 font-bold">₦ {((Number(price) || 0) * (Number(quantity) || 0)).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Units going to Store:</span>
                  <span className="ml-2 text-green-600 font-bold">+{(Number(quantity) || 0) * (Number(itemQtyPerPack) || 1)} units</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddDelivery(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Delivery Modal ──────────────────────────────────────── */}
      {showEditDelivery && editingDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Edit Supplier Delivery</h2>
            <form onSubmit={handleEditDelivery} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Supplier Name</label>
                <input type="text" required value={supplier} onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., East African Breweries" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Item (Product Name)</label>
                <input type="text" required value={items} onChange={(e) => setItems(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Tusker Beer"
                  list="store-items-list" />
                <datalist id="store-items-list">
                  {storeItems.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
                <p className="text-xs text-neutral-400 mt-1">Select existing item or type a new name.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Price/Pack (₦)</label>
                  <input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Qty (Packs)</label>
                  <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Items/Pack</label>
                  <input type="number" min="1" required value={itemQtyPerPack} onChange={(e) => setItemQtyPerPack(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Upload Receipt (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors text-sm font-medium text-neutral-700">
                    <Upload className="w-4 h-4" />
                    {receiptFile ? 'Change File' : (editingDelivery.receiptUrl ? 'Change Receipt' : 'Choose File')}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                  {receiptFile ? (
                    <span className="text-sm text-neutral-600 truncate max-w-[200px]">{receiptFile.name}</span>
                  ) : editingDelivery.receiptUrl ? (
                    <span className="text-sm text-neutral-500 italic">Has existing receipt</span>
                  ) : null}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-neutral-500">Total Price:</span>
                  <span className="ml-2 text-neutral-900 font-bold">₦ {((Number(price) || 0) * (Number(quantity) || 0)).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Units going to Store:</span>
                  <span className="ml-2 text-green-600 font-bold">+{(Number(quantity) || 0) * (Number(itemQtyPerPack) || 1)} units</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditDelivery(false); setEditingDelivery(null); }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── Add/Edit Opening Stock Modal ────────────────────────────── */}
      {showOpeningStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {openingStockItem ? 'Edit Opening Stock' : 'Add Opening Stock'}
            </h2>
            <form onSubmit={handleSaveOpeningStock} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  disabled={!!openingStockItem}
                  value={openingStockName}
                  onChange={(e) => setOpeningStockName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:text-neutral-500"
                  placeholder="e.g., Tusker Beer"
                  list="store-items-list"
                />
                {!openingStockItem && (
                  <>
                    <datalist id="store-items-list">
                      {storeItems.map((item) => (
                        <option key={item.id} value={item.name} />
                      ))}
                    </datalist>
                    <p className="text-xs text-neutral-400 mt-1">Select existing item or type a new name.</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Opening Stock (Units)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingStockValue}
                  onChange={(e) => setOpeningStockValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 100"
                />
              </div>

              {openingStockItem && (
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Supplied:</span>
                    <span className="font-semibold text-neutral-700">{openingStockItem.supplied} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loaded:</span>
                    <span className="font-semibold text-neutral-700">{openingStockItem.loaded} units</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium">
                    <span>New Closing Stock:</span>
                    <span className="font-bold text-neutral-900">
                      {(Number(openingStockValue) || 0) + Number(openingStockItem.supplied) - Number(openingStockItem.loaded)} units
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOpeningStockModal(false);
                    setOpeningStockItem(null);
                    setOpeningStockName('');
                    setOpeningStockValue('');
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
