import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Star, Heart, ShoppingBag, Zap, ShieldCheck,
  Truck, RefreshCw, CheckCircle2, ChevronLeft, ChevronRight, Share2, Check
} from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductPageProps {
  product: Product;
  categoryName?: string;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, variant?: string) => void;
  onOrderNow: (product: Product, quantity: number, variant?: string) => void;
  onToggleWishlist: (productId: string) => void;
  isWishlisted: boolean;
  relatedProducts: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  product,
  categoryName,
  onClose,
  onAddToCart,
  onOrderNow,
  onToggleWishlist,
  isWishlisted,
  relatedProducts,
  onSelectProduct
}) => {
  /* ---------------------------- Image gallery ---------------------------- */
  const imageList = React.useMemo(() => {
    const list: string[] = [];
    if (product.images && product.images.length > 0) {
      list.push(...product.images);
    } else if (product.image_url) {
      list.push(product.image_url);
    }
    // ডুপ্লিকেট ছবি বাদ দেওয়া হচ্ছে
    return Array.from(new Set(list.filter(Boolean)));
  }, [product.images, product.image_url]);

  const [activeIdx, setActiveIdx] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);

  const total = imageList.length;
  const selectedImage = imageList[activeIdx] || product.image_url;

  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      setActiveIdx(((i % total) + total) % total);
    },
    [total]
  );
  const goNext = useCallback(() => goTo(activeIdx + 1), [goTo, activeIdx]);
  const goPrev = useCallback(() => goTo(activeIdx - 1), [goTo, activeIdx]);

  // একটিভ থাম্বনেইল স্ক্রল করে দেখানো (শুধু স্ট্রিপের ভেতরে, পুরো পেজ নড়বে না)
  useEffect(() => {
    const el = thumbRefs.current[activeIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIdx]);

  // কিবোর্ড অ্যারো দিয়ে ছবি পরিবর্তন
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // মোবাইলে সোয়াইপ
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) < 40) return;
    if (diff < 0) goNext(); else goPrev();
  };

  /* ------------------------------- State -------------------------------- */
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors && product.colors.length > 0 ? product.colors[0] : ''
  );
  const [selectedVariantVariant, setSelectedVariantVariant] = useState<string>(
    product.variants && product.variants.length > 0 ? product.variants[0].value : ''
  );

  const selectedVariant = React.useMemo(() => {
    const parts = [];
    if (product.enable_size && selectedSize) parts.push(`Size: ${selectedSize}`);
    if (product.enable_color && selectedColor) parts.push(`Color: ${selectedColor}`);
    if (parts.length > 0) return parts.join(', ');
    if (product.variants && product.variants.length > 0) return selectedVariantVariant;
    return '';
  }, [product, selectedSize, selectedColor, selectedVariantVariant]);

  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews' | 'shipping'>('desc');
  const [copied, setCopied] = useState(false);

  // প্রোডাক্ট বদলালে সব রিসেট
  useEffect(() => {
    setActiveIdx(0);
    setQuantity(1);
    if (product.sizes && product.sizes.length > 0) setSelectedSize(product.sizes[0]);
    if (product.colors && product.colors.length > 0) setSelectedColor(product.colors[0]);
    if (product.variants && product.variants.length > 0) setSelectedVariantVariant(product.variants[0].value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Pricing & discount
  const oldPrice = product.old_price && product.old_price > product.price
    ? product.old_price
    : Math.round(product.price * 1.35);
  const saveAmount = Math.max(0, oldPrice - product.price);
  const savePercent = oldPrice > 0 ? Math.round((saveAmount / oldPrice) * 100) : 0;

  const sku = `MG-${product.id.replace('prod-', '880')}`;
  const reviewCount = product.review_count ?? 28;
  const ratingScore = product.rating ?? 4.9;

  const handleCopyLink = () => {
    try { navigator.clipboard.writeText(window.location.href); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-16 text-slate-900 overflow-x-hidden">
      <style>{`
        .pp-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .pp-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* Top: Back Link & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/80">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#0052FF] transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-[#0052FF] group-hover:bg-blue-50 transition">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-600 group-hover:text-[#0052FF]" />
            </div>
            <span>Back to Products</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
            <button onClick={onClose} className="hover:text-[#0052FF] transition text-slate-500 shrink-0">Home</button>
            <span>/</span>
            <span className="text-slate-500 font-semibold uppercase tracking-wider shrink-0">
              {categoryName || 'Smart Gadgets'}
            </span>
            <span>/</span>
            <span className="text-slate-800 font-medium truncate">{product.name}</span>
          </div>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">

          {/* ============================ GALLERY ============================ */}
          <div className="lg:col-span-6 min-w-0 lg:sticky lg:top-6 self-start">
            <div className="w-full max-w-[640px] mx-auto lg:mx-0 space-y-3">

              {/* Main image: সবসময় স্কয়ার, ছবি যত লম্বা/চওড়া হোক ফ্রেমের ভেতরেই থাকবে */}
              <div
                className="relative w-full aspect-square bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden group select-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {/* Badges */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col gap-1.5 items-start">
                  <span className="bg-[#0052FF] text-white text-[10px] sm:text-[11px] font-extrabold px-2.5 sm:px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Original
                  </span>
                  {product.badge && (
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Share */}
                <button
                  onClick={handleCopyLink}
                  title="Share product"
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0052FF] shadow-sm transition cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>

                <img
                  key={selectedImage}
                  src={selectedImage}
                  alt={product.name}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain p-4 sm:p-8 transition-transform duration-500 lg:group-hover:scale-105"
                />

                {/* Prev / Next arrows */}
                {total > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous image"
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-[#0052FF] transition cursor-pointer lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next image"
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-[#0052FF] transition cursor-pointer lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Counter */}
                    <span className="absolute bottom-3 right-3 z-10 bg-slate-900/70 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {activeIdx + 1} / {total}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails: ছবির নিচে এক সারিতে, বেশি হলে পাশে স্ক্রল হবে (পেজ লম্বা হবে না) */}
              {total > 1 && (
                <div className="pp-no-scrollbar flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
                  {imageList.map((img, index) => {
                    const isActive = index === activeIdx;
                    return (
                      <button
                        key={img + index}
                        ref={(el) => { thumbRefs.current[index] = el; }}
                        type="button"
                        onClick={() => setActiveIdx(index)}
                        aria-label={`Image ${index + 1}`}
                        className={`snap-start shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] lg:w-20 lg:h-20 rounded-2xl overflow-hidden border-2 bg-white p-1 transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'border-[#0052FF] ring-2 ring-blue-100 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          loading="lazy"
                          draggable={false}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ============================ DETAILS ============================ */}
          <div className="lg:col-span-6 min-w-0 flex flex-col space-y-4">

            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#0052FF]">
              {categoryName || 'PREMIUM SMART GADGETS'}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug break-words">
              {product.name}
            </h1>
            {product.name_bn && (
              <p className="text-sm font-semibold text-slate-500 -mt-1">{product.name_bn}</p>
            )}

            {/* SKU & Rating */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 pt-1">
              <span className="bg-slate-100 font-bold text-slate-700 px-2.5 py-1 rounded-md">SKU: {sku}</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(ratingScore) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="font-bold text-slate-700 ml-1">{ratingScore}</span>
                <span className="text-slate-400 font-medium">({reviewCount} reviews)</span>
              </div>
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock ({product.stock ?? 50})
              </span>
            </div>

            <div className="border-t border-slate-200/90 pt-3" />

            {/* Pricing */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#0052FF] tracking-tight">
                ৳{product.price.toLocaleString()}
              </span>
              {oldPrice > product.price && (
                <span className="text-lg sm:text-xl text-slate-400 line-through font-semibold">
                  ৳{oldPrice.toLocaleString()}
                </span>
              )}
              {saveAmount > 0 && (
                <span className="bg-rose-50 text-rose-600 border border-rose-200/80 font-black text-xs px-3 py-1 rounded-full shadow-sm">
                  SAVE {savePercent}% (৳{saveAmount.toLocaleString()})
                </span>
              )}
            </div>

            <div className="border-t border-slate-200/90 pt-1" />

            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {product.short_description || product.description || 'Experience cutting-edge build quality, certified authentic hardware, and exceptional durability designed for daily active lifestyle.'}
            </p>

            {/* Size */}
            {product.enable_size && product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Size ({selectedSize}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color */}
            {product.enable_color && product.colors && product.colors.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Color ({selectedColor}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        selectedColor === col
                          ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy variants */}
            {!product.enable_size && !product.enable_color && product.variants && product.variants.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Option / Color:</span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantVariant(v.value)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        selectedVariantVariant === v.value
                          ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {v.name}: {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center border-2 border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden h-12 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 hover:bg-slate-100 text-slate-700 font-bold text-base transition h-full flex items-center justify-center cursor-pointer active:bg-slate-200"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 font-black text-slate-900 text-center min-w-[42px] text-sm select-none">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3.5 hover:bg-slate-100 text-slate-700 font-bold text-base transition h-full flex items-center justify-center cursor-pointer active:bg-slate-200"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOrderNow(product, quantity, selectedVariant)}
                className="flex-1 min-w-[140px] bg-[#B84040] hover:bg-[#9d3434] active:scale-[0.98] text-white font-extrabold h-12 px-6 rounded-2xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 text-sm sm:text-base transition cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Order Now</span>
              </button>

              <button
                type="button"
                onClick={() => onAddToCart(product, quantity, selectedVariant)}
                className="flex-1 sm:flex-initial min-w-[130px] bg-blue-50 hover:bg-blue-100 text-[#0052FF] border border-blue-200 font-extrabold h-12 px-5 rounded-2xl flex items-center justify-center gap-2 text-sm transition cursor-pointer active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                className={`w-12 h-12 rounded-2xl border-2 transition flex items-center justify-center shrink-0 cursor-pointer ${
                  isWishlisted
                    ? 'border-rose-400 bg-rose-50 text-rose-600 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
              </button>
            </div>

            {/* Perks */}
            <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-indigo-50/70 border border-blue-100/90 rounded-2xl p-4 sm:p-5 mt-4 space-y-3">
              {[
                { icon: <Truck className="w-4 h-4" />, text: 'Fast Delivery inside Dhaka (24-48 hrs)' },
                { icon: <RefreshCw className="w-4 h-4" />, text: '7 Days Return Policy' },
                { icon: <ShieldCheck className="w-4 h-4" />, text: 'Cash on Delivery Available' },
              ].map((p) => (
                <div key={p.text} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800">
                  <div className="w-8 h-8 rounded-xl bg-white border border-blue-200/80 flex items-center justify-center text-[#0052FF] shrink-0">
                    {p.icon}
                  </div>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 sm:mt-14 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="pp-no-scrollbar border-b border-slate-200 px-5 sm:px-8 flex gap-6 sm:gap-10 overflow-x-auto">
            {([
              ['desc', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', `Reviews (${reviewCount})`],
              ['shipping', 'Shipping & Returns'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 text-sm font-extrabold tracking-wide transition border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === id
                    ? 'border-[#0052FF] text-[#0052FF]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-10">
            {activeTab === 'desc' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Product Overview</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line break-words">
                    {product.description || 'This authentic gadget offers high precision engineering, robust build standards, and high efficiency battery life. Tested and verified directly by Muba Gadgets for top customer satisfaction.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="font-extrabold text-xs text-[#0052FF] uppercase tracking-wider">High Durability</span>
                    <p className="text-xs text-slate-600">Built with impact-resistant premium composite alloy and scratch proof coating.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="font-extrabold text-xs text-[#0052FF] uppercase tracking-wider">Quality Verified</span>
                    <p className="text-xs text-slate-600">Double QC tested before parcel packing to ensure 100% zero factory defects.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-3xl overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <tbody>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-700 w-1/3">Brand</td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">Muba Official Verified</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3.5 px-4 font-bold text-slate-700">Model / SKU</td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">{sku}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-700">Category</td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">{categoryName || 'Smart Gadget'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-3.5 px-4 font-bold text-slate-700">Stock Availability</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">{product.stock ?? 50} Units Available</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-700">Warranty</td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">7 Days Replacement Warranty &amp; 1 Year Service Warranty</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-slate-700">Box Contents</td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">1x Gadget Unit, Charging Cable, User Manual, Warranty Card</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black text-slate-900">{ratingScore}</div>
                    <div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Based on {reviewCount} customer ratings</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold">
                    ✓ 100% Verified Purchases
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {[
                    { n: 'Tanvir Ahmed', d: '2 days ago', t: 'অরিজিনাল প্রোডাক্ট পেয়েছি। ডেলিভারি খুব ফাস্ট ছিল এবং প্যাকেজিং খুব সিকিউর ছিল। ধন্যবাদ মুবা গ্যাজেটস!' },
                    { n: 'Mahmudul Hasan', d: '5 days ago', t: 'Product quality is outstanding according to price. Cash on delivery was seamless in Mirpur.' },
                  ].map((r) => (
                    <div key={r.n} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{r.n}</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Verified Buyer</span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{r.d}</span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600">{r.t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4 max-w-3xl text-sm text-slate-700 leading-relaxed">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-2">
                  <h4 className="font-black text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#0052FF]" /> Delivery Information &amp; Shipping Rates
                  </h4>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 text-slate-600 pl-1">
                    <li><strong>Inside Dhaka City:</strong> ৳60 (Delivered within 24 to 48 hours).</li>
                    <li><strong>Sub-Dhaka (Savar, Gazipur, Narayanganj):</strong> ৳100 (2-3 business days).</li>
                    <li><strong>Outside Dhaka (Nationwide):</strong> ৳130 (3-5 business days via Steadfast/SA Paribahan).</li>
                    <li><strong>Cash on Delivery:</strong> Pay only when you inspect the parcel at your doorstep.</li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-2">
                  <h4 className="font-black text-slate-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#0052FF]" /> 7 Days Replacement &amp; Return Policy
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600">
                    If there is any manufacturing defect, damage during transit, or mismatch, simply contact our hotline at <strong>01887816106</strong> within 7 days of receiving the parcel. We will arrange a replacement or complete refund.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-14 sm:mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Related Products</h2>
                <p className="text-xs text-slate-500">
                  More trending gadgets from {categoryName || 'this category'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  product={relProduct}
                  onAddToCart={(p) => onAddToCart(p, 1)}
                  onOrderNow={(p) => { if (onSelectProduct) onSelectProduct(p); }}
                  onSelectProduct={(p) => { if (onSelectProduct) onSelectProduct(p); }}
                  onToggleWishlist={onToggleWishlist}
                  isWishlisted={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Purchase Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 z-30 flex items-center justify-between gap-3 shadow-xl">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{product.name}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-[#0052FF]">৳{product.price.toLocaleString()}</span>
            {oldPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">৳{oldPrice.toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onAddToCart(product, quantity, selectedVariant)}
            className="bg-blue-50 text-[#0052FF] border border-blue-200 font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cart</span>
          </button>
          <button
            onClick={() => onOrderNow(product, quantity, selectedVariant)}
            className="bg-[#B84040] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-red-500/20 flex items-center gap-1.5 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Order Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;