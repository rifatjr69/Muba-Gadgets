import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag, Search, Heart, User, ShieldCheck, Phone, Menu, X,
  Sparkles, PackageCheck, ChevronRight
} from 'lucide-react';
import { Product, CartItem, Category } from '../types';

interface NavbarProps {
  categories?: Category[];
  cart: CartItem[];
  wishlist: string[];
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAuth: () => void;
  onOpenTracking: () => void;
  onOpenAiAdvisor: () => void;
  onOpenSqlModal: () => void;
  onOpenAdmin: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  activeTab: 'home' | 'shop';
  setActiveTab: (tab: 'home' | 'shop') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  user: any;
  isAdmin: boolean;
}

const HOTLINE = '01887816106';
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ------------------------------------------------------------------ */
/* Search box (desktop + mobile দুই জায়গায় ব্যবহার হয়)                 */
/* ------------------------------------------------------------------ */
const SearchBox: React.FC<{
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder: string;
  className?: string;
}> = ({ products, onSelect, placeholder, className = '' }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // বাইরে ক্লিক বা Esc চাপলে dropdown বন্ধ হবে
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products
      .filter((p) =>
        (p.name || '').toLowerCase().includes(s) ||
        (p.name_bn || '').toLowerCase().includes(s) ||
        (p.short_description || '').toLowerCase().includes(s)
      )
      .slice(0, 6);
  }, [q, products]);

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full h-10 sm:h-11 bg-gray-100 border border-transparent rounded-full pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/40 focus:border-[#0052FF] focus:bg-white transition"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(''); setOpen(false); }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-1.5">
              <p className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                প্রোডাক্ট সাজেশন ({results.length})
              </p>
              {results.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => { onSelect(product); setOpen(false); setQ(''); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 text-left transition border-b border-gray-50 last:border-0"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-11 h-11 object-cover rounded-lg border border-gray-100 bg-gray-50 shrink-0"
                    onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs font-bold text-[#0052FF]">৳{Number(product.price || 0).toLocaleString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-center text-sm text-gray-500">
              কোনো গ্যাজেট পাওয়া যায়নি &quot;{q}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ====================================================================== */
export const Navbar: React.FC<NavbarProps> = ({
  categories,
  cart,
  wishlist,
  onOpenCart,
  onOpenWishlist,
  onOpenAuth,
  onOpenTracking,
  onOpenAiAdvisor,
  onOpenAdmin,
  products,
  onSelectProduct,
  activeTab,
  setActiveTab,
  selectedCategory,
  setSelectedCategory,
  isAdmin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeNavCategories = useMemo(() => {
    return [...(categories || [])]
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isHome = activeTab === 'home' && selectedCategory === 'all';

  const goHome = () => { setActiveTab('home'); setSelectedCategory('all'); };
  const goCategory = (slug: string) => { setActiveTab('shop'); setSelectedCategory(slug); };
  const closeMenu = () => setMobileMenuOpen(false);

  // মোবাইল মেনু খোলা থাকলে ব্যাকগ্রাউন্ড স্ক্রল বন্ধ থাকবে
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  // স্ক্রিন বড় হলে বা Esc চাপলে মেনু বন্ধ
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const Logo = ({ size = 'md' }: { size?: 'md' | 'lg' }) => (
    <span className="flex items-center gap-2.5 text-left">
      <span className={`relative shrink-0 rounded-xl bg-[#0052FF] flex items-center justify-center text-white shadow-md shadow-[#0052FF]/30 ${size === 'lg' ? 'w-11 h-11' : 'w-9 h-9 sm:w-11 sm:h-11'}`}>
        <span className="text-xl sm:text-2xl font-extrabold tracking-tighter leading-none">M</span>
        <span className="absolute -bottom-1 -right-1 bg-[#00E5FF] rounded-full p-0.5 text-blue-950">
          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#00E5FF] text-blue-950" />
        </span>
      </span>
      <span className="leading-tight min-w-0">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-base sm:text-xl font-black text-gray-900 tracking-tight">Muba</span>
          <span className="text-base sm:text-xl font-black text-[#0052FF] tracking-tight">Gadgets</span>
        </span>
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Verified Store <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
      </span>
    </span>
  );

  const iconBtn = 'relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:text-[#0052FF] hover:bg-gray-100 active:bg-gray-200 transition';

  return (
    <>
      {/* ============ Top info bar (স্ক্রলের সাথে উপরে চলে যাবে) ============ */}
      <div className="bg-[#0052FF] text-white text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full font-medium shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" /> 100% Verified Original
            </span>
            <span className="truncate font-medium">⚡ সারা বাংলাদেশে ক্যাশ অন ডেলিভারি</span>
          </div>
          <a href={`tel:${HOTLINE}`} className="flex items-center gap-1 shrink-0 font-semibold hover:text-[#00E5FF] transition">
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden min-[380px]:inline">Hotline:</span> {HOTLINE}
          </a>
        </div>
      </div>

      {/* ============================ Sticky header ============================ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20 gap-2 sm:gap-4">

            {/* Left: Hamburger (mobile) + Logo */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className={`${iconBtn} md:hidden -ml-1.5`}
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={goHome}
                aria-label="Muba Gadgets Home"
                className="group focus:outline-none min-w-0"
              >
                <span className="block group-hover:scale-[1.02] transition-transform origin-left">
                  <Logo />
                </span>
              </button>
            </div>

            {/* Center: Search (desktop) */}
            <div className="hidden md:flex flex-1 max-w-xl">
              <SearchBox
                products={products}
                onSelect={onSelectProduct}
                placeholder="স্মার্টওয়াচ, ইয়ারবাড বা পাওয়ার ব্যাংক খুঁজুন..."
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenAiAdvisor}
                className="hidden lg:inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-[#0052FF] px-3 h-10 rounded-xl text-xs font-bold hover:shadow-md transition"
                title="AI Gadget Recommendation"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI গাইড</span>
              </button>

              <button
                type="button"
                onClick={onOpenTracking}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-10 rounded-xl text-gray-600 hover:text-[#0052FF] hover:bg-gray-100 transition text-xs font-semibold"
                title="অর্ডার ট্র্যাক করুন"
              >
                <PackageCheck className="w-5 h-5" />
                <span className="hidden xl:inline">ট্র্যাকিং</span>
              </button>

              <button type="button" onClick={onOpenWishlist} className={iconBtn} title="পছন্দের তালিকা" aria-label="Wishlist">
                <Heart className="w-[22px] h-[22px]" />
                {wishlist.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow ring-2 ring-white">
                    {wishlist.length > 99 ? '99+' : wishlist.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                aria-label="Cart"
                className="relative inline-flex items-center gap-2 bg-[#0052FF] hover:bg-blue-700 active:bg-blue-800 text-white w-10 h-10 sm:w-auto sm:px-4 justify-center rounded-xl font-bold shadow-md shadow-[#0052FF]/25 transition ml-1"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="hidden sm:inline text-xs">কার্ট</span>
                {totalCartItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#00E5FF] text-blue-950 font-extrabold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow ring-2 ring-white">
                    {totalCartItems > 99 ? '99+' : totalCartItems}
                  </span>
                )}
              </button>

              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    aria-label="Admin panel"
                    className={`${iconBtn} md:hidden !text-purple-700 !bg-purple-50`}
                  >
                    <User className="w-[22px] h-[22px]" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="hidden md:inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 h-10 rounded-xl text-xs font-bold shadow transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">অ্যাডমিন প্যানেল</span>
                    <span className="lg:hidden">অ্যাডমিন</span>
                  </button>
                </>
              ) : (
                <button type="button" onClick={onOpenAuth} className={iconBtn} title="লগইন / একাউন্ট" aria-label="Account">
                  <User className="w-[22px] h-[22px]" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile search row */}
          <div className="pb-2.5 md:hidden">
            <SearchBox
              products={products}
              onSelect={onSelectProduct}
              placeholder="স্মার্টওয়াচ, ইয়ারবাড খুঁজুন..."
            />
          </div>
        </div>

        {/* Desktop category sub-bar */}
        <div className="bg-gray-50 border-t border-gray-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-11 text-sm font-semibold text-gray-700 gap-6">
              <nav className={`flex items-center gap-6 overflow-x-auto whitespace-nowrap h-full ${NO_SCROLLBAR}`}>
                <button
                  type="button"
                  onClick={goHome}
                  className={`h-full border-b-2 transition ${isHome ? 'text-[#0052FF] font-bold border-[#0052FF]' : 'border-transparent hover:text-[#0052FF]'}`}
                >
                  হোম
                </button>
                {activeNavCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id || cat.slug}
                    onClick={() => goCategory(cat.slug)}
                    className={`h-full border-b-2 transition ${selectedCategory === cat.slug ? 'text-[#0052FF] font-bold border-[#0052FF]' : 'border-transparent hover:text-[#0052FF]'}`}
                  >
                    {cat.name_bn || cat.name}
                  </button>
                ))}
              </nav>

              <div className="hidden xl:flex items-center gap-3 text-xs font-bold text-gray-500 shrink-0">
                <span className="flex items-center gap-1 text-[#0052FF]">
                  <Sparkles className="w-3.5 h-3.5" /> ১০০% আসল প্রডাক্ট
                </span>
                <span>•</span>
                <span>৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ Mobile category chips (স্ক্রলের সাথে চলে যাবে) ============ */}
      <div className="md:hidden bg-white border-b border-gray-100">
        <div className={`flex items-center gap-2 overflow-x-auto px-3 py-2.5 ${NO_SCROLLBAR}`}>
          <button
            type="button"
            onClick={goHome}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition ${isHome ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-sm' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            হোম
          </button>
          {activeNavCategories.map((cat) => (
            <button
              type="button"
              key={cat.id || cat.slug}
              onClick={() => goCategory(cat.slug)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition ${selectedCategory === cat.slug ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-sm' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              {cat.name_bn || cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ============================ Mobile drawer ============================ */}
      <div
        className={`md:hidden fixed inset-0 z-[60] ${mobileMenuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0">
            <Logo size="lg" />
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <p className="px-3 pt-1 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">ক্যাটাগরি</p>

            <button
              type="button"
              onClick={() => { goHome(); closeMenu(); }}
              className={`w-full flex items-center justify-between py-3 px-3 rounded-xl text-sm font-semibold transition ${isHome ? 'bg-blue-50 text-[#0052FF] font-bold' : 'text-gray-800 hover:bg-gray-50'}`}
            >
              <span>হোম পেজ (Home)</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            {activeNavCategories.map((cat) => (
              <button
                type="button"
                key={cat.id || cat.slug}
                onClick={() => { goCategory(cat.slug); closeMenu(); }}
                className={`w-full flex items-center justify-between gap-2 py-3 px-3 rounded-xl text-sm font-semibold transition ${selectedCategory === cat.slug ? 'bg-blue-50 text-[#0052FF] font-bold' : 'text-gray-800 hover:bg-gray-50'}`}
              >
                <span className="min-w-0 text-left truncate">
                  {cat.name_bn || cat.name}
                  {cat.name_bn && cat.name && cat.name_bn !== cat.name && (
                    <span className="ml-1.5 text-xs font-medium text-gray-400">({cat.name})</span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
              </button>
            ))}

            <div className="h-px bg-gray-100 my-3" />
            <p className="px-3 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">দ্রুত লিংক</p>

            <button
              type="button"
              onClick={() => { onOpenAiAdvisor(); closeMenu(); }}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-[#0052FF]"
            >
              <Sparkles className="w-5 h-5" /> AI গ্যাজেট এডভাইজর
            </button>
            <button
              type="button"
              onClick={() => { onOpenTracking(); closeMenu(); }}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <PackageCheck className="w-5 h-5 text-gray-500" /> অর্ডার ট্র্যাকিং
            </button>
            <button
              type="button"
              onClick={() => { onOpenWishlist(); closeMenu(); }}
              className="w-full flex items-center justify-between py-3 px-3 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <span className="flex items-center gap-3"><Heart className="w-5 h-5 text-gray-500" /> পছন্দের তালিকা</span>
              {wishlist.length > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">{wishlist.length}</span>
              )}
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => { onOpenAdmin(); closeMenu(); }}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold bg-purple-50 text-purple-700"
              >
                <User className="w-5 h-5" /> অ্যাডমিন প্যানেল
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenAuth(); closeMenu(); }}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <User className="w-5 h-5 text-gray-500" /> লগইন / একাউন্ট
              </button>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 shrink-0 space-y-2.5 bg-gray-50/70">
            <a
              href={`tel:${HOTLINE}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0052FF] text-white text-sm font-bold shadow-md shadow-[#0052FF]/25"
            >
              <Phone className="w-4 h-4" /> কল করুন: {HOTLINE}
            </a>
            <p className="text-center text-[11px] text-gray-500 font-medium">
              ১০০% আসল প্রডাক্ট • ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি
            </p>
          </div>
        </aside>
      </div>
    </>
  );
};