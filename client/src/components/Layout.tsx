import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 'Workspace';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar tenantName={tenantId} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
              Active Tenant ID
            </span>
            <span className="text-xs font-mono text-slate-500 truncate max-w-sm">
              {tenantId}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              A
            </div>
            <span className="text-sm font-medium text-slate-700">Tenant Admin</span>
          </div>
        </header>

        {/* Dynamic Page Component (Dashboard, Inventory, Orders, Notifications) */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
