import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, X, Leaf, Settings, LogOut, BarChart3, User } from 'lucide-react';
import { isAuthenticated, logoutSupplier } from '../../utils/auth';
import { isUserAuthenticated, logoutUser, getUserData } from '../../utils/userAuth';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [supplierAuthenticated, setSupplierAuthenticated] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      setSupplierAuthenticated(isAuthenticated());
      setUserAuthenticated(isUserAuthenticated());
      
      // Get user data if user is authenticated
      if (isUserAuthenticated()) {
        const data = getUserData();
        setUserData(data);
      } else {
        setUserData(null);
      }
    };
    
    // Check initial auth state
    checkAuth();
    
    // Listen for storage changes (when token is added/removed)
    window.addEventListener('storage', checkAuth);
    
    // Also listen for a custom event we'll dispatch when auth changes
    window.addEventListener('authStateChanged', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authStateChanged', checkAuth);
    };
  }, []);

  // Handle supplier logout
  const handleSupplierLogout = async () => {
    try {
      await logoutSupplier();
      setSupplierAuthenticated(false);
      navigate('/');
    } catch (error) {
      console.error('Supplier logout error:', error);
    }
  };

  // Handle user logout
  const handleUserLogout = async () => {
    try {
      await logoutUser();
      setUserAuthenticated(false);
      setUserData(null);
      navigate('/');
    } catch (error) {
      console.error('User logout error:', error);
    }
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'AI Finder', path: '/find-products' },
    { name: 'Suppliers', path: '/become-supplier' },
    { name: 'Ask B', path: '/sustainability' },
    { name: 'About Us', path: '/about' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg py-3 border-b border-berlin-gray-200' : 'bg-white/95 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/Berlin_Logo.png" 
              alt="Berlin Packaging Logo" 
              className="w-8 h-8 mr-2 rounded-full border border-berlin-gray-300" 
            />
            <span className="text-xl font-bold text-berlin-gray-900">Berlin Packaging</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `text-sm font-semibold transition-colors hover:text-berlin-red-600 ${
                    isActive 
                      ? 'text-berlin-red-600 border-b-2 border-berlin-red-500' 
                      : 'text-berlin-gray-700'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {supplierAuthenticated ? (
              // Supplier is logged in
              <>
                <Button variant="outline" size="sm" href="/supplier/dashboard" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" href="/supplier/profile" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleSupplierLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : userAuthenticated ? (
              // User is logged in
              <>
                <Button variant="outline" size="sm" href="/dashboard" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
                <span className="text-sm text-berlin-gray-600 font-medium">
                  Welcome, {userData?.firstName || 'User'}!
                </span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleUserLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              // No one is logged in
              <>
                <Button variant="outline" size="sm" href="/login">Login</Button>
                <Button variant="primary" size="sm" href="/signup">Sign Up</Button>
                <Button variant="secondary" size="sm" href="/supplier/auth">Supplier Setup</Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-berlin-gray-600 hover:text-berlin-red-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-xl border-t border-berlin-gray-200">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-3 mb-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `py-3 px-4 rounded-lg transition-colors font-medium ${
                      isActive 
                        ? 'bg-berlin-red-50 text-berlin-red-600 border border-berlin-red-200' 
                        : 'text-berlin-gray-700 hover:bg-berlin-gray-50'
                    }`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-col space-y-2">
              {supplierAuthenticated ? (
                // Supplier is logged in
                <>
                  <Button variant="outline" size="sm" href="/supplier/dashboard" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </Button>
                  <Button variant="outline" size="sm" href="/supplier/profile" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleSupplierLogout}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </>
              ) : userAuthenticated ? (
                // User is logged in
                <>
                  <span className="text-sm text-berlin-gray-600 px-4 py-2 font-medium">
                    Welcome, {userData?.firstName || 'User'}!
                  </span>
                  <Button variant="outline" size="sm" href="/dashboard" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleUserLogout}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </>
              ) : (
                // No one is logged in
                <>
                  <Button variant="outline" size="sm" href="/login">Login</Button>
                  <Button variant="primary" size="sm" href="/signup">Sign Up</Button>
                  <Button variant="secondary" size="sm" href="/supplier/auth">Supplier Setup</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search bar - on scrolled state */}
      {/* {isScrolled && (
        <div className="bg-berlin-red-50 py-3 border-t border-berlin-red-100">
          <div className="container mx-auto px-4">
            <SearchBar />
          </div>
        </div>
      )} */}
    </header>
  );
};