import { useState } from 'react';
import KitchenAnalytics from './KitchenAnalytics';
import Inventory from '../staff/Inventory';

import Expenses from '../staff/Expenses';

type Tab = 'overview' | 'inventory' | 'expenses';

export default function KitchenManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Kitchen Department</h1>
        <p className="text-neutral-600">Comprehensive view of all kitchen operations</p>
      </div>

      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'inventory'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Inventory (Stock)
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'expenses'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Expenses
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && <KitchenAnalytics hideHeader />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'expenses' && <Expenses />}
      </div>
    </div>
  );
}
