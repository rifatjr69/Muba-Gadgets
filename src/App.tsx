import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { ProductPage } from './components/ProductPage';
import { WishlistPage } from './components/WishlistPage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard, getCategoryIconComponent } from './components/AdminDashboard';
import { HeroSlider } from './components/HeroSlider';
import { SqlModal } from './components/SqlModal';
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_BANNERS, MOCK_DELIVERY_ZONES, MOCK_COUPONS } from './data/mockProducts';
import { Product, CartItem, DeliveryZone, Order, Category, enrichProducts } from './types';
import { supabase } from './lib/supabase';
import { Sparkles, ShieldCheck, Truck, RefreshCw, Star, ChevronRight, ChevronLeft, ArrowRight, Zap, Flame, Award, Headphones, Watch, BatteryCharging, AlertTriangle, Package } from 'lucide-react';

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-gray-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-gray-900">কিছু একটা সমস্যা হয়েছে</h2>
            <p className="text-xs text-gray-500">
              {this.state.error?.message || 'অ্যাপ্লিকেশন লোড হতে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#0052FF] text-white font-bold py-3 rounded-xl text-xs shadow hover:bg-blue-700 transition"
            >
              পেজ রিফ্রেশ করুন
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [products, setProducts] = useState<Product[]>(() => enrichProducts(MOCK_PRODUCTS));
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const localSaved = localStorage.getItem('muba_custom_categories');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return MOCK_CATEGORIES;
  });
  const [banners, setBanners] = useState(MOCK_BANNERS);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(MOCK_DELIVERY_ZONES);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone>(MOCK_DELIVERY_ZONES[0]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'home' | 'shop'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'rating'>('default');

  // New routing states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'store' | 'admin' | 'product' | 'wishlist'>(() => {
    try {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path.startsWith('/admin') || search.includes('tab=') || localStorage.getItem('muba_admin_active') === 'true') {
        return 'admin';
      }
      if (path === '/wishlist') return 'wishlist';
      if (path.startsWith('/product/')) return 'product';
    } catch { /* ignore */ }
    return 'store';
  });

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Category slider ref (for desktop arrow buttons)
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategories = (dir: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Sync route on mount and browser back/forward buttons (decoupled from products updates to prevent accidental route resets)
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname;
      const search = window.location.search;

      if (path.startsWith('/product/')) {
        const idOrSlug = decodeURIComponent(path.replace('/product/', '').replace(/\/$/, ''));
        const list = productsRef.current.length > 0 ? productsRef.current : MOCK_PRODUCTS;
        const found = list.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
        if (found) {
          setSelectedProduct(found);
          setView('product');
          return;
        }
      } else if (path === '/wishlist') {
        setView('wishlist');
        setSelectedProduct(null);
        return;
      } else if (path.startsWith('/admin') || search.includes('tab=')) {
        setView('admin');
        setSelectedProduct(null);
        try { localStorage.setItem('muba_admin_active', 'true'); } catch { /* ignore */ }
        return;
      }

      // Check if admin is currently active in session
      try {
        if (localStorage.getItem('muba_admin_active') === 'true' && path === '/') {
          const state = window.history.state;
          if (state?.view !== 'store') {
            setView('admin');
            setSelectedProduct(null);
            return;
          }
        }
      } catch { /* ignore */ }

      setView('store');
      setSelectedProduct(null);
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  const navigateToProduct = (product: Product) => {
    const slug = product.slug || product.id;
    setSelectedProduct(product);
    setView('product');
    window.history.pushState({ view: 'product', id: product.id, slug }, '', `/product/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToWishlist = () => {
    setView('wishlist');
    setSelectedProduct(null);
    window.history.pushState({ view: 'wishlist' }, '', '/wishlist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = () => {
    setView('store');
    setSelectedProduct(null);
    try {
      localStorage.removeItem('muba_admin_active');
    } catch { /* ignore */ }
    window.history.pushState({ view: 'store' }, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = (tab?: string) => {
    let savedTab = tab;
    try {
      if (!savedTab) savedTab = localStorage.getItem('muba_admin_tab') || 'dashboard';
      localStorage.setItem('muba_admin_active', 'true');
      localStorage.setItem('muba_admin_tab', savedTab);
    } catch {
      savedTab = savedTab || 'dashboard';
    }
    setView('admin');
    setSelectedProduct(null);
    window.history.pushState({ view: 'admin', tab: savedTab }, '', `/admin?tab=${savedTab}`);
  };

  // Modals state (Keep for Cart/Auth/Tracking)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false); // Maybe keep this for drawer? Prompt says wishlist page.
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('');

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchSupabaseData = async () => {
    try {
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData && prodData.length > 0) {
        setProducts(enrichProducts(prodData));
      }

      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!catErr && catData && catData.length > 0) {
        setCategories(catData);
        try {
          localStorage.setItem('muba_custom_categories', JSON.stringify(catData));
        } catch { /* ignore */ }
      } else {
        try {
          const localSaved = localStorage.getItem('muba_custom_categories');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCategories(parsed);
            }
          }
        } catch { /* ignore */ }
      }

      const { data: zoneData } = await supabase.from('delivery_zones').select('*');
      if (zoneData && zoneData.length > 0) {
        setDeliveryZones(zoneData);
        setSelectedZone(zoneData[0]);
      }

      const { data: bannerData, error: bannerErr } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!bannerErr && bannerData && bannerData.length > 0) {
        setBanners(bannerData);
      }
    } catch (err) {
      console.log('Using local mock data fallback:', err);
    }
  };

  const handleBannerNavigate = (url: string) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const clean = url.replace(/^\//, '');
    if (clean === 'shop' || clean === '') {
      setActiveTab('shop');
      setSelectedCategory('all');
    } else if (categories.some((c) => c.slug === clean)) {
      setActiveTab('shop');
      setSelectedCategory(clean);
    } else if (clean.includes('category=')) {
      const cat = clean.split('category=')[1]?.split('&')[0];
      setActiveTab('shop');
      setSelectedCategory(cat || 'all');
    } else {
      setActiveTab('shop');
    }
  };

  // Fetch from Supabase on mount
  useEffect(() => {
    fetchSupabaseData();

    try {
      if (supabase && supabase.auth) {
        supabase.auth.getUser().then(({ data }: { data: any }) => {
          if (data?.user) {
            setUser(data.user);
            checkAdminRole(data.user.id);
          }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAdmin(false);
          } else if (session?.user) {
            setUser(session.user);
            checkAdminRole(session.user.id);
          }
        });

        return () => {
          authListener?.subscription?.unsubscribe?.();
        };
      }
    } catch (e) {
      console.log('Auth setup note:', e);
    }
  }, []);

  if (view === 'admin') {
    return (
      <ErrorBoundary>
        <AdminDashboard 
          onClose={navigateToStore} 
          products={products} 
          categories={categories} 
          banners={banners}
          deliveryZones={deliveryZones}
          onRefreshProducts={fetchSupabaseData} 
          onRefreshCategories={fetchSupabaseData}
          onRefreshBanners={fetchSupabaseData}
          onRefreshDeliveryZones={fetchSupabaseData}
        />
      </ErrorBoundary>
    );
  }

  const checkAdminRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data && data.role === 'admin') {
        setIsAdmin(true);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1, variant?: string) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedVariant === variant
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { product, quantity, selectedVariant: variant }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number, variant?: string) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId && item.selectedVariant === variant) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (productId: string, variant?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedVariant === variant)));
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlist(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Filter & Sort Products
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all') {
      const cat = categories.find(c => c.slug === selectedCategory);
      if (cat && p.category_id !== cat.id) return false;
      if (!cat && selectedCategory !== p.category_id) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return (b.rating || 4.8) - (a.rating || 4.8);
    return 0;
  });

  const flashSaleProducts = products.filter(p => p.is_flash_sale);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] text-[#0F172A]">
      
      {/* Navbar */}
      <Navbar
        categories={categories}
        cart={cart}
        wishlist={wishlist}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={navigateToWishlist}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenAdmin={() => navigateToAdmin()}
        products={products}
        onSelectProduct={navigateToProduct}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (view !== 'store') navigateToStore();
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          if (view !== 'store') navigateToStore();
        }}
        user={user}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'product' && selectedProduct ? (
          <ProductPage 
            product={selectedProduct} 
            categoryName={categories.find(c => c.id === selectedProduct.category_id || c.slug === selectedProduct.category_id)?.name}
            onClose={navigateToStore}
            onAddToCart={(p, q, v) => handleAddToCart(p, q, v)}
            onOrderNow={(p, q, v) => { handleAddToCart(p, q, v); setIsCheckoutOpen(true); }}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            relatedProducts={products.filter(p => p.category_id === selectedProduct.category_id && p.id !== selectedProduct.id).slice(0, 4)}
            onSelectProduct={navigateToProduct}
          />
        ) : view === 'wishlist' ? (
          <WishlistPage 
            onClose={navigateToStore} 
            products={products} 
            wishlistIds={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={navigateToProduct}
          />
        ) : activeTab === 'home' && selectedCategory === 'all' ? (
          <div className="space-y-12 pb-16">
            
            {/* Full-width Live Auto-scroll Hero Banner Slider */}
            <HeroSlider banners={banners} onNavigate={handleBannerNavigate} />

            {/* Category Slider Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">জনপ্রিয় ক্যাটাগরি</h2>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">আপনার পছন্দের গ্যাজেট ক্যাটাগরি সিলেক্ট করুন</p>
                </div>

                {/* Desktop arrows */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollCategories('left')}
                    aria-label="আগের ক্যাটাগরি"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-[#0052FF] hover:bg-[#0052FF] hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategories('right')}
                    aria-label="পরের ক্যাটাগরি"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-[#0052FF] hover:bg-[#0052FF] hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Slider track: swipe on mobile, arrows on desktop */}
              <div
                ref={categoryScrollRef}
                className="
                  -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory scroll-smooth
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                  sm:mx-0 sm:gap-4 sm:px-1
                "
              >
                {categories
                  .filter((cat) => cat.is_active !== false)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((cat) => {
                    const IconComp = getCategoryIconComponent(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setActiveTab('shop'); setSelectedCategory(cat.slug); }}
                        className="group flex w-[104px] shrink-0 snap-start flex-col items-center rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#0052FF] hover:shadow-lg cursor-pointer sm:w-[132px] sm:p-4 lg:w-[150px]"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-br from-blue-50 to-indigo-50 text-[#0052FF] shadow-inner transition duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <IconComp className="h-7 w-7 text-[#0052FF] sm:h-8 sm:w-8" />
                          )}
                        </div>
                        <div className="mt-2.5 w-full min-w-0">
                          <h4 className="truncate text-xs font-bold text-gray-900 transition group-hover:text-[#0052FF] sm:text-sm">
                            {cat.name_bn || cat.name}
                          </h4>
                          <p className="mt-0.5 truncate text-[10px] text-gray-400 sm:text-[11px]">{cat.name}</p>
                          {cat.sub_label && (
                            <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-[#0052FF] sm:text-[10px]">
                              {cat.sub_label}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Flash Sale Section */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0B1B4D] via-[#14287A] to-[#0A1236] shadow-xl ring-1 ring-white/10">
                {/* Decorative glow */}
                <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

                {/* Header */}
                <div className="relative px-4 pt-4 pb-3 sm:px-8 sm:pt-7 sm:pb-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-900/40">
                        <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-2xl font-black leading-tight tracking-tight text-white">
                          ফ্ল্যাশ সেল <span className="text-[#00E5FF]">(Flash Sale)</span>
                        </h2>
                        <p className="mt-0.5 text-[11px] sm:text-xs leading-snug text-blue-200/90">
                          সীমিত সময়ের জন্য অবিশ্বাস্য ছাড়ে প্রিমিয়াম গ্যাজেট
                        </p>
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                      <span className="text-[11px] sm:text-xs font-bold text-[#00E5FF] whitespace-nowrap">সময় বাকি</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { v: '১২', l: 'ঘণ্টা' },
                          { v: '৪৫', l: 'মিনিট' },
                          { v: '৩০', l: 'সেকেন্ড' },
                        ].map((t, i) => (
                          <React.Fragment key={t.l}>
                            <div className="flex min-w-[42px] flex-col items-center rounded-lg bg-gradient-to-b from-rose-500 to-rose-700 px-2 py-1 shadow-md">
                              <span className="text-sm sm:text-base font-black leading-none text-white">{t.v}</span>
                              <span className="mt-0.5 text-[8px] sm:text-[9px] font-semibold leading-none text-rose-100">{t.l}</span>
                            </div>
                            {i < 2 && <span className="text-sm font-black text-white/70">:</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products: mobile = horizontal swipe, sm+ = grid */}
                <div className="relative pb-4 sm:px-8 sm:pb-8">
                  <div
                    className="
                      flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-smooth
                      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                      sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none
                      md:grid-cols-4 lg:gap-5 xl:grid-cols-5
                    "
                  >
                    {flashSaleProducts.map((product) => (
                      <div
                        key={product.id}
                        className="w-[calc(50%-6px)] min-w-[calc(50%-6px)] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:shrink"
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={(p) => handleAddToCart(p)}
                          onOrderNow={(p) => {
                            handleAddToCart(p, 1);
                            setIsCheckoutOpen(true);
                          }}
                          onSelectProduct={navigateToProduct}
                          onToggleWishlist={handleToggleWishlist}
                          isWishlisted={wishlist.includes(product.id)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Mobile swipe hint */}
                  {flashSaleProducts.length > 2 && (
                    <p className="mt-2 text-center text-[10px] font-medium text-blue-200/70 sm:hidden">
                      ← আরও দেখতে স্লাইড করুন →
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* All Featured Products */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
                <div>
                  <span className="text-[11px] font-bold tracking-widest text-[#B84040] uppercase block mb-1">
                    MOST COVETED
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                    Featured Products
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('shop')}
                  className="text-xs font-bold text-[#B84040] hover:text-[#9e2a2a] hover:underline flex items-center gap-1 uppercase tracking-wider self-start sm:self-auto"
                >
                  VIEW ALL PRODUCTS <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {products.slice(0, 10).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p)}
                    onOrderNow={(p) => {
                      handleAddToCart(p, 1);
                      setIsCheckoutOpen(true);
                    }}
                    onSelectProduct={navigateToProduct}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(product.id)}
                  />
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Shop / Catalog Tab */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                  {selectedCategory === 'all' ? 'সকল প্রোডাক্ট' : categories.find(c => c.slug === selectedCategory)?.name_bn || 'প্রোডাক্ট কালেকশন'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">সর্বমোট {sortedProducts.length}টি গ্যাজেট উপলব্ধ রয়েছে</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">সর্ট করুন:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
                >
                  <option value="default">ডিফল্ট</option>
                  <option value="price-low">মূল্য: কম থেকে বেশি</option>
                  <option value="price-high">মূল্য: বেশি থেকে কম</option>
                  <option value="rating">সর্বোচ্চ রেটিং</option>
                </select>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট নেই</h3>
                  <p className="text-xs text-gray-500 mt-1">শীঘ্রই নতুন নতুন গ্যাজেট এই ক্যাটাগরিতে যুক্ত করা হবে।</p>
                </div>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-5 py-2.5 rounded-xl bg-[#0052FF] text-white text-xs font-bold shadow-md hover:bg-blue-700 transition cursor-pointer"
                >
                  সব প্রোডাক্ট দেখুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {sortedProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p)}
                    onOrderNow={(p) => {
                      handleAddToCart(p, 1);
                      setIsCheckoutOpen(true);
                    }}
                    onSelectProduct={navigateToProduct}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(product.id)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
      
      {/* Modals */}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        deliveryZones={deliveryZones}
        selectedZone={selectedZone}
        setSelectedZone={setSelectedZone}
        coupons={MOCK_COUPONS}
        onProceedToCheckout={(discount, code) => {
          setCheckoutDiscount(discount);
          setCheckoutCouponCode(code);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCart([]);
        }}
        cart={cart}
        deliveryZone={selectedZone}
        deliveryZones={deliveryZones}
        setSelectedZone={setSelectedZone}
        discountAmount={checkoutDiscount}
        couponCode={checkoutCouponCode}
        onOrderSuccess={() => {}}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        products={products}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          try {
            supabase.auth.getUser().then(({ data }: { data: any }) => {
              if (data?.user) {
                setUser(data.user);
                checkAdminRole(data.user.id);
              }
            });
          } catch (e) {}
        }}
      />

      <SqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}