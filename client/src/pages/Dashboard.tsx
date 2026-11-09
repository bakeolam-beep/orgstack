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
  unitPrice: number;
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

const Dashboard = () => {
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
    try {
      const [stockRes, orderRes, notifRes] = await Promise.all([
        api.get(`${INVENTORY_API}/inventory/stock-summary`),
        api.get(`${ORDER_API}/orders/summary`),
        api.get(`${NOTIFICATION_API}/notifications`),
      ]);

      const stockData: StockSummaryItem[] = stockRes.data || [];
      setTotalProducts(stockData.length);
      setLowStockCount(stockData.filter((item) => item.isLowStock).length);
      setLowStockItems(stockData.filter((item) => item.isLowStock).slice(0, 5));

      const orderData: OrderSummary = orderRes.data || { totalSales: 0, totalRevenue: 0, pendingPayments: 0 };
      setTotalSales(orderData.totalSales || 0);
      setTotalRevenue(orderData.totalRevenue || 0);

      const notifData: Notification[] = notifRes.data || [];
      setNotifications(notifData.slice(0, 5));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your inventory.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon products">📦</div>
          <div className="stat-info">
            <span className="stat-value">{totalProducts}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon low-stock">⚠️</div>
          <div className="stat-info">
            <span className="stat-value">{lowStockCount}</span>
            <span className="stat-label">Low Stock Items</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sales">💰</div>
          <div className="stat-info">
            <span className="stat-value">{totalSales}</span>
            <span className="stat-label">Total Sales</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon revenue">💵</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(totalRevenue)}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>Recent Low Stock Alerts</h2>
            {lowStockItems.length > 0 && (
              <Link to="/stock" className="view-all">View All</Link>
            )}
          </div>
          <div className="card-body">
            {lowStockItems.length === 0 ? (
              <p className="empty-state">No low stock items. All products are well stocked!</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Reorder Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.name}</td>
                        <td>{item.sku}</td>
                        <td>{item.currentStock}</td>
                        <td>{item.reorderLevel}</td>
                        <td><span className="badge badge-warning">Low Stock</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent Notifications</h2>
            <Link to="/notifications" className="view-all">View All</Link>
          </div>
          <div className="card-body">
            {notifications.length === 0 ? (
              <p className="empty-state">No recent notifications.</p>
            ) : (
              <div className="notification-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${!notif.isRead ? 'unread' : ''}`}>
                    <div className="notification-icon">
                      {notif.type === 'low_stock' ? '⚠️' : notif.type === 'order' ? '📦' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">
                        {new Date(notif.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!notif.isRead && <span className="unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;