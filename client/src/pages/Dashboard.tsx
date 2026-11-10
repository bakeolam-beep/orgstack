import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { INVENTORY_API, ORDER_API, NOTIFICATION_API } from '../config/api';

interface StockSummaryItem {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  price: number;
  isLowStock: boolean;
}

interface OrderSummary {
  totalSales: number;
  totalRevenue: number;
  pendingPayments: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export const Dashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<StockSummaryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');

    let stockData: StockSummaryItem[] = [];
    let orderData: OrderSummary = { totalSales: 0, totalRevenue: 0, pendingPayments: 0 };
    let notifData: Notification[] = [];
    let fetchError = false;

    try {
      const stockRes = await api.get(`${INVENTORY_API}/stock-summary`);
      stockData = stockRes.data || [];
    } catch {
      fetchError = true;
      stockData = [];
    }

    try {
      const orderRes = await api.get(`${ORDER_API}/summary`);
      orderData = orderRes.data || { totalSales: 0, totalRevenue: 0, pendingPayments: 0 };
    } catch {
      fetchError = true;
      orderData = { totalSales: 0, totalRevenue: 0, pendingPayments: 0 };
    }

    try {
      const notifRes = await api.get(`${NOTIFICATION_API}`);
      notifData = notifRes.data || [];
    } catch {
      fetchError = true;
      notifData = [];
    }

    if (fetchError) {
      setError('Some dashboard data could not be loaded.');
    }

    setTotalProducts(stockData.length);
    setLowStockCount(stockData.filter((item) => item.isLowStock).length);
    setLowStockItems(stockData.filter((item) => item.isLowStock).slice(0, 5));

    setTotalSales(orderData.totalSales || 0);
    setTotalRevenue(orderData.totalRevenue || 0);

    setNotifications(notifData.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's an overview of your inventory.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <span className="text-xl">📦</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
              <span className="text-xl">⚠️</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Low Stock Items</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-lg text-green-600">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Sales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <span className="text-xl">💵</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Low Stock Alerts</h2>
            <Link to="/inventory" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="overflow-hidden">
            {lowStockItems.length === 0 ? (
              <div className="h-32 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                No low stock items. All products are well stocked!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reorder Level</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lowStockItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{item.sku}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{item.currentStock}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{item.reorderLevel}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Notifications</h2>
            <Link to="/notifications" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="h-32 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                No recent notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 ${!notif.isRead ? 'bg-blue-50' : 'bg-white'}`}>
                  <div className="flex-shrink-0 text-lg mt-0.5">
                    {notif.type === 'low_stock' ? '⚠️' : notif.type === 'order' ? '📦' : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900">{notif.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${notif.type === 'low_stock' ? 'bg-orange-100 text-orange-800' : notif.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                        {notif.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{notif.message}</p>
                    <span className="text-xs text-slate-400">{new Date(notif.createdAt).toLocaleString()}</span>
                  </div>
                  {!notif.isRead && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0 mt-0.5" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
