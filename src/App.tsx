import { useState, useMemo } from 'react';
import { Toaster } from './components/ui/sonner';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { CartSheet } from './components/CartSheet';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { MyOrders } from './components/MyOrders';
import { AdminLayout } from './components/admin/AdminLayout';
import { Dashboard } from './components/admin/Dashboard';
import { OrderManagement } from './components/admin/OrderManagement';
import { PointOfSale } from './components/admin/PointOfSale';
import { ProductManagement } from './components/admin/ProductManagement';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { FinancialReports } from './components/admin/FinancialReports';
import { PayrollManagement } from './components/admin/PayrollManagement';
import { Settings } from './components/admin/Settings';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { mockProducts, categories } from './lib/mock-data';
import { Product } from './types';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';

interface CustomerViewProps {
  onViewOrders: () => void;
}

function CustomerView({ onViewOrders }: CustomerViewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All Categories' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const featuredProducts = mockProducts.filter((p) => p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCartClick={() => setCartOpen(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-white mb-4">Welcome to Murimi-Wholesalers</h1>
              <p className="text-green-50 mb-6">
                Kenya's trusted wholesale supplier. Quality products at unbeatable prices.
                From grains to cooking essentials, we've got you covered.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="bg-white text-green-700 text-sm py-2 px-4">
                  ✓ Wholesale Prices
                </Badge>
                <Badge variant="secondary" className="bg-white text-green-700 text-sm py-2 px-4">
                  ✓ M-Pesa Payments
                </Badge>
                <Badge variant="secondary" className="bg-white text-green-700 text-sm py-2 px-4">
                  ✓ Fast Delivery
                </Badge>
                <Badge variant="secondary" className="bg-white text-green-700 text-sm py-2 px-4">
                  ✓ VAT Inclusive
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        {featuredProducts.length > 0 && searchQuery === '' && selectedCategory === 'All Categories' && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2>Featured Products</h2>
                  <p className="text-muted-foreground">Top picks for your business</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Products */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <h2>
                {selectedCategory === 'All Categories' ? 'All Products' : selectedCategory}
              </h2>
              <p className="text-muted-foreground">
                {filteredProducts.length} product(s) available
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={
                    selectedCategory === category
                      ? 'bg-green-600 hover:bg-green-700 flex-shrink-0'
                      : 'flex-shrink-0'
                  }
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No products found matching your search.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3>Wholesale Pricing</h3>
                <p className="text-muted-foreground mt-2">
                  Get the best prices on bulk orders. Perfect for retailers and businesses.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <h3>Flexible Payments</h3>
                <p className="text-muted-foreground mt-2">
                  Pay via M-Pesa, card, or cash on delivery. Choose what works for you.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3>Fast Delivery</h3>
                <p className="text-muted-foreground mt-2">
                  Quick delivery across all counties. Track your order in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="mb-4">Murimi-Wholesalers</h4>
              <p className="text-muted-foreground text-sm">
                Kenya's trusted wholesale supplier for quality products at unbeatable prices.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Delivery Info
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Categories</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Grains & Cereals
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Cooking Essentials
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Beverages
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Phone: +254 700 123 456</li>
                <li>Email: info@murimi-wholesalers.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 Murimi-Wholesalers. All rights reserved. | VAT Registered</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState<'customer' | string>('customer');

  const renderAdminView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrderManagement />;
      case 'pos':
        return <PointOfSale />;
      case 'products':
        return <ProductManagement />;
      case 'financial':
        return <FinancialReports />;
      case 'employees':
        return <EmployeeManagement />;
      case 'payroll':
        return <PayrollManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (currentView === 'customer') {
    return (
      <div>
        <CustomerView />
        {/* Admin Access Button */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className="fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Admin Panel
        </button>
      </div>
    );
  }

  return (
    <AdminLayout activeView={currentView} onViewChange={setCurrentView}>
      {renderAdminView()}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
          <Toaster position="top-center" />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
