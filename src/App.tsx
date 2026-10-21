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
import { Product, CartItem, DeliveryZone, Category, enrichProducts } from './types';
import { supabase } from './lib/supabase';
import { ArrowRight, Flame, AlertTriangle, Package } from 'lucide-react';

// ---- Theme (HELLO-style maroon) ----
const MAROON = '#7A1F3D';
const MAROON_DARK = '#5E1630';
const PINK_SOFT = '#FCE8EC';

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
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
              className="w-full text-white font-bold py-3 rounded-xl text-xs shadow transition hover:opacity-90"
              style={{ background: MAROON }}
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

  // Routing states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [checkoutSession, setCheckoutSession] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'store' | 'admin' | 'product' | 'wishlist' | 'not-found'>('store');

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Category slider (scroll + progress bar)
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [catProgress, setCatProgress] = useState({ width: 100, left: 0 });

  const updateCatProgress = () => {
    const el = categoryScrollRef.current;
    if (!el || el.scrollWidth <= 0) return;
    const width = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    const left = (el.scrollLeft / el.scrollWidth) * 100;
    setCatProgress({ width, left });
  };

  const scrollCategories = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (atEnd) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    updateCatProgress();
    window.addEventListener('resize', updateCatProgress);
    return () => window.removeEventListener('resize', updateCatProgress);
  }, [categories, view, activeTab, selectedCategory, isInitialLoading]);

  // Sync route on mount and browser back/forward buttons
  useEffect(() => {
    const syncRouteFromUrl = async () => {
      setIsInitialLoading(true);
      const path = window.location.pathname;
      const search = window.location.search;

      if (path.startsWith('/product/')) {
        const idOrSlug = decodeURIComponent(path.replace('/product/', '').replace(/\/$/, ''));
        const found = productsRef.current.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
        setSelectedProduct(found || null);
        setView('product');
        return;
      } else if (path === '/wishlist') {
        setView('wishlist');
        setSelectedProduct(null);
        document.title = 'Wishlist';
      } else if (path.startsWith('/admin') || search.includes('tab=')) {
        setView('admin');
        setSelectedProduct(null);
        document.title = 'Admin Panel';
        try { localStorage.setItem('muba_admin_active', 'true'); } catch { /* ignore */ }
      } else {
        setView('store');
        setSelectedProduct(null);
        document.title = 'Muba Store';
      }
      setIsInitialLoading(false);
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  useEffect(() => {
    if (view !== 'product') return;
    const path = window.location.pathname;
    if (!path.startsWith('/product/')) return;
    const slug = decodeURIComponent(path.replace('/product/', '').replace(/\/$/, ''));
    const found = products.find((p) => p.slug === slug || p.id === slug);
    if (found) {
      if (selectedProduct?.id !== found.id) setSelectedProduct(found);
      document.title = found.name;
    }
  }, [products, productsLoaded, view]);

  const navigateToProduct = (product: Product) => {
    const slug = product.slug || product.id;
    setSelectedProduct(product);
    setView('product');
    document.title = `${product.name}`;
    window.history.pushState({ view: 'product', id: product.id, slug }, '', `/product/${slug}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
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
    } finally {
      setProductsLoaded(true);
      setIsInitialLoading(false);
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

  const handleOrderNow = (p: Product, q = 1, v?: string) => {
    setBuyNowItem({ product: p, quantity: q, selectedVariant: v });
    setCheckoutDiscount(0);
    setCheckoutCouponCode('');
    setCheckoutSession((s) => s + 1);
    setIsCheckoutOpen(true);
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1, variant?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant === variant
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
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.selectedVariant === variant) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (productId: string, variant?: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedVariant === variant)));
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Filter & Sort Products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.slug === selectedCategory);
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

  const flashSaleProducts = products.filter((p) => p.is_flash_sale);

  // Loading/Not Found States
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: MAROON }}
        ></div>
      </div>
    );
  }

  if (view === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-gray-900 mb-4">404 - Page Not Found</h1>
        <button
          onClick={navigateToStore}
          className="text-white px-6 py-2 rounded-xl font-bold"
          style={{ background: MAROON }}
        >
          Go Home
        </button>
      </div>
    );
  }

  const sortedCategories = categories
    .filter((cat) => cat.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Main Content Area
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1A1A1A] overflow-x-hidden">
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

      <main className="flex-1">
        {view === 'product' && selectedProduct ? (
          <ProductPage
            product={selectedProduct}
            categoryName={categories.find((c) => c.id === selectedProduct.category_id || c.slug === selectedProduct.category_id)?.name}
            onClose={navigateToStore}
            onAddToCart={(p, q, v) => handleAddToCart(p, q, v)}
            onOrderNow={(p, q, v) => handleOrderNow(p, q, v)}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            relatedProducts={products.filter((p) => p.category_id === selectedProduct.category_id && p.id !== selectedProduct.id).slice(0, 4)}
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
          <div className="space-y-10 pb-16 sm:space-y-14">

            {/* Hero Banner */}
            <HeroSlider banners={banners} onNavigate={handleBannerNavigate} />

            {/* Shop By Category */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-[22px] sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                  Shop By Category
                </h2>
                <button
                  type="button"
                  onClick={scrollCategories}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition hover:opacity-80"
                  style={{ background: PINK_SOFT, color: MAROON }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Slide
                </button>
              </div>

              <div
                ref={categoryScrollRef}
                onScroll={updateCatProgress}
                className="
                  -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 snap-x snap-mandatory scroll-smooth
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                  sm:mx-0 sm:gap-8 sm:px-1
                "
              >
                {sortedCategories.map((cat) => {
                  const IconComp = getCategoryIconComponent(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setActiveTab('shop'); setSelectedCategory(cat.slug); }}
                      className="group flex w-[92px] shrink-0 snap-start flex-col items-center text-center cursor-pointer sm:w-[130px]"
                    >
                      <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-2.5 transition duration-300 group-hover:border-[#7A1F3D] group-hover:bg-[#E3EAFB] sm:h-[120px] sm:w-[120px] sm:p-4">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconComp className="h-9 w-9 text-gray-700 sm:h-12 sm:w-12" />
                        )}
                      </div>
                      <h4 className="mt-3 w-full text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#1A1A1A] sm:text-sm">
                        {cat.name}
                      </h4>
                    </button>
                  );
                })}
              </div>

              {/* Scroll progress bar */}
              <div className="mx-auto mt-4 h-[3px] w-24 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="relative h-full rounded-full transition-[margin,width] duration-150"
                  style={{
                    width: `${catProgress.width}%`,
                    marginLeft: `${catProgress.left}%`,
                    background: MAROON,
                  }}
                />
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
                  className="flex w-full max-w-sm items-center justify-center gap-2 rounded-sm border bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] transition hover:text-white sm:text-sm"
                  style={{ borderColor: MAROON, color: MAROON }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = MAROON; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  View All Categories <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Flash Sale (only when products exist) */}
            {flashSaleProducts.length > 0 && (
              <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div
                  className="relative overflow-hidden rounded-2xl shadow-xl sm:rounded-3xl"
                  style={{ background: `linear-gradient(135deg, ${MAROON_DARK}, ${MAROON} 55%, #3D0B20)` }}
                >
                  <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-rose-300/20 blur-3xl" />

                  <div className="relative px-4 pt-4 pb-3 sm:px-8 sm:pt-7 sm:pb-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                          <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-2xl font-black leading-tight tracking-tight text-white">
                            ফ্ল্যাশ সেল <span className="text-rose-200">(Flash Sale)</span>
                          </h2>
                          <p className="mt-0.5 text-[11px] sm:text-xs leading-snug text-rose-100/90">
                            সীমিত সময়ের জন্য অবিশ্বাস্য ছাড়ে প্রিমিয়াম গ্যাজেট
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                        <span className="text-[11px] sm:text-xs font-bold text-rose-100 whitespace-nowrap">সময় বাকি</span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { v: '১২', l: 'ঘণ্টা' },
                            { v: '৪৫', l: 'মিনিট' },
                            { v: '৩০', l: 'সেকেন্ড' },
                          ].map((t, i) => (
                            <React.Fragment key={t.l}>
                              <div className="flex min-w-[42px] flex-col items-center rounded-lg bg-white px-2 py-1 shadow-md">
                                <span className="text-sm sm:text-base font-black leading-none" style={{ color: MAROON }}>{t.v}</span>
                                <span className="mt-0.5 text-[8px] sm:text-[9px] font-semibold leading-none text-gray-500">{t.l}</span>
                              </div>
                              {i < 2 && <span className="text-sm font-black text-white/70">:</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

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
                            onOrderNow={(p) => navigateToProduct(p)}
                            onSelectProduct={navigateToProduct}
                            onToggleWishlist={handleToggleWishlist}
                            isWishlisted={wishlist.includes(product.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {flashSaleProducts.length > 2 && (
                      <p className="mt-2 text-center text-[10px] font-medium text-rose-100/70 sm:hidden">
                        ← আরও দেখতে স্লাইড করুন →
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Featured Products */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-[22px] sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                  Featured Products
                </h2>
                <button
                  onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
                  className="flex shrink-0 items-center gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider hover:underline"
                  style={{ color: MAROON }}
                >
                  View All Products <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {products.slice(0, 10).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p)}
                    onOrderNow={(p) => navigateToProduct(p)}
                    onSelectProduct={navigateToProduct}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(product.id)}
                  />
                ))}
              </div>
            </section>

          </div>
        ) : (
          /* Shop / Catalog Tab */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
              <div>
                <h1 className="text-[22px] sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                  {selectedCategory === 'all'
                    ? 'সকল প্রোডাক্ট'
                    : categories.find((c) => c.slug === selectedCategory)?.name_bn || 'প্রোডাক্ট কালেকশন'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">সর্বমোট {sortedProducts.length}টি গ্যাজেট উপলব্ধ রয়েছে</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">সর্ট করুন:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-sm px-4 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#7A1F3D]"
                >
                  <option value="default">ডিফল্ট</option>
                  <option value="price-low">মূল্য: কম থেকে বেশি</option>
                  <option value="price-high">মূল্য: বেশি থেকে কম</option>
                  <option value="rating">সর্বোচ্চ রেটিং</option>
                </select>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="rounded-2xl p-12 text-center border border-gray-100 space-y-4">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: PINK_SOFT, color: MAROON }}
                >
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট নেই</h3>
                  <p className="text-xs text-gray-500 mt-1">শীঘ্রই নতুন নতুন গ্যাজেট এই ক্যাটাগরিতে যুক্ত করা হবে।</p>
                </div>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-6 py-2.5 rounded-sm text-white text-xs font-bold uppercase tracking-wider transition hover:opacity-90 cursor-pointer"
                  style={{ background: MAROON }}
                >
                  সব প্রোডাক্ট দেখুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p)}
                    onOrderNow={(p) => navigateToProduct(p)}
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
          setBuyNowItem(null);
          setCheckoutSession((s) => s + 1);
          setCheckoutDiscount(discount);
          setCheckoutCouponCode(code);
          setIsCheckoutOpen(true);
        }}
      />

      {isCheckoutOpen && (
        <CheckoutModal
          key={checkoutSession}
          isOpen={true}
          onClose={() => {
            setIsCheckoutOpen(false);
            if (buyNowItem) setBuyNowItem(null);
            else setCart([]);
          }}
          cart={buyNowItem ? [buyNowItem] : cart}
          deliveryZone={selectedZone}
          deliveryZones={deliveryZones}
          setSelectedZone={setSelectedZone}
          discountAmount={checkoutDiscount}
          couponCode={checkoutCouponCode}
          onOrderSuccess={() => {}}
        />
      )}

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