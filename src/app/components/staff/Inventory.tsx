import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle, Package, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────
interface InventoryItem {
  id: number;
  name: string;
  opening: number;
  addition: number;
  total: number;
  unitPrice: number;
  sold: number;
  waste: number;
  closing: number;
}

interface StoreItem {
  id: number;
  name: string;
  closing: number;
  loaded: number;
}

interface SalesReport {
  id: number;
  date: string;
  totalSales: number;
  cashAtHand: number;
  posTransfer: number;
  notPaid: number;
  stockbookSales: number;
  additionsSummary: { name: string; quantity: number }[];
  posDetails?: any; // kept for legacy reports before the migration
}

interface PosBreakdown {
  id: number;
  date: string;
  totalPos: number;
  bar: number;
  kitchen: number;
  lodge: number;
  creditors: string;
}

interface InventoryProps {
  department?: 'bar' | 'kitchen';
}

type Tab = 'stockbook' | 'sales_report' | 'pos_breakdown';

// ─── Component ──────────────────────────────────────────────────────
export default function Inventory({ department: propDepartment }: InventoryProps) {
  const location = useLocation();
  const department = propDepartment || (location.pathname.includes('kitchen') ? 'kitchen' : 'bar');

  const [activeTab, setActiveTab] = useState<Tab>('stockbook');

  // Date navigation
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  // Stockbook state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  
  // Sales Report state
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  
  // POS Breakdowns state
  const [posBreakdowns, setPosBreakdowns] = useState<PosBreakdown[]>([]);

  // Previous day's items for auto-filling
  const [previousDayItems, setPreviousDayItems] = useState<InventoryItem[]>([]);

  // Track whether the selected day's stockbook has been signed/closed
  const [isSigned, setIsSigned] = useState(false);

  // A day's stockbook is editable only if it hasn't been signed
  const isEditable = !isSigned;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [showPosModal, setShowPosModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Stockbook Form Fields ───
  const [name, setName] = useState('');
  const [opening, setOpening] = useState<number | ''>('');
  const [addition, setAddition] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [sold, setSold] = useState<number | ''>('');
  const [waste, setWaste] = useState<number | ''>('');

  const resetForm = () => {
    setName('');
    setOpening('');
    setAddition('');
    setUnitPrice('');
    setSold('');
    setWaste('');
  };

  // ─── Sales Report Form Fields ───
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashAtHand, setCashAtHand] = useState<number | ''>('');
  const [posTransfer, setPosTransfer] = useState<number | ''>('');
  const [notPaid, setNotPaid] = useState<number | ''>('');
  
  // POS Breakdown Fields
  const [posTotal, setPosTotal] = useState<number | ''>('');
  const [posBar, setPosBar] = useState<number | ''>('');
  const [posKitchen, setPosKitchen] = useState<number | ''>('');
  const [posLodge, setPosLodge] = useState<number | ''>('');
  const [posCreditors, setPosCreditors] = useState<string>('');

  const resetReportForm = (targetDate: string = selectedDate) => {
    setReportDate(targetDate);
    setCashAtHand('');
    setNotPaid('');
    // Auto-fill posTransfer from current date's breakdown
    const breakdown = posBreakdowns.find(p => p.date === targetDate);
    if (breakdown) {
      setPosTransfer(department === 'bar' ? breakdown.bar : breakdown.kitchen);
    } else {
      setPosTransfer('');
    }
  };

  const resetPosForm = (targetDate: string = selectedDate) => {
    const existing = posBreakdowns.find(p => p.date === targetDate);
    if (existing) {
      setPosTotal(existing.totalPos);
      setPosBar(existing.bar);
      setPosKitchen(existing.kitchen);
      setPosLodge(existing.lodge);
      setPosCreditors(existing.creditors || '');
    } else {
      setPosTotal('');
      setPosBar('');
      setPosKitchen('');
      setPosLodge('');
      setPosCreditors('');
    }
  };

  // ─── Data Fetching ─────────────────────────────────────────────────
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      // 1. Fetch stockbook items for selected date
      let { data: invData, error: invErr } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('department', department)
        .eq('date', selectedDate)
        .order('id', { ascending: true });

      if (invErr) throw invErr;

      // Fetch previous day items for auto-filling the Add Item form and auto-seed
      const { data: prevData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('department', department)
        .lt('date', selectedDate)
        .order('date', { ascending: false });

      if (prevData && prevData.length > 0) {
        const mostRecentDate = (prevData[0] as any).date;
        const latestItems = prevData.filter((r: any) => r.date === mostRecentDate);
        setPreviousDayItems(latestItems.map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          opening: Number(item.opening),
          addition: Number(item.addition),
          total: Number(item.total),
          unitPrice: Number(item.unit_price),
          sold: Number(item.sold),
          waste: Number(item.waste),
          closing: Number(item.closing),
        })));
        
        // Auto carry-forward: if the selected date has no items, seed from previous day's closing
        if (!invData || invData.length === 0) {
          const inserts = latestItems.map((prev: any) => ({
            name: prev.name,
            date: selectedDate,
            opening: Number(prev.closing),
            addition: 0,
            total: Number(prev.closing),
            unit_price: Number(prev.unit_price),
            sold: 0,
            waste: 0,
            closing: Number(prev.closing),
            department,
          }));
          const { data: inserted } = await supabase
            .from('inventory_items')
            .insert(inserts)
            .select();
          invData = inserted;
        }
      }

      setInventory((invData || []).map((item: any) => ({
        id: Number(item.id),
        name: item.name,
        opening: Number(item.opening),
        addition: Number(item.addition),
        total: Number(item.total),
        unitPrice: Number(item.unit_price),
        sold: Number(item.sold),
        waste: Number(item.waste),
        closing: Number(item.closing),
      })));

      // 2. Fetch store inventory
      const { data: storeData } = await supabase
        .from('store_inventory')
        .select('id, name, closing, loaded')
        .eq('department', department);

      if (storeData) {
        setStoreItems(storeData.map((s: any) => ({
          id: Number(s.id),
          name: s.name,
          closing: Number(s.closing),
          loaded: Number(s.loaded),
        })));
      }

      // 3. Fetch all sales reports (not filtered by date — shows history)
      const { data: reportData, error: reportErr } = await supabase
        .from('sales_reports')
        .select('*')
        .eq('department', department)
        .order('date', { ascending: false });

      if (reportErr) throw reportErr;

      if (reportData) {
        setSalesReports(reportData.map((r: any) => ({
          id: Number(r.id),
          date: r.date,
          totalSales: Number(r.total_sales),
          cashAtHand: Number(r.cash_at_hand),
          posTransfer: Number(r.pos_transfer),
          notPaid: Number(r.not_paid),
          stockbookSales: Number(r.stockbook_sales || 0),
          additionsSummary: r.additions_summary || [],
          posDetails: r.pos_details, // legacy
        })));
      }

      // 3b. Fetch POS breakdowns
      const { data: posData, error: posErr } = await supabase
        .from('pos_breakdowns')
        .select('*')
        .order('date', { ascending: false });

      if (posErr) throw posErr;

      if (posData) {
        setPosBreakdowns(posData.map((p: any) => ({
          id: Number(p.id),
          date: p.date,
          totalPos: Number(p.total_pos),
          bar: Number(p.bar),
          kitchen: Number(p.kitchen),
          lodge: Number(p.lodge),
          creditors: p.creditors || '',
        })));
      }

      // 4. Check if the selected date has been signed
      const { data: signData, error: signErr } = await supabase
        .from('daily_signatures')
        .select('id')
        .eq('department', department)
        .eq('date', selectedDate)
        .maybeSingle();

      if (signErr && signErr.code !== 'PGRST116') {
        console.error('Error checking signature:', signErr);
      }
      setIsSigned(!!signData);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [department, selectedDate]);

  // Date navigation helpers
  const changeDateByDays = (dateStr: string, days: number): string => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + days);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const goToPrevDay = () => {
    setSelectedDate(prev => changeDateByDays(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => {
      const next = changeDateByDays(prev, 1);
      return next <= today ? next : prev;
    });
  };

  const syncStockbookSalesToReport = async (dateStr: string) => {
    try {
      const { data: items } = await supabase
        .from('inventory_items')
        .select('sold, unit_price')
        .eq('department', department)
        .eq('date', dateStr);

      const total = (items || []).reduce((sum, item) => sum + (Number(item.sold) * Number(item.unit_price)), 0);

      const { data: report } = await supabase
        .from('sales_reports')
        .select('id')
        .eq('department', department)
        .eq('date', dateStr)
        .maybeSingle();

      if (report) {
        await supabase
          .from('sales_reports')
          .update({ stockbook_sales: total })
          .eq('id', report.id);
      }
    } catch (err) {
      console.error('Error syncing stockbook sales to report:', err);
    }
  };

  const handleSignRecord = async () => {
    if (window.confirm(`Are you sure you want to sign and close the stockbook for ${selectedDate}? This action cannot be undone and will make the stockbook read-only.`)) {
      try {
        const { error: signErr } = await supabase
          .from('daily_signatures')
          .insert([{
            date: selectedDate,
            department,
            signed_by: 'Staff'
          }]);

        if (signErr) throw signErr;
        
        // Refresh data to update isSigned state
        await fetchData(false);
      } catch (err: any) {
        console.error('Error signing record:', err);
        alert(err.message || 'Failed to sign the record. Make sure the database table is created.');
      }
    }
  };

  // ─── Stockbook Logic ───────────────────────────────────────────────
  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setName(item.name);
    setOpening(item.opening);
    setAddition(item.addition);
    setUnitPrice(item.unitPrice);
    setSold(item.sold);
    setWaste(item.waste);
    setEditingItem(item);
  };

  const getStoreStock = (itemName: string): number => {
    const found = storeItems.find((s) => s.name.toLowerCase() === itemName.toLowerCase());
    return found ? found.closing : 0;
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const parsedOpening = Number(opening) || 0;
    const parsedAddition = Number(addition) || 0;
    const parsedUnitPrice = Number(unitPrice) || 0;
    const parsedSold = Number(sold) || 0;
    const parsedWaste = Number(waste) || 0;
    const calculatedTotal = parsedOpening + parsedAddition;
    const calculatedClosing = calculatedTotal - parsedSold - parsedWaste;

    // Normalize name: use existing store item casing if match found
    const matchingStoreItem = storeItems.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    const normalizedName = matchingStoreItem ? matchingStoreItem.name : name.trim();

    // Case-insensitive duplicate check: prevent adding same item name on same date
    if (!editingItem) {
      const duplicate = inventory.find(
        (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicate) {
        alert(`An item named "${duplicate.name}" already exists in today's stockbook. Please edit the existing entry instead.`);
        setSubmitting(false);
        return;
      }
    }

    // Calculate how many units are being taken from store
    let storeDeduction = 0;
    if (editingItem) {
      storeDeduction = parsedAddition - editingItem.addition;
    } else {
      storeDeduction = parsedAddition;
    }

    // Check store has enough stock if we're deducting
    if (storeDeduction > 0) {
      const available = getStoreStock(normalizedName);
      if (available < storeDeduction) {
        alert(`Insufficient store stock for "${normalizedName}". Available: ${available} units, Requested: ${storeDeduction} units. Please receive a supplier delivery first.`);
        setSubmitting(false);
        return;
      }
    }

    try {
      if (editingItem) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            name: normalizedName,
            opening: parsedOpening,
            addition: parsedAddition,
            total: calculatedTotal,
            unit_price: parsedUnitPrice,
            sold: parsedSold,
            waste: parsedWaste,
            closing: calculatedClosing,
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert([{
            name: normalizedName,
            date: selectedDate,
            opening: parsedOpening,
            addition: parsedAddition,
            total: calculatedTotal,
            unit_price: parsedUnitPrice,
            sold: parsedSold,
            waste: parsedWaste,
            closing: calculatedClosing,
            department,
          }]);

        if (insertError) throw insertError;
      }

      // Deduct from store if addition increased
      if (storeDeduction > 0) {
        const storeItem = storeItems.find((s) => s.name.toLowerCase() === normalizedName.toLowerCase());
        if (storeItem) {
          const newLoaded = storeItem.loaded + storeDeduction;
          const newClosing = storeItem.closing - storeDeduction;
          const { error: storeError } = await supabase
            .from('store_inventory')
            .update({
              loaded: newLoaded,
              closing: newClosing,
              updated_at: new Date().toISOString(),
            })
            .eq('id', storeItem.id);

          if (storeError) {
            console.error('Error updating store:', storeError);
            alert('Stockbook updated, but failed to deduct from store: ' + storeError.message);
          }
        }
      }

      // Sync stockbook sales to report
      await syncStockbookSalesToReport(selectedDate);

      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      await fetchData(false);
    } catch (err: any) {
      console.error('Error saving inventory:', err);
      alert(err.message || 'Error saving inventory item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Sync stockbook sales to report
        await syncStockbookSalesToReport(selectedDate);

        await fetchData(false);
      } catch (err: any) {
        console.error('Error deleting inventory:', err);
        alert(err.message || 'Error deleting inventory item.');
      }
    }
  };

  // ─── Sales Report Logic ────────────────────────────────────────────
  // Auto-calculate total sales from stockbook: sold × unitPrice per item
  const calcStockbookSales = inventory.reduce((sum, item) => sum + (item.sold * item.unitPrice), 0);

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const parsedCash = Number(cashAtHand) || 0;
    const parsedPos = Number(posTransfer) || 0;
    const parsedNotPaid = Number(notPaid) || 0;
    
    const totalSales = parsedCash + parsedPos + parsedNotPaid;

    // Automatically gather drinks/items added to stock book today
    const additionsSummary = inventory
      .filter(item => item.addition > 0)
      .map(item => ({
        name: item.name,
        quantity: item.addition
      }));

    try {
      const { error: insertErr } = await supabase
        .from('sales_reports')
        .insert([{
          date: reportDate,
          total_sales: totalSales,
          cash_at_hand: parsedCash,
          pos_transfer: parsedPos,
          not_paid: parsedNotPaid,
          stockbook_sales: calcStockbookSales,
          additions_summary: additionsSummary,
          department,
        }]);

      if (insertErr) throw insertErr;

      setShowAddReportModal(false);
      resetReportForm();
      await fetchData(false);
    } catch (err: any) {
      console.error('Error saving report:', err);
      alert(err.message || 'Failed to save sales report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePosBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        date: selectedDate,
        total_pos: Number(posTotal) || 0,
        bar: Number(posBar) || 0,
        kitchen: Number(posKitchen) || 0,
        lodge: Number(posLodge) || 0,
        creditors: posCreditors
      };

      const existing = posBreakdowns.find(p => p.date === selectedDate);
      if (existing) {
        const { error: updateErr } = await supabase
          .from('pos_breakdowns')
          .update(payload)
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('pos_breakdowns')
          .insert([payload]);
        if (insertErr) throw insertErr;
      }

      setShowPosModal(false);
      await fetchData(false);
    } catch (err: any) {
      console.error('Error saving POS breakdown:', err);
      alert(err.message || 'Failed to save POS breakdown.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Inventory & Sales ({department.charAt(0).toUpperCase() + department.slice(1)})
          </h1>
          <p className="text-neutral-600">Track daily stockbook movements and daily sales reports</p>
        </div>
        {activeTab === 'stockbook' && isEditable ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        ) : activeTab === 'stockbook' && !isEditable ? (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold border border-amber-300">
            Read Only
          </span>
        ) : activeTab === 'pos_breakdown' ? (
          <button
            onClick={() => { resetPosForm(selectedDate); setShowPosModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add / Edit POS Breakdown</span>
          </button>
        ) : (
          <button
            onClick={() => { resetReportForm(selectedDate); setShowAddReportModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Sales Report</span>
          </button>
        )}
      </div>

      {/* Date Navigation Bar */}
      {activeTab === 'stockbook' && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-neutral-200 px-4 py-3 shadow-sm">
          <button
            onClick={goToPrevDay}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="ml-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Today
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isSigned && (
              <button
                onClick={handleSignRecord}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Sign & Close Day
              </button>
            )}
            
            {isEditable ? (
              <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-full border border-green-200">
                {isToday ? 'Today' : selectedDate} • Editable
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Signed & Locked
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('stockbook')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'stockbook'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Daily Stockbook
          </button>
          <button
            onClick={() => setActiveTab('sales_report')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'sales_report'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Sales Reports
          </button>
          <button
            onClick={() => setActiveTab('pos_breakdown')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'pos_breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            POS Breakdown
          </button>
        </nav>
      </div>

      {/* Loading & Error States */}
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
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* ─── Tab 1: Stockbook ────────────────────────────────────── */}
          {activeTab === 'stockbook' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Item</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Opening</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-green-700">Addition</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Total</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Price</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-red-700">Sold</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-orange-700">Waste</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 bg-neutral-100">Closing</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-purple-700 bg-purple-50">Item Sales (₦)</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-neutral-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 text-right font-medium">{item.opening}</td>
                        <td className="px-6 py-4 text-sm text-green-600 text-right font-semibold">+{item.addition}</td>
                        <td className="px-6 py-4 text-sm text-neutral-900 text-right font-bold">{item.total}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 text-right font-medium">₦ {item.unitPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-red-600 text-right font-semibold">-{item.sold}</td>
                        <td className="px-6 py-4 text-sm text-orange-600 text-right font-semibold">-{item.waste}</td>
                        <td className="px-6 py-4 text-sm font-bold text-neutral-900 text-right bg-neutral-50">{item.closing}</td>
                        <td className="px-6 py-4 text-sm font-bold text-purple-700 text-right bg-purple-50">
                          ₦ {(item.sold * item.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {isEditable ? (
                              <>
                                <button onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Item">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Item">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">locked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-10 text-center text-sm text-neutral-500">
                          No items in {department} inventory. Click "Add Item" to add stock.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {inventory.length > 0 && (
                    <tfoot className="border-t-2 border-purple-300 bg-purple-50">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-neutral-900" colSpan={8}>Total Sales from Stockbook</td>
                        <td className="px-6 py-4 text-base font-extrabold text-purple-800 text-right">
                          ₦ {calcStockbookSales.toLocaleString()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ─── Tab 2: Sales Report ─────────────────────────────────── */}
          {activeTab === 'sales_report' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-purple-700 bg-purple-50">Stockbook Sales (₦)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Cash + POS + Debt (₦)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-green-700">Cash</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-blue-700">POS/Trans.</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-red-700">Debt</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Additions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {salesReports.map((report) => {
                      const diff = report.totalSales - report.stockbookSales;
                      const isMatch = Math.abs(diff) < 1;
                      return (
                        <tr key={report.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900 whitespace-nowrap">{report.date}</td>
                          <td className="px-6 py-4 text-sm font-bold text-purple-700 text-right bg-purple-50">
                            ₦ {report.stockbookSales.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-sm font-bold ${isMatch ? 'text-green-700' : 'text-red-600'}`}>
                              ₦ {report.totalSales.toLocaleString()}
                            </span>
                            {!isMatch && (
                              <span className="block text-xs text-red-500">
                                {diff > 0 ? `+₦${diff.toLocaleString()} over` : `-₦${Math.abs(diff).toLocaleString()} short`}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-green-700 text-right font-medium">₦ {report.cashAtHand.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm text-blue-700 font-medium">₦ {report.posTransfer.toLocaleString()}</div>
                            {report.posDetails && report.posDetails.total !== undefined && (
                              <div className="text-[10px] text-neutral-500 mt-1 whitespace-nowrap" title={`Total: ${report.posDetails.total} | Bar: ${report.posDetails.bar} | Kitch: ${report.posDetails.kitchen} | Lodge: ${report.posDetails.lodge}\nCreditors: ${report.posDetails.creditors}`}>
                                T: {report.posDetails.total} | B: {report.posDetails.bar} | K: {report.posDetails.kitchen} | L: {report.posDetails.lodge}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-red-700 text-right font-medium">₦ {report.notPaid.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600">
                            {report.additionsSummary && report.additionsSummary.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {report.additionsSummary.map((add, idx) => (
                                  <li key={idx} className="truncate">
                                    {add.name} <span className="font-semibold text-green-600">(+{add.quantity})</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-neutral-400 italic">No additions recorded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {salesReports.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-neutral-500">
                          No sales reports recorded. Click "Add Sales Report" to submit end-of-day sales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ─── Tab 3: POS Breakdowns ─────────────────────────────────── */}
          {activeTab === 'pos_breakdown' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-neutral-900">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-blue-700 bg-blue-50">Total POS (₦)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Bar (₦)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Kitchen (₦)</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900">Lodge (₦)</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Creditors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {posBreakdowns.map((pb) => (
                      <tr key={pb.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-neutral-900 whitespace-nowrap">{pb.date}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-700 text-right bg-blue-50">
                          ₦ {pb.totalPos.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700 text-right font-medium">₦ {pb.bar.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-neutral-700 text-right font-medium">₦ {pb.kitchen.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-neutral-700 text-right font-medium">₦ {pb.lodge.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 whitespace-pre-wrap">{pb.creditors || '-'}</td>
                      </tr>
                    ))}
                    {posBreakdowns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                          No POS Breakdowns recorded. Click "Add / Edit POS Breakdown" to submit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Add / Edit Stockbook Item Modal ───────────────────────── */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto relative">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Item Name</label>
                <input type="text" required value={name} 
                  onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    if (!editingItem) {
                      // Check if exists in previous day to auto-fill opening
                      const prev = previousDayItems.find(p => p.name.toLowerCase() === newName.toLowerCase());
                      if (prev) {
                        setOpening(prev.closing);
                        setUnitPrice(prev.unitPrice);
                        setAddition(0);
                        setSold(0);
                        setWaste(0);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Tusker Beer"
                  list="store-items-for-stockbook" />
                <datalist id="store-items-for-stockbook">
                  {storeItems.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Opening Stock</label>
                  <input type="number" min="0" required value={opening} onChange={(e) => setOpening(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Addition (from Store)</label>
                  <input type="number" min="0" required value={addition} onChange={(e) => setAddition(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* Store stock indicator */}
              {name && (
                <div className={`p-3 rounded-lg border text-sm font-medium ${
                  getStoreStock(name) > 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                }`}>
                  <span>Store stock for "{name}":</span>
                  <span className="ml-2 font-bold">{getStoreStock(name)} units available</span>
                  {(() => {
                    const deduction = editingItem ? (Number(addition) || 0) - editingItem.addition : (Number(addition) || 0);
                    if (deduction > 0) {
                      return (
                        <span className="ml-2 text-red-600">
                          (will deduct {deduction} → remaining: {getStoreStock(name) - deduction})
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Unit Price (₦)</label>
                  <input type="number" min="0" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Sold</label>
                  <input type="number" min="0" required value={sold} onChange={(e) => setSold(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Waste</label>
                  <input type="number" min="0" required value={waste} onChange={(e) => setWaste(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* Calculation preview */}
              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-neutral-500">Total Stock:</span>
                  <span className="ml-2 text-neutral-900 font-bold">{(Number(opening) || 0) + (Number(addition) || 0)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Closing:</span>
                  <span className="ml-2 text-neutral-900 font-bold">{((Number(opening) || 0) + (Number(addition) || 0)) - (Number(sold) || 0) - (Number(waste) || 0)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingItem(null); }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Sales Report Modal ────────────────────────────────── */}
      {showAddReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Submit Daily Sales Report</h2>
            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Date</label>
                <input type="date" required disabled value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 cursor-not-allowed focus:outline-none" />
                <p className="text-xs text-neutral-500 mt-1">Locked to the active stockbook date ({selectedDate}) to ensure calculations match.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Cash at Hand (₦)</label>
                  <input type="number" min="0" required value={cashAtHand} onChange={(e) => setCashAtHand(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">POS / Transfer (₦)</label>
                  <input type="number" min="0" required value={posTransfer} onChange={(e) => setPosTransfer(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-neutral-500 mt-1">This value is auto-filled from the POS Breakdown tab for {department}, but you can override it if necessary.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Not Paid (Debt) (₦)</label>
                  <input type="number" min="0" required value={notPaid} onChange={(e) => setNotPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Stockbook reference — read only */}
              <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-200 flex items-center justify-between text-sm font-medium">
                <div>
                  <span className="text-purple-800 font-semibold">Stockbook Calculated Sales</span>
                  <p className="text-xs text-purple-600 mt-0.5">Auto-calculated from daily stockbook (sold × unit price)</p>
                </div>
                <span className="text-purple-900 font-extrabold text-lg">₦ {calcStockbookSales.toLocaleString()}</span>
              </div>

              {/* Reconciliation preview */}
              {(() => {
                const received = (Number(cashAtHand) || 0) + (Number(posTransfer) || 0) + (Number(notPaid) || 0);
                const diff = received - calcStockbookSales;
                const isMatch = Math.abs(diff) < 1;
                return (
                  <div className={`p-3.5 rounded-lg border flex items-center justify-between text-sm font-medium ${
                    isMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={isMatch ? 'text-green-800' : 'text-red-800'}>
                      {isMatch ? '✓ Cash + POS + Debt matches stockbook' : 'Cash + POS + Debt total:'}
                    </span>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${isMatch ? 'text-green-900' : 'text-red-900'}`}>
                        ₦ {received.toLocaleString()}
                      </span>
                      {!isMatch && (
                        <p className="text-xs text-red-600">
                          {diff > 0 ? `+₦${diff.toLocaleString()} over` : `-₦${Math.abs(diff).toLocaleString()} short`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
                <p className="text-xs font-semibold text-neutral-700 mb-2">Automated Additions Summary</p>
                <p className="text-xs text-neutral-600 mb-2">
                  The following stock additions from today's stockbook will be attached to this report automatically:
                </p>
                <div className="max-h-24 overflow-y-auto">
                  <ul className="list-disc list-inside text-xs text-neutral-700">
                    {inventory.filter(i => i.addition > 0).map((i, idx) => (
                      <li key={idx}>{i.name} <span className="font-semibold text-green-600">(+{i.addition})</span></li>
                    ))}
                    {inventory.filter(i => i.addition > 0).length === 0 && (
                      <li className="text-neutral-400 italic">No additions recorded today.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddReportModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add/Edit POS Breakdown Modal ──────────────────────────── */}
      {showPosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Submit POS Breakdown</h2>
            <form onSubmit={handleSavePosBreakdown} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Date</label>
                <input type="date" required disabled value={selectedDate}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 cursor-not-allowed focus:outline-none" />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Total POS (₦)</label>
                    <input type="number" min="0" required value={posTotal} onChange={(e) => setPosTotal(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Bar (₦)</label>
                    <input type="number" min="0" required value={posBar} onChange={(e) => setPosBar(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Kitchen (₦)</label>
                    <input type="number" min="0" required value={posKitchen} onChange={(e) => setPosKitchen(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Lodge (₦)</label>
                    <input type="number" min="0" required value={posLodge} onChange={(e) => setPosLodge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Creditor Names & Amounts</label>
                  <textarea value={posCreditors} onChange={(e) => setPosCreditors(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    placeholder="e.g. John Doe: 2000, Jane Smith: 1500" rows={2} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPosModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-75">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Breakdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
