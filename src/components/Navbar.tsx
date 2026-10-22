import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingCart, Search, Heart, User, ShieldCheck, Phone, Menu, X,
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
  user?: any;
  isAdmin: boolean;
  onLogout?: () => void;
}

const HOTLINE = '01887816106';
const MAROON = '#7A1F3D';
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ------------------------------------------------------------------ */
/* Search box                                                          */
/* ------------------------------------------------------------------ */
const SearchBox: React.FC<{
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
}> = ({ products, onSelect, placeholder, autoFocus, className = '' }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-full pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#7A1F3D] focus:bg-white transition"
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
                    <p className="text-xs font-bold" style={{ color: MAROON }}>
                      ৳{Number(product.price || 0).toLocaleString()}
                    </p>
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
  user,
  isAdmin,
  onLogout
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeNavCategories = useMemo(() => {
    return [...(categories || [])]
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isHome = activeTab === 'home' && selectedCategory === 'all';

  const goHome = () => { setActiveTab('home'); setSelectedCategory('all'); };
  const goCategory = (slug: string) => { setActiveTab('shop'); setSelectedCategory(slug); };
  const closeMenu = () => setMenuOpen(false);

  // মেনু খোলা থাকলে ব্যাকগ্রাউন্ড স্ক্রল বন্ধ
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setSearchOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Brand logo
  const Logo = ({ size = 'md' }: { size?: 'md' | 'lg' }) => (
    <span className="flex items-center gap-2 sm:gap-2.5 text-left">
      <span className={`relative shrink-0 rounded-xl bg-[#7A1F3D] flex items-center justify-center text-white shadow-md ${size === 'lg' ? 'w-11 h-11' : 'w-8 h-8 sm:w-10 sm:h-10'}`}>
        <span className="text-lg sm:text-xl font-extrabold tracking-tighter leading-none">M</span>
        <span className="absolute -bottom-1 -right-1 bg-[#5E1630] rounded-full p-0.5 text-white">
          <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-[#7A1F3D]" />
        </span>
      </span>
      <span className="leading-tight min-w-0">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[15px] sm:text-xl font-black text-gray-900 tracking-tight">Muba</span>
          <span className="text-[15px] sm:text-xl font-black text-[#7A1F3D] tracking-tight">Gadgets</span>
        </span>
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-gray-700 uppercase tracking-widest">
          Verified Store <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
      </span>
    </span>
  );

  const iconBtn =
    'relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition';
  const badge =
    'absolute top-0 right-0 text-white text-[10px] font-bold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center';

  return (
    <>
      {/* ============================ Sticky header ============================ */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Left: brand logo */}
            <button
              type="button"
              onClick={goHome}
              aria-label="Muba Gadgets Home"
              className="focus:outline-none min-w-0"
            >
              <Logo />
            </button>

            {/* Right: search / heart / cart / menu */}
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen((s) => !s)}
                aria-label="Search"
                className={iconBtn}
              >
                {searchOpen ? <X className="w-[22px] h-[22px]" strokeWidth={1.6} /> : <Search className="w-[22px] h-[22px]" strokeWidth={1.6} />}
              </button>

              <button type="button" onClick={onOpenWishlist} className={iconBtn} title="পছন্দের তালিকা" aria-label="Wishlist">
                <Heart className="w-[22px] h-[22px]" strokeWidth={1.6} />
                {wishlist.length > 0 && (
                  <span className={badge} style={{ background: MAROON }}>
                    {wishlist.length > 99 ? '99+' : wishlist.length}
                  </span>
                )}
              </button>

              <button type="button" onClick={onOpenCart} aria-label="Cart" className={iconBtn}>
                <ShoppingCart className="w-[22px] h-[22px]" strokeWidth={1.6} />
                {totalCartItems > 0 && (
                  <span className={badge} style={{ background: MAROON }}>
                    {totalCartItems > 99 ? '99+' : totalCartItems}
                  </span>
                )}
              </button>

              {/* Hamburger */}
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className={iconBtn}
              >
                <Menu className="w-6 h-6" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>

        {/* Search panel (সার্চ আইকনে চাপলে নিচে খুলবে) */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-white px-3 sm:px-6 py-3">
            <div className="max-w-2xl mx-auto">
              <SearchBox
                autoFocus
                products={products}
                onSelect={(p) => { onSelectProduct(p); setSearchOpen(false); }}
                placeholder="স্মার্টওয়াচ, ইয়ারবাড বা পাওয়ার ব্যাংক খুঁজুন..."
              />
            </div>
          </div>
        )}

        {/* Desktop category sub-bar */}
        <div className="border-t border-gray-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className={`flex items-center gap-7 overflow-x-auto whitespace-nowrap h-11 text-xs font-bold uppercase tracking-wider text-gray-600 ${NO_SCROLLBAR}`}>
              <button
                type="button"
                onClick={goHome}
                className={`h-full border-b-2 transition ${isHome ? 'border-[#7A1F3D] text-[#7A1F3D]' : 'border-transparent hover:text-[#7A1F3D]'}`}
              >
                হোম
              </button>
              {activeNavCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id || cat.slug}
                  onClick={() => goCategory(cat.slug)}
                  className={`h-full border-b-2 transition ${selectedCategory === cat.slug ? 'border-[#7A1F3D] text-[#7A1F3D]' : 'border-transparent hover:text-[#7A1F3D]'}`}
                >
                  {cat.name_bn || cat.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ============================ Slide-in drawer ============================ */}
      <div
        className={`fixed inset-0 z-[60] ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0">
            <Logo size="lg" />
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <p className="px-3 pt-1 pb-1.5 text-[11px] font-extrabold text-gray-600 uppercase tracking-wider">ক্যাটাগরি</p>

            <button
              type="button"
              onClick={() => { goHome(); closeMenu(); }}
              className={`w-full flex items-center justify-between py-3 px-3 rounded-xl text-sm font-semibold transition ${isHome ? 'bg-rose-50 text-[#7A1F3D] font-bold' : 'text-gray-900 hover:bg-gray-50'}`}
            >
              <span>হোম পেজ (Home)</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            {activeNavCategories.map((cat) => (
              <button
                type="button"
                key={cat.id || cat.slug}
                onClick={() => { goCategory(cat.slug); closeMenu(); }}
                className={`w-full flex items-center justify-between gap-2 py-3 px-3 rounded-xl text-sm font-semibold transition ${selectedCategory === cat.slug ? 'bg-rose-50 text-[#7A1F3D] font-bold' : 'text-gray-900 hover:bg-gray-50'}`}
              >
                <span className="min-w-0 text-left truncate">
                  {cat.name_bn || cat.name}
                  {cat.name_bn && cat.name && cat.name_bn !== cat.name && (
                    <span className="ml-1.5 text-xs font-semibold text-gray-500">({cat.name})</span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
              </button>
            ))}

            <div className="h-px bg-gray-100 my-3" />
            <p className="px-3 pb-1.5 text-[11px] font-extrabold text-gray-600 uppercase tracking-wider">দ্রুত লিংক</p>

            <button
              type="button"
              onClick={() => { onOpenAiAdvisor(); closeMenu(); }}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold bg-rose-50 text-[#7A1F3D]"
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
                <span className="text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center" style={{ background: MAROON }}>
                  {wishlist.length}
                </span>
              )}
            </button>
            <div className="h-px bg-gray-100 my-3" />
            
            {user ? (
              <button
                type="button"
                onClick={() => { onLogout?.(); closeMenu(); }}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
              >
                <User className="w-5 h-5" /> লগ আউট
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenAuth(); closeMenu(); }}
                className="w-full flex items-center gap-4 py-4 px-4 rounded-2xl text-sm font-semibold bg-[#F5EBEB] border border-[#EAD5D5] hover:bg-[#EEDDDC] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-rose-200">
                  <User className="w-5 h-5 text-rose-800" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-gray-900">My Account</span>
                  <span className="text-xs text-rose-900 font-semibold underline">Login / Sign Up</span>
                </div>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => { onOpenAdmin(); closeMenu(); }}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-sm font-semibold bg-purple-50 text-purple-700"
              >
                <User className="w-5 h-5" /> অ্যাডমিন প্যানেল
              </button>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 shrink-0 space-y-2.5 bg-gray-50/70">
            <a
              href={`tel:${HOTLINE}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-white text-sm font-bold"
              style={{ background: MAROON }}
            >
              <Phone className="w-4 h-4" /> কল করুন: {HOTLINE}
            </a>
            <p className="text-center text-[11px] text-gray-500 font-medium">
              ⚡ সারা বাংলাদেশে ক্যাশ অন ডেলিভারি • ১০০% আসল প্রডাক্ট
            </p>
          </div>
        </aside>
      </div>
    </>
  );
};