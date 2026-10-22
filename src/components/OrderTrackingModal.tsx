import React, { useState } from 'react';
import { X, Search, PackageCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

const MAROON = '#7A1F3D';
const MAROON_DARK = '#5E1630';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Tracking error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 md:p-8 animate-in fade-in zoom-in duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-rose-50 text-[#7A1F3D] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <PackageCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-gray-900">অর্ডার ট্র্যাকিং (Track Order)</h2>
            <p className="text-xs text-gray-600 font-medium">আপনার অর্ডার নম্বর বা মোবাইল নম্বর দিয়ে ডেলিভারি স্ট্যাটাস চেক করুন।</p>
          </div>

          <form onSubmit={handleTrack} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="অর্ডার নম্বর বা ফোন নম্বর দিন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#7A1F3D] hover:bg-[#5E1630] text-white font-bold px-6 py-3 rounded-xl text-xs shadow transition cursor-pointer"
            >
              {loading ? 'খুঁজছে...' : 'ট্র্যাক করুন'}
            </button>
          </form>

          {searched && (
            <div className="space-y-4 pt-2">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-600 font-medium bg-gray-50 rounded-2xl border border-gray-100">
                  কোনো অর্ডার পাওয়া যায়নি "{searchQuery}" দিয়ে।
                </div>
              ) : (
                orders.map((order, idx) => (
                  <div key={idx} className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-rose-100 pb-2">
                      <div>
                        <span className="text-[11px] text-gray-600 font-semibold block">অর্ডার আইডি:</span>
                        <span className="font-black text-[#7A1F3D] text-sm">{order.order_number}</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase border border-emerald-200">
                        {order.status || 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600 block font-medium">গ্রাহক:</span>
                        <span className="font-bold text-gray-900">{order.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block font-medium">মোবাইল:</span>
                        <span className="font-bold text-gray-900">{order.phone}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-rose-100 text-xs">
                      <span className="text-gray-700 font-semibold">মোট প্রদেয়:</span>
                      <span className="font-black text-[#7A1F3D] text-sm">৳{order.total?.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
