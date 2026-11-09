import { useState, useEffect } from 'react';
import api from '../services/api';
import { ORDER_API, INVENTORY_API } from '../config/api';

interface Order {
  id: string;
  saleReference: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const SalesPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSaleRef, setLastSaleRef] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get(`${ORDER_API}/orders`),
        api.get(`${INVENTORY_API}/inventory/products`),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sales data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setLineItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
    setFormError('');
    setLastSaleRef(null);
    setPayUrl(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
    setLastSaleRef(null);
    setPayUrl(null);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unitPrice = product.unitPrice;
      }
    }
    setLineItems(newItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const validItems = lineItems.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one line item');
      setSubmitting(false);
      return;
    }

    const payload = {
      items: validItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    try {
      const response = await api.post(`${ORDER_API}/orders`, payload);
      const saleReference = response.data.saleReference;
      setLastSaleRef(saleReference);
      setPayUrl(null);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create sale';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!lastSaleRef) return;
    setPaymentLoading(true);
    try {
      const response = await api.post(`${ORDER_API}/orders/${lastSaleRef}/pay`);
      if (response.data.authorizationUrl) {
        setPayUrl(response.data.authorizationUrl);
        window.location.href = response.data.authorizationUrl;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment initiation failed';
      alert(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="sales-page">
      <div className="page-header">
        <h1>Sales</h1>
        <button className="btn btn-primary" onClick={openModal}>New Sale</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Sales History</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">Loading sales...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sale Reference</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">No sales recorded yet.</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.saleReference}</td>
                        <td>{new Date(order.createdAt).toLocaleString()}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getPaymentStatusBadgeClass(order.paymentStatus)}`}>
                            {order.paymentStatus}
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
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Sale</h2>
              <button className="modal-close" onClick={closeModal} disabled={submitting}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error">{formError}</div>}

                <div className="line-items">
                  <div className="line-items-header">
                    <h3>Line Items</h3>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addLineItem}>+ Add Item</button>
                  </div>

                  {lineItems.map((item, index) => (
                    <div key={index} className="line-item-row">
                      <div className="form-group line-item-field">
                        <label>Product *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateLineItem(index, 'productId', e.target.value)}
                          required
                          disabled={submitting}
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) - {formatCurrency(p.unitPrice)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group line-item-field">
                        <label>Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                          required
                          min="1"
                          disabled={submitting}
                        />
                      </div>

                      <div className="form-group line-item-field">
                        <label>Unit Price (NGN) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          required
                          step="0.01"
                          min="0"
                          disabled={submitting}
                        />
                      </div>

                      <div className="form-group line-item-field line-item-total">
                        <label>Total</label>
                        <div className="line-total-display">{formatCurrency(item.quantity * item.unitPrice)}</div>
                      </div>

                      <div className="form-group line-item-field line-item-actions">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeLineItem(index)}
                          disabled={submitting || lineItems.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sale-total">
                  <strong>Grand Total: {formatCurrency(calculateTotal())}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Sale...' : 'Create Sale'}
                </button>
              </div>
            </form>

            {lastSaleRef && !payUrl && (
              <div className="modal-payment">
                <div className="alert alert-success">
                  Sale created successfully! Reference: <strong>{lastSaleRef}</strong>
                </div>
                <button
                  className="btn btn-success btn-block"
                  onClick={handlePayment}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? 'Redirecting to Paystack...' : 'Pay Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'failed': return 'badge-danger';
    default: return 'badge-secondary';
  }
};

const getPaymentStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'failed': return 'badge-danger';
    default: return 'badge-secondary';
  }
};

export default SalesPage;