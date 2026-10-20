import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ShoppingBag, Star, ShieldCheck, Truck, RefreshCw, Zap, Minus, Plus,
  ChevronLeft, ChevronRight, BadgeCheck, PackageX
} from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, variant?: string) => void;
  onBuyNow: (product: Product, quantity: number, variant?: string) => void;
}

const fmt = (n: number) => '৳' + Math.round(n || 0).toLocaleString('en-US');

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow
}) => {
  const images = useMemo(
    () => (product.images && product.images.length > 0 ? product.images : [product.image_url]),
    [product]
  );

  const [imgIndex, setImgIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors && product.colors.length > 0 ? product.colors[0] : ''
  );
  const [selectedVariantVariant, setSelectedVariantVariant] = useState<string>(
    product.variants && product.variants.length > 0 ? product.variants[0].value : ''
  );

  const selectedVariant = useMemo(() => {
    const parts = [];
    if (product.enable_size && selectedSize) parts.push(`Size: ${selectedSize}`);
    if (product.enable_color && selectedColor) parts.push(`Color: ${selectedColor}`);
    if (parts.length > 0) return parts.join(', ');
    if (product.variants && product.variants.length > 0) return selectedVariantVariant;
    return '';
  }, [product, selectedSize, selectedColor, selectedVariantVariant]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  // Esc চাপলে বন্ধ হবে, আর মডাল খোলা থাকলে পেছনের পেজ স্ক্রল হবে না
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const stock = typeof product.stock === 'number' ? product.stock : 25;
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);

  const oldPrice = product.old_price && product.old_price > product.price ? product.old_price : 0;
  const saveAmount = oldPrice ? oldPrice - product.price : 0;
  const discountPct =
    product.discount_percent && product.discount_percent > 0
      ? product.discount_percent
      : oldPrice
        ? Math.round((saveAmount / oldPrice) * 100)
        : 0;

  const goPrev = () => setImgIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setImgIndex((i) => (i + 1) % images.length);

  const handleAdd = () => {
    if (outOfStock) return;
    onAddToCart(product, quantity, selectedVariant);
    onClose();
  };
  const handleBuy = () => {
    if (outOfStock) return;
    onBuyNow(product, quantity, selectedVariant);
    onClose();
  };

  const ActionButtons: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="h-12 rounded-2xl border-2 border-blue-600 bg-white text-blue-600 hover:bg-blue-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-[13px] sm:text-sm flex items-center justify-center gap-2 transition"
      >
        <ShoppingBag className="w-4 h-4" /> কার্টে যোগ করুন
      </button>
      <button
        type="button"
        onClick={handleBuy}
        disabled={outOfStock}
        className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[13px] sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
      >
        <Zap className="w-4 h-4 text-cyan-300" /> এখনই অর্ডার করুন
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full sm:max-w-5xl max-h-[94vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="বন্ধ করুন"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-slate-200 text-slate-700 shadow-sm flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-6 md:gap-10 p-4 sm:p-6 md:p-8">

            {/* ================= Left: Gallery ================= */}
            <div className="space-y-4 min-w-0">
              <div className="relative group aspect-square sm:aspect-[5/4] md:aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <img
                  key={images[imgIndex]}
                  src={images[imgIndex]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-2 sm:p-4 transition-transform duration-500 group-hover:scale-105"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                  {discountPct > 0 && (
                    <span className="bg-rose-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md">
                      -{discountPct}% ছাড়
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-white/95 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-blue-100">
                    <BadgeCheck className="w-3.5 h-3.5" /> ১০০% অরিজিনাল
                  </span>
                </div>

                {/* Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="আগের ছবি"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="পরের ছবি"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {imgIndex + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {images.map((img, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setImgIndex(index)}
                      className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl overflow-hidden border-2 bg-white shrink-0 transition ${
                        imgIndex === index
                          ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust badges (ডেস্কটপে এখানে) */}
              <div className="hidden md:grid grid-cols-3 gap-2.5">
                {[
                  { icon: <ShieldCheck className="w-5 h-5" />, t: 'ভেরিফাইড', s: '১০০% অরিজিনাল' },
                  { icon: <Truck className="w-5 h-5" />, t: 'ক্যাশ অন ডেলিভারি', s: 'সারা বাংলাদেশে' },
                  { icon: <RefreshCw className="w-5 h-5" />, t: '৭ দিন', s: 'রিপ্লেসমেন্ট গ্যারান্টি' },
                ].map((b) => (
                  <div key={b.t} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                    <div className="w-9 h-9 mx-auto rounded-xl bg-white text-blue-600 shadow-sm flex items-center justify-center mb-1.5">{b.icon}</div>
                    <p className="text-[12px] font-extrabold text-slate-900 leading-tight">{b.t}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">{b.s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= Right: Info ================= */}
            <div className="flex flex-col min-w-0">
              <div className="space-y-5">

                {/* Badge + rating */}
                <div className="flex items-center gap-2 flex-wrap pr-12 md:pr-0">
                  <span className="bg-blue-100 text-blue-700 font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wide">
                    {product.badge || 'Official Gadget'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {product.rating || 4.8}
                    <span className="text-slate-400 font-semibold">({product.review_count || 45} রিভিউ)</span>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 leading-snug">
                  {product.name}
                </h1>

                {/* Price card */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4">
                  <div className="flex items-end flex-wrap gap-x-3 gap-y-1">
                    <span className="text-3xl sm:text-4xl font-black text-blue-600 leading-none">{fmt(product.price)}</span>
                    {oldPrice > 0 && (
                      <span className="text-base text-slate-400 line-through font-bold leading-none pb-0.5">{fmt(oldPrice)}</span>
                    )}
                    {saveAmount > 0 && (
                      <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                        সাশ্রয় {fmt(saveAmount)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    {outOfStock ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
                        <PackageX className="w-4 h-4" /> স্টক শেষ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        স্টকে আছে ({stock} পিস)
                      </span>
                    )}
                  </div>
                </div>

                {/* Size Variation */}
                {product.enable_size && product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">
                      সাইজ নির্বাচন করুন:{' '}
                      <span className="text-blue-600 normal-case tracking-normal">{selectedSize}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((sz) => {
                        const active = selectedSize === sz;
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-[48px] px-3.5 h-10 rounded-xl text-xs font-bold border-2 transition ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Color Variation */}
                {product.enable_color && product.colors && product.colors.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">
                      কালার নির্বাচন করুন:{' '}
                      <span className="text-blue-600 normal-case tracking-normal">{selectedColor}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((col) => {
                        const active = selectedColor === col;
                        return (
                          <button
                            type="button"
                            key={col}
                            onClick={() => setSelectedColor(col)}
                            className={`min-w-[48px] px-3.5 h-10 rounded-xl text-xs font-bold border-2 transition ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legacy Variants fallback */}
                {!product.enable_size && !product.enable_color && product.variants && product.variants.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">
                      কালার / ভেরিয়েন্ট:{' '}
                      <span className="text-blue-600 normal-case tracking-normal">{selectedVariantVariant}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => {
                        const active = selectedVariantVariant === v.value;
                        return (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => setSelectedVariantVariant(v.value)}
                            className={`min-w-[56px] px-4 h-10 rounded-xl text-[13px] font-bold border-2 transition ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {v.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">পরিমাণ</p>
                    <div className="inline-flex items-center rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="কমান"
                        className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-black text-slate-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={quantity >= maxQty}
                        aria-label="বাড়ান"
                        className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-400">সর্বমোট</p>
                    <p className="text-2xl font-black text-slate-900">{fmt(product.price * quantity)}</p>
                  </div>
                </div>

                {/* Desktop action buttons */}
                <ActionButtons className="hidden md:grid" />

                {/* Trust badges (মোবাইলে এখানে) */}
                <div className="md:hidden grid grid-cols-3 gap-2">
                  {[
                    { icon: <ShieldCheck className="w-4 h-4" />, t: '১০০% অরিজিনাল' },
                    { icon: <Truck className="w-4 h-4" />, t: 'ক্যাশ অন ডেলিভারি' },
                    { icon: <RefreshCw className="w-4 h-4" />, t: '৭ দিন রিপ্লেসমেন্ট' },
                  ].map((b) => (
                    <div key={b.t} className="rounded-xl border border-blue-100 bg-blue-50/60 px-2 py-2.5 text-center">
                      <div className="text-blue-600 flex justify-center mb-1">{b.icon}</div>
                      <p className="text-[10.5px] font-bold text-slate-800 leading-tight">{b.t}</p>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="pt-1">
                  <div className="inline-flex p-1 rounded-2xl bg-slate-100 text-[12px] font-bold w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('desc')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition ${activeTab === 'desc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      প্রোডাক্ট বিবরণী
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition ${activeTab === 'reviews' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      রিভিউ ({product.review_count || 45})
                    </button>
                  </div>

                  <div className="pt-4 text-[13px] text-slate-600 leading-relaxed">
                    {activeTab === 'desc' ? (
                      <p className="whitespace-pre-line">
                        {product.description || product.short_description || 'এই প্রোডাক্টের বিস্তারিত বিবরণ শীঘ্রই যোগ করা হবে।'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { n: 'রাশেদুল ইসলাম', t: 'অরিজিনাল প্রোডাক্ট পেয়েছি। ব্যাটারি ব্যাকআপ দারুণ! ধন্যবাদ মুবা গ্যাজেটস।' },
                          { n: 'তানভীর আহমেদ', t: '২ দিনে ডেলিভারি পেয়েছি ঢাকার ভেতরে। কোয়ালিটি খুবই প্রিমিয়াম।' },
                        ].map((r) => (
                          <div key={r.n} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 font-bold text-slate-900 text-[13px]">
                                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">{r.n.charAt(0)}</span>
                                {r.n}
                              </span>
                              <span className="text-amber-400 text-sm tracking-tight">★★★★★</span>
                            </div>
                            <p className="text-slate-600 text-[12.5px]">{r.t}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky action bar */}
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-500">{quantity} পিস • সর্বমোট</span>
            <span className="text-lg font-black text-blue-600">{fmt(product.price * quantity)}</span>
          </div>
          <ActionButtons />
        </div>
      </div>
    </div>
  );
};