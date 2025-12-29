import { useState } from 'react';
import { Package, ShoppingBag, Users, Clock, AlertTriangle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  useAdminProducts,
  useAdminOrders,
  useAdminStats,
  useUpdateProductStock,
  useUpdateOrderStatus,
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/useAdmin';
import { formatPrice, formatDateTime } from '@qademo/shared';
import type { Product } from '@qademo/shared';
import { getImageUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProductModal, { type ProductFormData } from '@/components/admin/ProductModal';

type Tab = 'overview' | 'products' | 'orders';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: products, isLoading: productsLoading } = useAdminProducts();
  const { data: orders, isLoading: ordersLoading } = useAdminOrders();
  const updateStock = useUpdateProductStock();
  const updateStatus = useUpdateOrderStatus();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: Package },
    { id: 'products' as Tab, label: 'Products', icon: ShoppingBag },
    { id: 'orders' as Tab, label: 'Orders', icon: Clock },
  ];

  const handleStockUpdate = async (productId: number, newStock: number) => {
    await updateStock.mutateAsync({ productId, stock: newStock });
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    await updateStatus.mutateAsync({ orderId, status: newStatus });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({
        productId: editingProduct.id,
        data: {
          name: data.name,
          description: data.description || undefined,
          price: data.price,
          stock: data.stock,
          isActive: data.isActive,
          imageKey: data.imageKey,
        },
      });
    } else {
      await createProduct.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        stock: data.stock,
        imageKey: data.imageKey,
      });
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-slate-600">Manage your store inventory and orders</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 rounded-xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {statsLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Products', value: stats?.counts.products, icon: Package, color: 'brand' },
                    { label: 'Orders', value: stats?.counts.orders, icon: ShoppingBag, color: 'blue' },
                    { label: 'Users', value: stats?.counts.users, icon: Users, color: 'green' },
                    { label: 'Pending', value: stats?.counts.pendingOrders, icon: Clock, color: 'yellow' },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-600">{stat.label}</p>
                              <p className="text-3xl font-bold text-slate-900 mt-1">
                                {stat.value || 0}
                              </p>
                            </div>
                            <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Low Stock Alert */}
                {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Low Stock Alert</h2>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-slate-100">
                        {stats.lowStockProducts.map((product) => (
                          <div key={product.id} className="py-3 flex justify-between items-center">
                            <span className="font-medium text-slate-900">{product.name}</span>
                            <Badge variant={product.stock === 0 ? 'error' : 'warning'}>
                              {product.stock} left
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-slate-100">
                      {stats?.recentOrders?.map((order) => (
                        <div key={order.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-slate-900">Order #{order.id}</p>
                            <p className="text-sm text-slate-500">{order.username}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">
                              {formatPrice(order.totalAmount)}
                            </p>
                            <Badge variant={order.status === 'pending' ? 'warning' : 'success'} size="sm">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {productsLoading ? (
              <LoadingSpinner />
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Inventory Management</h2>
                    <Button onClick={handleAddProduct} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products?.map((product) => (
                          <tr key={product.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getImageUrl(product.imageUrl)}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                                <span className="font-medium text-slate-900">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-900">
                              {formatPrice(product.price)}
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                defaultValue={product.stock}
                                min="0"
                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                onBlur={(e) => {
                                  const newStock = parseInt(e.target.value, 10);
                                  if (!isNaN(newStock) && newStock !== product.stock) {
                                    handleStockUpdate(product.id, newStock);
                                  }
                                }}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={product.isActive ? 'success' : 'error'}>
                                {product.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {ordersLoading ? (
              <LoadingSpinner />
            ) : (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-bold text-slate-900">Order History</h2>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders?.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              #{order.id}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{order.username}</td>
                            <td className="px-6 py-4 text-slate-600">
                              {formatDateTime(order.createdAt)}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {formatPrice(order.totalAmount)}
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        isLoading={createProduct.isPending || updateProduct.isPending}
      />
    </div>
  );
}

