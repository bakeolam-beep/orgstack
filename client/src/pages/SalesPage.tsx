import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  price: number;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSaleRef, setLastSaleRef] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const fetchData = async () => {
    setError('');
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get(`${ORDER_API}`),
        api.get(`${INVENTORY_API}/products`),
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sales data';
      setError(message);
    }
  };

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      verifyPayment(reference);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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
        newItems[index].unitPrice = product.price;
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
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    try {
      const response = await api.post(`${ORDER_API}`, payload);
      const saleReference = response.data.saleReference;
      setLastSaleRef(saleReference);
      setPayUrl(null);
      fetchData();
    } catch (err: unknown) {
      const message =
        err instanceof Error &&
        (err as any).response &&
        (err as any).response.data &&
        (err as any).response.data.message
          ? (err as any).response.data.message
          : err instanceof Error
            ? err.message
            : 'Failed to create sale';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!lastSaleRef) return;
    setPaymentLoading(true);
    try {
      const email = user?.email || '';
      const response = await api.post(`${ORDER_API}/${lastSaleRef}/pay`, { email });
      if (response.data.authorizationUrl) {
        setPayUrl(response.data.authorizationUrl);
        window.location.href = response.data.authorizationUrl;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error &&
        (err as any).response &&
        (err as any).response.data &&
        (err as any).response.data.message
          ? (err as any).response.data.message
          : err instanceof Error
            ? err.message
            : 'Payment initiation failed';
      alert(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const response = await api.post(`${ORDER_API}/verify-payment`, { paystackReference: reference });
      if (response.data.verified) {
        fetchData();
        window.location.href = '/orders';
      } else {
        fetchData();
        window.location.href = '/orders';
      }
    } catch (err: unknown) {
      console.error('Payment verification failed:', err);
      fetchData();
      window.location.href = '/orders';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getEffectivePaymentStatus = (saleStatus: string, paymentStatus: string): string => {
    const s = saleStatus.toLowerCase();
    if (s === 'completed') return 'paid';
    if (s === 'failed') return 'unpaid';
    return paymentStatus;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-slate-500">Create and track customer orders.</p>
        </div>
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-4 py-2.5 shadow-md transition-all flex items-center gap-2"
        >
          <span className="text-sm">+</span> New Sale
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sale Reference</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-slate-400">No sales recorded yet.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 text-sm font-medium">{order.saleReference}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-900 text-sm">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getPaymentStatusBadgeClass(getEffectivePaymentStatus(order.status, order.paymentStatus))}`}>
                        {getEffectivePaymentStatus(order.status, order.paymentStatus)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">New Sale</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="text-xl">×</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Line Items</span>
                    <button
                      type="button"
                      onClick={addLineItem}
                      disabled={submitting}
                      className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      + Add Item
                    </button>
                  </div>
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-3 items-end p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Product *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateLineItem(index, 'productId', e.target.value)}
                          required
                          disabled={submitting}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) -                               {formatCurrency(p.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Qty *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                          required
                          min="1"
                          disabled={submitting}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Unit Price *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          required
                          step="0.01"
                          min="0"
                          disabled={submitting}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Total</label>
                        <div className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">&nbsp;</label>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={submitting || lineItems.length <= 1}
                          className="px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900">Grand Total:</span>
                    <span className="text-2xl font-bold text-indigo-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {submitting ? 'Creating Sale...' : 'Create Sale'}
                </button>
              </div>
            </form>

            {lastSaleRef && !payUrl && (
              <div className="mt-8 p-6 rounded-xl bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-600 font-bold">✓</span>
                  <p className="text-sm font-medium text-slate-900">Sale created successfully!</p>
                </div>
                <p className="text-sm text-slate-600 mb-4">Reference: <span className="font-mono font-bold">{lastSaleRef}</span></p>
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-60"
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
