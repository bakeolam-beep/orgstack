import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Bell, 
  LogOut, 
  Layers 
} from 'lucide-react';

interface SidebarProps {
  tenantName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ tenantName: _tenantName }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory & Products', path: '/inventory', icon: Package },
    { name: 'Orders & Sales (POS)', path: '/orders', icon: ShoppingCart },
    { name: 'Notifications & Alerts', path: '/notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col shrink-0 border-r border-slate-800">
      <div className="flex-shrink-0">
        {/* App Logo & Branding */}
        <div className="flex items-center gap-3 px-5 py-6 mb-8 border-b border-slate-800">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white">OrgStack</h1>
            <p className="text-xs text-indigo-400 font-medium truncate max-w-[140px]">
              Multi-Tenant SaaS
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-6 pb-8 border-t border-slate-800">
        {/* Logout Footer */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
