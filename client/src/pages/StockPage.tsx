import { useState, useEffect } from 'react';
import api from '../services/api';
import { INVENTORY_API } from '../config/api';

interface StockItem {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

const StockPage = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    type: 'In',
    reference: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [stockRes, productsRes] = await Promise.all([
        api.get(`${INVENTORY_API}/inventory/stock-summary`),
        api.get(`${INVENTORY_API}/inventory/products`),
      ]);
      setStockItems(stockRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setFormData({ productId: '', quantity: '', type: 'In', reference: '' });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = {
      productId: formData.productId,
      quantity: parseInt(formData.quantity, 10),
      type: formData.type,
      reference: formData.reference || undefined,
    };

    try {
      await api.post(`${INVENTORY_API}/inventory/stock-movements`, payload);
      closeModal();
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record stock movement';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <h1>Stock Management</h1>
        <button className="btn btn-primary" onClick={openModal}>Record Stock Movement</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Current Stock Levels</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">Loading stock data...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">No stock data available.</td>
                    </tr>
                  ) : (
                    stockItems.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.name}</td>
                        <td>{item.sku}</td>
                        <td>{item.currentStock}</td>
                        <td>{item.reorderLevel}</td>
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Stock Movement</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error">{formError}</div>}

                <div className="form-group">
                  <label htmlFor="productId">Product *</label>
                  <select
                    id="productId"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="quantity">Quantity *</label>
                    <input
                      type="number"
                      id="quantity"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="1"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="type">Type *</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      disabled={submitting}
                    >
                      <option value="In">Stock In</option>
                      <option value="Out">Stock Out</option>
                      <option value="Adjustment">Adjustment</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reference">Reference (Optional)</label>
                  <input
                    type="text"
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., PO-123, INV-456"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;