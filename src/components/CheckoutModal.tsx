import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Truck, Phone, User, MapPin, Loader2, ChevronLeft } from 'lucide-react';
import { CartItem, DeliveryZone, Order } from '../types';
import { supabase } from '../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  deliveryZone: DeliveryZone;
  deliveryZones?: DeliveryZone[];
  setSelectedZone?: (zone: DeliveryZone) => void;
  discountAmount: number;
  couponCode: string;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  deliveryZone,
  deliveryZones = [],
  setSelectedZone,
  discountAmount,
  couponCode,
  onOrderSuccess
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryCharge = deliveryZone ? deliveryZone.charge : 60;
  const total = Math.max(0, subtotal - discountAmount) + deliveryCharge;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert('দয়া করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা লিখুন।');
      return;
    }

    setLoading(true);

    try {
      const orderNumber = 'MB-' + Math.floor(100000 + Math.random() * 900000);
      
      const newOrder: Order = {
        order_number: orderNumber,
        customer_name: name,
        phone,
        address,
        delivery_zone: deliveryZone.name_bn,
        delivery_charge: deliveryCharge,
        subtotal,
        discount: discountAmount,
        total,
        coupon_code: couponCode,
        payment_method: paymentMethod,
        status: 'pending',
        note,
        items: cart.map(item => ({
          product_name: item.product.name,
          variant: item.selectedVariant,
          quantity: item.quantity,
          unit_price: item.product.price,
          total: item.product.price * item.quantity
        }))
      };

      // Try inserting into Supabase if connected
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          customer_name: name,
          phone,
          address,
          delivery_zone: deliveryZone.name_bn,
          delivery_charge: deliveryCharge,
          subtotal,
          discount: discountAmount,
          total,
          coupon_code: couponCode,
          payment_method: paymentMethod,
          status: 'pending',
          note
        })
        .select()
        .single();

      if (!orderError && insertedOrder) {
        // Insert order items
        const orderItemsPayload = cart.map(item => ({
          order_id: insertedOrder.id,
          product_id: item.product.id,
          product_name: item.product.name,
          variant: item.selectedVariant,
          quantity: item.quantity,
          unit_price: item.product.price,
          total: item.product.price * item.quantity
        }));
        await supabase.from('order_items').insert(orderItemsPayload);
      }

      setSuccessOrder(newOrder);
      onOrderSuccess(newOrder);
    } catch (err) {
      console.error('Order submit error:', err);
      // Fallback local success
      const orderNumber = 'MB-' + Math.floor(100000 + Math.random() * 900000);
      const fallbackOrder: Order = {
        order_number: orderNumber,
        customer_name: name,
        phone,
        address,
        delivery_zone: deliveryZone.name_bn,
        delivery_charge: deliveryCharge,
        subtotal,
        discount: discountAmount,
        total,
        coupon_code: couponCode,
        payment_method: paymentMethod,
        status: 'pending',
        note,
        items: cart.map(item => ({
          product_name: item.product.name,
          variant: item.selectedVariant,
          quantity: item.quantity,
          unit_price: item.product.price,
          total: item.product.price * item.quantity
        }))
      };
      setSuccessOrder(fallbackOrder);
      onOrderSuccess(fallbackOrder);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white pt-2 pb-4 border-b border-gray-100 z-10">
          <button
            onClick={onClose}
            className="text-gray-600 font-bold flex items-center gap-2 hover:text-[#7A1F43] transition"
          >
            <ChevronLeft className="w-5 h-5" /> ফিরে যান
          </button>
          <h2 className="text-lg font-black" style={{ color: '#7A1F43' }}>চেকআউট</h2>
        </div>

        {successOrder ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">অর্ডার সফলভাবে সম্পন্ন হয়েছে!</h2>
              <p className="text-xs text-gray-500">
                মুবা গ্যাজেটস থেকে অর্ডার করার জন্য ধন্যবাদ। আমাদের প্রতিনিধি খুব শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করবে।
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">অর্ডার নম্বর:</span>
                <span className="font-bold" style={{ color: '#7A1F43' }}>{successOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">গ্রাহকের নাম:</span>
                <span className="font-bold text-gray-800">{successOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">মোবাইল নম্বর:</span>
                <span className="font-bold text-gray-800">{successOrder.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ডেলিভারি ঠিকানা:</span>
                <span className="font-bold text-gray-800 text-right max-w-[200px] truncate">{successOrder.address}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-sm">
                <span>মোট প্রদেয়:</span>
                <span style={{ color: '#7A1F43' }}>৳{successOrder.total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full text-white font-bold py-3.5 px-6 rounded-xl text-xs shadow-lg transition"
              style={{ background: '#7A1F43' }}
            >
              শপিং এ ফিরে যান
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6" style={{ color: '#7A1F43' }} /> চেকআউট ও ডেলিভারি তথ্য
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">আপনার সঠিক নাম, মোবাইল নম্বর ও ঠিকানা লিখে অর্ডার কনফার্ম করুন।</p>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" style={{ color: '#7A1F43' }} /> আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: রাশেদ খান"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1F43] focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" style={{ color: '#7A1F43' }} /> মোবাইল নম্বর (১১ ডিজিট) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="যেমন: 01712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1F43] focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" style={{ color: '#7A1F43' }} /> সম্পূর্ণ ঠিকানা (বাসা/রোড/এলাকা/থানা) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="যেমন: বাসা ১২, রোড ৪, ধানমন্ডি, ঢাকা"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1F43] focus:bg-white transition resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" style={{ color: '#7A1F43' }} /> ডেলিভারি অঞ্চল নির্বাচন করুন:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {deliveryZones && deliveryZones.filter(z => z.is_active !== false).length > 0 ? (
                        deliveryZones.filter(z => z.is_active !== false).map(zone => {
                          const isSelected = deliveryZone?.id === zone.id;
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => setSelectedZone && setSelectedZone(zone)}
                              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-[#7A1F43] bg-rose-50/70 shadow-sm ring-2 ring-[#7A1F43]/20' 
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#7A1F43]' : 'text-gray-800'}`}>
                                  {zone.name_bn}
                                </span>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#7A1F43] bg-[#7A1F43]' : 'border-gray-300'}`}>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px]">
                                <span className="text-gray-500">{zone.estimated_days}</span>
                                <span className="font-extrabold" style={{ color: '#7A1F43' }}>৳{zone.charge}</span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-2 p-3 bg-rose-50 border border-rose-100 text-rose-900 rounded-xl text-xs font-bold flex justify-between items-center">
                          <span>{deliveryZone?.name_bn || 'ঢাকার ভিতরে'}</span>
                          <span style={{ color: '#7A1F43' }}>৳{deliveryZone?.charge || 60}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
            </div>
            <div className="md:sticky md:top-20 h-fit space-y-6">
                {/* Payment Method */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">পেমেন্ট মেথড:</label>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        Cash on Delivery (পণ্য হাতে পেয়ে ক্যাশ পরিশোধ)
                    </div>
                </div>

                {/* Order Summary box */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                        <span>সাবটোটাল:</span>
                        <span>৳{subtotal.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>ডিসকাউন্ট:</span>
                        <span>-৳{discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span>ডেলিভারি চার্জ:</span>
                        <span>৳{deliveryCharge}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-gray-900 pt-2 border-t border-gray-200">
                        <span>সর্বমোট প্রদেয়:</span>
                        <span className="text-base" style={{ color: '#7A1F43' }}>৳{total.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={handleSubmitOrder}
                    disabled={loading}
                    className="w-full text-white font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                    style={{ background: '#7A1F43' }}
                >
                    {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" /> অর্ডার প্রসেসিং হচ্ছে...
                    </>
                    ) : (
                    <span>অর্ডার প্লেস করুন (৳{total.toLocaleString()})</span>
                    )}
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
