import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UserDashboard } from './pages/UserDashboard';
import ProductFilterPage from './pages/ProductFilterPage';
import { BecomeSupplierPage } from './pages/BecomeSupplierPage';
import SupplierAuthPage from './pages/SupplierAuthPage';
import SupplierDashboardPage from './pages/SupplierDashboardPage';
import SupplierProductsPage from './pages/SupplierProductsPage';
import SupplierProfilePage from './pages/SupplierProfilePage';
import SupplierInquiriesPage from './pages/SupplierInquiriesPage';
import AddProductPage from './pages/AddProductPage';
import ProductEntryChoice from './pages/ProductEntryChoice';
import AIProductEntryPage from './pages/AIProductEntryPage';
import EditProductPage from './pages/EditProductPage';
import SustainabilityPage from './pages/SustainabilityPage';
import ProtectedRoute from './components/ProtectedRoute';
import AboutPage from './pages/AboutPage';
import ProductFinderPage from './pages/ProductFinderPage';


function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/filter/:filterValue" element={<ProductFilterPage />} />
            <Route path="/products/:filterType/:filterValue" element={<ProductFilterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/sustainability" element={<SustainabilityPage />} />
            <Route path="/find-products" element={<ProductFinderPage />} />
            <Route path="/become-supplier" element={<BecomeSupplierPage />} />
            <Route path="/about" element={<AboutPage/>} />
            {/* Supplier Authentication */}
            <Route path="/supplier/auth" element={<SupplierAuthPage />} />
            
            {/* Protected Supplier Routes */}
            <Route path="/supplier/dashboard" element={
              <ProtectedRoute>
                <SupplierDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/supplier/products" element={
              <ProtectedRoute>
                <SupplierProductsPage />
              </ProtectedRoute>
            } />
            <Route path="/supplier/products/add" element={
              <ProtectedRoute>
                <AddProductPage />
              </ProtectedRoute>
            } />
            <Route path="/supplier/products/edit/:id" element={
              <ProtectedRoute>
                <EditProductPage />
              </ProtectedRoute>
            } />
            <Route path="/supplier/profile" element={
              <ProtectedRoute>
                <SupplierProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/supplier/inquiries" element={
              <ProtectedRoute>
                <SupplierInquiriesPage />
              </ProtectedRoute>
            } />
            {/* New Product Entry Choice and Bulk AI Entry */}
            <Route path="/supplier/add-product" element={<ProductEntryChoice />} />
            <Route path="/add-product/manual" element={<AddProductPage />} />
            <Route path="/add-product/ai" element={<AIProductEntryPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;