import { useState, useEffect } from 'react';
import api from '../services/api';
import { INVENTORY_API } from '../config/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  reorderLevel: number;
  currentStock: number;
  isLowStock: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    unitPrice: '',
    reorderLevel: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`${INVENTORY_API}/inventory/products`);
      setProducts(response.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', description: '', unitPrice: '', reorderLevel: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      unitPrice: product.unitPrice.toString(),
      reorderLevel: product.reorderLevel.toString(),
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = {
      name: formData.name,
      sku: formData.sku,
      description: formData.description,
      unitPrice: parseFloat(formData.unitPrice),
      reorderLevel: parseInt(formData.reorderLevel, 10),
    };

    try {
      if (editingProduct) {
        await api.patch(`${INVENTORY_API}/inventory/products/${editingProduct.id}`, payload);
      } else {
        await api.post(`${INVENTORY_API}/inventory/products`, payload);
      }
      closeModal();
      fetchProducts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save product';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      await api.delete(`${INVENTORY_API}/inventory/products/${product.id}`);
      fetchProducts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      alert(message);
    }
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn btn-primary" onClick={openAddModal}>Add Product</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Unit Price</th>
                    <th>Reorder Level</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">No products found. Click "Add Product" to create one.</td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{formatCurrency(product.unitPrice)}</td>
                        <td>{product.reorderLevel}</td>
                        <td>{product.currentStock}</td>
                        <td>
                          <span className={`badge ${product.isLowStock ? 'badge-warning' : 'badge-success'}`}>
                            {product.isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(product)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product)}>Delete</button>
                          </div>
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
              <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error">{formError}</div>}

                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sku">SKU *</label>
                  <input
                    type="text"
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="unitPrice">Unit Price (NGN) *</label>
                    <input
                      type="number"
                      id="unitPrice"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      required
                      step="0.01"
                      min="0"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reorderLevel">Reorder Level *</label>
                    <input
                      type="number"
                      id="reorderLevel"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      required
                      min="0"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;