import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Truck } from 'lucide-react';
import { CartItem, DeliveryZone, Coupon } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number, variant?: string) => void;
  onRemoveItem: (productId: string, variant?: string) => void;
  deliveryZones: DeliveryZone[];
  selectedZone: DeliveryZone;
  setSelectedZone: (zone: DeliveryZone) => void;
  onProceedToCheckout: (discountAmount: number, couponCode: string) => void;
  coupons: Coupon[];
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  deliveryZones,
  selectedZone,
  setSelectedZone,
  onProceedToCheckout,
  coupons
}) => {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const deliveryCharge = selectedZone ? selectedZone.charge : 60;
  const total = Math.max(0, subtotal - discountAmount) + deliveryCharge;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const found = coupons.find(c => c.code.toUpperCase() === couponCodeInput.trim().toUpperCase());
    if (!found) {
      setCouponError('কুপন কোডটি সঠিক নয়। (MUBA50 ট্রাই করুন)');
      return;
    }
    if (subtotal < found.min_order) {
      setCouponError(`ন্যূনতম ৳${found.min_order} অর্ডার করতে হবে এই কুপনের জন্য।`);
      return;
    }
    setAppliedCoupon(found);
    setCouponCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#7A1F3D]" />
              <h2 className="font-extrabold text-gray-900 text-lg">আপনার শপিং কার্ট</h2>
              <span className="bg-[#7A1F3D] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-20 h-20 bg-rose-50 text-[#7A1F3D] rounded-full flex items-center justify-center mx-auto text-3xl">
                  🛒
                </div>
                <h3 className="font-bold text-gray-900 text-base">আপনার কার্টটি খালি আছে</h3>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  আমাদের শপ থেকে আপনার পছন্দের স্মার্টওয়াচ বা ইয়ারবাড কার্টে যোগ করুন।
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#7A1F3D] hover:bg-[#5E1630] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow transition cursor-pointer"
                >
                  শপিং করুন
                </button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.product.id}-${item.selectedVariant || idx}`} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                  <img src={item.product.image_url} alt={item.product.name} className="w-20 h-20 object-cover rounded-xl border border-gray-200 bg-white" />
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs truncate">{item.product.name}</h4>
                      {item.selectedVariant && (
                        <p className="text-[11px] text-[#7A1F3D] font-bold mt-0.5">ভেরিয়েন্ট: {item.selectedVariant}</p>
                      )}
                      <p className="text-xs font-black text-[#7A1F3D] mt-1">৳{item.product.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-xs">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1, item.selectedVariant)}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-100 font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-bold text-xs text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1, item.selectedVariant)}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-100 font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.id, item.selectedVariant)}
                        className="text-gray-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="রিমুভ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer Section */}
          {cart.length > 0 && (
            <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-4">
              
              {/* Delivery Zone Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#7A1F3D]" /> ডেলিভারি এলাকা নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {deliveryZones && deliveryZones.filter(z => z.is_active !== false).length > 0 ? (
                    deliveryZones.filter(z => z.is_active !== false).map(zone => {
                      const isSelected = selectedZone?.id === zone.id;
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => setSelectedZone(zone)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            isSelected 
                              ? 'border-[#7A1F3D] bg-rose-50/70 shadow-xs ring-2 ring-[#7A1F3D]/20' 
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#7A1F3D]' : 'text-gray-900'}`}>
                              {zone.name_bn}
                            </span>
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#7A1F3D] bg-[#7A1F3D]' : 'border-gray-300'}`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px]">
                            <span className="text-gray-600 font-medium">{zone.estimated_days}</span>
                            <span className="font-black text-[#7A1F3D]">৳{zone.charge}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold">
                      কোনো ডেলিভারি অপশন সক্রিয় নেই।
                    </div>
                  )}
                </div>
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="কুপন কোড (যেমন: MUBA50)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl py-2 pl-9 pr-3 text-xs uppercase placeholder-gray-400 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
                  />
                  <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                </div>
                <button
                  type="submit"
                  className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  প্রয়োগ
                </button>
              </form>
              {appliedCoupon && (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200">
                  <span>কুপন 적용: {appliedCoupon.code} (-৳{discountAmount})</span>
                  <button onClick={() => setAppliedCoupon(null)} className="text-xs underline cursor-pointer">বাদ দিন</button>
                </div>
              )}
              {couponError && <p className="text-[11px] text-rose-700 font-bold">{couponError}</p>}

              {/* Subtotal & Totals */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
                <div className="flex justify-between text-gray-700 font-medium">
                  <span>সাবটোটাল:</span>
                  <span className="font-bold text-gray-900">৳{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>ডিসকাউন্ট:</span>
                    <span>-৳{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 font-medium">
                  <span>ডেলিভারি চার্জ ({selectedZone?.name_bn}):</span>
                  <span className="font-bold text-gray-900">৳{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>মোট প্রদেয় (Total):</span>
                  <span className="text-[#7A1F3D] text-base font-black">৳{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  onProceedToCheckout(discountAmount, appliedCoupon?.code || '');
                  onClose();
                }}
                className="w-full bg-[#7A1F3D] hover:bg-[#5E1630] text-white font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 transition active:scale-95 cursor-pointer"
              >
                <span>অর্ডার কনফার্ম করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
