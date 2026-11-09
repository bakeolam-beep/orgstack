import { useState, useEffect } from 'react';
import api from '../services/api';
import { INVENTORY_API, ORDER_API } from '../config/api';

interface StockItem {
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const ReportsPage = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    totalSales: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [stockRes, orderRes] = await Promise.all([
        api.get(`${INVENTORY_API}/inventory/stock-summary`),
        api.get(`${ORDER_API}/orders/summary`),
      ]);
      setStockItems(stockRes.data || []);
      setOrderSummary(orderRes.data || { totalSales: 0, totalRevenue: 0, pendingPayments: 0 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInventoryValue = stockItems.reduce(
    (sum, item) => sum + item.currentStock * item.price,
    0
  );

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon inventory-value">💎</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(totalInventoryValue)}</span>
            <span className="stat-label">Total Inventory Value</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sales">💰</div>
          <div className="stat-info">
            <span className="stat-value">{orderSummary.totalSales}</span>
            <span className="stat-label">Total Sales Count</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon revenue">💵</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(orderSummary.totalRevenue)}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(orderSummary.pendingPayments)}</span>
            <span className="stat-label">Pending Payments</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>Stock Summary</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Reorder Level</th>
                      <th>Unit Price</th>
                      <th>Stock Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">No stock data available.</td>
                      </tr>
                    ) : (
                      stockItems.map((item) => (
                        <tr key={item.productId}>
                          <td>{item.name}</td>
                          <td>{item.sku}</td>
                          <td>{item.currentStock}</td>
                          <td>{item.reorderLevel}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>{formatCurrency(item.currentStock * item.price)}</td>
                          <td>
                            <span className={`badge ${item.isLowStock ? 'badge-warning' : 'badge-success'}`}>
                              {item.isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Sales Summary</h2>
          </div>
          <div className="card-body">
            <div className="summary-stats">
              <div className="summary-item">
                <span className="summary-label">Total Sales</span>
                <span className="summary-value">{orderSummary.totalSales}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Revenue</span>
                <span className="summary-value">{formatCurrency(orderSummary.totalRevenue)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Pending Payments</span>
                <span className="summary-value">{formatCurrency(orderSummary.pendingPayments)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;