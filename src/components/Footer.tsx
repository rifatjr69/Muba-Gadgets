import React from 'react';
import { ShieldCheck, Phone, Mail, MapPin, Clock, Heart, Award, RefreshCw, Truck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-24 sm:pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Features Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-gray-800">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 text-[#0052FF] flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-[#0052FF]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">সারা দেশে ফাস্ট ডেলিভারি</h4>
              <p className="text-xs text-gray-400">ঢাকার ভিতরে ও বাইরে ক্যাশ অন ডেলিভারি</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">১০০% আসল প্রোডাক্ট</h4>
              <p className="text-xs text-gray-400">ব্র্যান্ড ওয়ারেন্টি ও অরিজিনাল গ্যাজেট</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">৭ দিনের রিপ্লেসমেন্ট</h4>
              <p className="text-xs text-gray-400">ত্রুটিপূর্ণ পণ্যের সহজ পরিবর্তন গ্যারান্টি</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">ডেডিকেটেড কাস্টমার কেয়ার</h4>
              <p className="text-xs text-gray-400">সকাল ৯টা থেকে রাত ১০টা পর্যন্ত সাপোর্ট</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-b border-gray-800">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center text-white shadow">
                <span className="text-xl font-black">M</span>
              </div>
              <div>
                <span className="text-xl font-black text-white">Muba Gadgets</span>
                <p className="text-[10px] text-[#00E5FF] font-semibold tracking-wider uppercase">Verified Store</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              বাংলাদেশের অন্যতম বিশ্বস্ত অনলাইন গ্যাজেট শপ। প্রিমিয়াম স্মার্টওয়াচ, ট্রু ওয়্যারলেস ইয়ারবাড, ফাস্ট চার্জার এবং মোবাইল এক্সেসরিজ সেরা মূল্যে ঘরে বসেই অর্ডার করুন।
            </p>
            <div className="pt-2">
              <span className="text-xs text-gray-400 font-semibold block mb-2">পেমেন্ট মেথডসমূহ:</span>
              <div className="flex flex-wrap gap-2">
                <span className="bg-gray-800 text-gray-300 px-2.5 py-1 rounded text-xs font-bold border border-gray-700">Cash on Delivery</span>
                <span className="bg-pink-950/60 text-pink-400 px-2.5 py-1 rounded text-xs font-bold border border-pink-900">bKash</span>
                <span className="bg-orange-950/60 text-orange-400 px-2.5 py-1 rounded text-xs font-bold border border-orange-900">Nagad</span>
                <span className="bg-blue-950/60 text-blue-400 px-2.5 py-1 rounded text-xs font-bold border border-blue-900">Visa / MC</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-[#0052FF] pl-2.5">
              জনপ্রিয় ক্যাটাগরি
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#shop" className="hover:text-[#00E5FF] transition">স্মার্টওয়াচ (Smartwatch)</a></li>
              <li><a href="#shop" className="hover:text-[#00E5FF] transition">ওয়্যারলেস ইয়ারবাড (TWS Earbuds)</a></li>
              <li><a href="#shop" className="hover:text-[#00E5FF] transition">পাওয়ার ব্যাংক ও চার্জার</a></li>
              <li><a href="#shop" className="hover:text-[#00E5FF] transition">মোবাইল এক্সেসরিজ ও হোল্ডার</a></li>
              <li><a href="#shop" className="hover:text-[#00E5FF] transition">গেমিং গ্যাজেট ও কুলার</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-[#0052FF] pl-2.5">
              কাস্টমার সার্ভিস
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#tracking" className="hover:text-[#00E5FF] transition">অর্ডার ট্র্যাকিং (Order Tracking)</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition">রিটার্ন ও রিপ্লেসমেন্ট পলিসি</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition">শর্তাবলী ও প্রাইভেসি পলিসি</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition">আমাদের সম্পর্কে (About Us)</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition">সচরাচর জিজ্ঞাস্য (FAQ)</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-[#0052FF] pl-2.5">
              যোগাযোগ করুন
            </h3>
            <div className="space-y-3 text-xs text-gray-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#0052FF] shrink-0 mt-0.5" />
                <span>ধানমন্ডি, ঢাকা - ১২০৯, বাংলাদেশ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#0052FF] shrink-0" />
                <a href="tel:01717823525" className="font-bold text-white hover:text-[#00E5FF]">01717823525</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#0052FF] shrink-0" />
                <span>support@mubagadgets.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#0052FF] shrink-0" />
                <span>সকাল ৯:০০ - রাত ১০:০০ (প্রতিদিন)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 Muba Gadgets. All rights reserved. Verified E-Commerce Store.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Tech Lovers in Bangladesh
          </p>
        </div>

      </div>
    </footer>
  );
};
