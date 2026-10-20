import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings as SettingsIcon,
  Menu, X, Plus, Trash2, Pencil, ArrowLeft, Download, DollarSign, Eye, EyeOff, Bell, Save, Store,
  Image as ImageIcon, UploadCloud, Database, Copy, Check, ArrowUp, ArrowDown, ExternalLink,
  Loader2, Sparkles, Clock, FolderTree, Tag, Watch, Smartphone, Headphones, Speaker,
  Tv, Laptop, Gamepad2, Battery, Camera, Shirt, Gift, Zap, Shield, Flame, Radio,
  Disc, Music, Layers, Target, Truck, Info, ShieldAlert
} from 'lucide-react';
import { Product, Category, Banner, FlashSale, DeliveryZone, enrichProducts } from '../types';
import { supabase } from '../lib/supabase';
import { TrackingTab } from './TrackingTab';
import { compressImage, blobToBase64 } from '../lib/image';

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */
interface AdminDashboardProps {
  isOpen?: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  banners?: Banner[];
  flashSales?: FlashSale[];
  deliveryZones?: DeliveryZone[];
  onRefreshProducts: () => void;
  onRefreshCategories?: () => void;
  onRefreshBanners?: () => void;
  onRefreshFlashSales?: () => void;
  onRefreshDeliveryZones?: () => void;
}

/* ------------------------------ Types ------------------------------ */
interface OrderLite {
  id?: string; order_number?: string; customer_name?: string; phone?: string;
  address?: string; delivery_zone?: string; payment_method?: string;
  total?: number; status?: string; created_at?: string; items?: any; order_items?: any;
}
interface EventRow { event_type: string; session_id: string | null; country: string | null; source: string | null; created_at: string; }
interface ProductLite {
  id: string; name: string; name_bn?: string; description?: string; description_bn?: string;
  price: number; image_url?: string; images?: string[]; category_id?: string | null;
  stock?: number; is_flash_sale?: boolean;
}
interface CategoryLite { id: string; name?: string; name_bn?: string; }

export type Page =
  | 'dashboard' | 'orders' | 'products' | 'categories' | 'banners' | 'flashSales'
  | 'customers' | 'reports' | 'tracking' | 'trackingPixels' | 'courier' | 'deliveryZones' | 'settings';

export const CATEGORY_ICONS_LIST = [
  { name: 'Watch', label: 'স্মার্টওয়াচ', icon: Watch },
  { name: 'Smartphone', label: 'মোবাইল', icon: Smartphone },
  { name: 'Headphones', label: 'হেডফোন / বাড', icon: Headphones },
  { name: 'Speaker', label: 'স্পিকার', icon: Speaker },
  { name: 'Battery', label: 'পাওয়ার ব্যাংক', icon: Battery },
  { name: 'Zap', label: 'চার্জার / ক্যাবল', icon: Zap },
  { name: 'Laptop', label: 'ল্যাপটপ / পিসি', icon: Laptop },
  { name: 'Tv', label: 'টিভি / ডিসপ্লে', icon: Tv },
  { name: 'Gamepad2', label: 'গেমিং গ্যাজেট', icon: Gamepad2 },
  { name: 'Camera', label: 'ক্যামেরা', icon: Camera },
  { name: 'Shirt', label: 'লাইফস্টাইল', icon: Shirt },
  { name: 'Gift', label: 'গিফট সামগ্রী', icon: Gift },
  { name: 'Tag', label: 'ডিসকাউন্ট / অফার', icon: Tag },
  { name: 'Shield', label: 'সুরক্ষা / কেস', icon: Shield },
  { name: 'Sparkles', label: 'এক্সক্লুসিভ', icon: Sparkles },
  { name: 'Flame', label: 'হট ডিল', icon: Flame },
  { name: 'Radio', label: 'রেডিও / অডিও', icon: Radio },
  { name: 'Disc', label: 'স্টোরেজ / ড্রাইভ', icon: Disc },
  { name: 'Music', label: 'মিউজিক আইটেম', icon: Music },
  { name: 'Layers', label: 'অন্যান্য কালেকশন', icon: Layers }
];

export const getCategoryIconComponent = (iconName?: string) => {
  const match = CATEGORY_ICONS_LIST.find(
    (i) => i.name.toLowerCase() === (iconName || '').toLowerCase()
  );
  return match ? match.icon : Tag;
};

/* ------------------------------ Helpers ---------------------------- */
const isValidUuid = (val: any): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
const DAY = 864e5;
const BLUE = '#2563eb';
const money = (n: number) => '৳' + Math.round(n || 0).toLocaleString('en-US');
const compact = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'K' : String(Math.round(n));
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
const ts = (o: { created_at?: string }) => new Date(o.created_at || 0).getTime();
const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10) * p;
};
const getItems = (o: OrderLite): any[] => {
  let it = o.items ?? o.order_items;
  if (typeof it === 'string') { try { it = JSON.parse(it); } catch { it = []; } }
  return Array.isArray(it) ? it : [];
};

// localStorage helper (try/catch সহ)
const loadLS = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};
const saveLS = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// Supabase একবারে সর্বোচ্চ 1000 row দেয়, তাই পেজ করে সব আনা হচ্ছে
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000, maxPages = 10
): Promise<{ rows: T[]; error: any }> {
  const rows: T[] = [];
  for (let p = 0; p < maxPages; p++) {
    const { data, error } = await build(p * pageSize, p * pageSize + pageSize - 1);
    if (error) return { rows, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return { rows, error: null };
}

function smoothPath(pts: [number, number][], top: number, bottom: number) {
  if (pts.length < 2) return '';
  const cl = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const SOURCE_LABEL: Record<string, string> = { direct: 'Direct Traffic', organic: 'Organic Search', social: 'Social Media', referral: 'Referral Traffic', email: 'Email Campaigns' };
const SHADES = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white';

/* ------------------------- Supabase SQL (এক জায়গায়) ------------------------- */
const SETUP_SQL = `-- 1. Ensure required columns exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_bn TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT false;

-- 2. Create Storage Bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies (Allow view & upload)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
CREATE POLICY "Public Read product-images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow upload product-images" ON storage.objects;
CREATE POLICY "Allow upload product-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow update product-images" ON storage.objects;
CREATE POLICY "Allow update product-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow delete product-images" ON storage.objects;
CREATE POLICY "Allow delete product-images" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');

-- 4. Ensure categories table exists with all modern fields
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  name_bn TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'Tag',
  image_url TEXT,
  sub_label TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Tag';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sub_label TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update categories" ON public.categories;
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete categories" ON public.categories;
CREATE POLICY "Allow delete categories" ON public.categories FOR DELETE USING (true);

-- Storage bucket for categories
INSERT INTO storage.buckets (id, name, public) VALUES ('categories', 'categories', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Public Read categories_bucket" ON storage.objects;
CREATE POLICY "Public Read categories_bucket" ON storage.objects FOR SELECT USING (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow upload categories_bucket" ON storage.objects;
CREATE POLICY "Allow upload categories_bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow update categories_bucket" ON storage.objects;
CREATE POLICY "Allow update categories_bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow delete categories_bucket" ON storage.objects;
CREATE POLICY "Allow delete categories_bucket" ON storage.objects FOR DELETE USING (bucket_id = 'categories');

INSERT INTO public.categories (name, name_en, name_bn, slug, icon, sub_label, sort_order)
VALUES
  ('Smartwatches', 'Smartwatches', 'স্মার্টওয়াচ', 'smartwatches', 'Watch', 'AMOLED, Bluetooth Calling', 1),
  ('TWS Earbuds', 'TWS Earbuds', 'ওয়্যারলেস ইয়ারবাড', 'tws-earbuds', 'Headphones', 'ANC, Deep Bass, Long Battery', 2),
  ('Power Banks', 'Power Banks', 'পাওয়ার ব্যাংক', 'power-banks', 'Battery', '20W/65W PD Fast Charging', 3),
  ('GaN Chargers', 'GaN Chargers', 'চার্জার ও অ্যাডাপ্টার', 'chargers', 'Zap', 'Fast charging adapters', 4),
  ('Phone Accessories', 'Phone Accessories', 'ফোন এক্সেসরিজ', 'accessories', 'Smartphone', 'Cases, holders, cables', 5),
  ('Gaming Gadgets', 'Gaming Gadgets', 'গেমিং গ্যাজেটস', 'gaming', 'Gamepad2', 'Triggers, coolers, controllers', 6)
ON CONFLICT (slug) DO NOTHING;

-- 5. Banners Table & Storage for Hero Slider
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active banners" ON public.banners;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert banners" ON public.banners;
CREATE POLICY "Allow insert banners" ON public.banners FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update banners" ON public.banners;
CREATE POLICY "Allow update banners" ON public.banners FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete banners" ON public.banners;
CREATE POLICY "Allow delete banners" ON public.banners FOR DELETE USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Public Read banners" ON storage.objects;
CREATE POLICY "Public Read banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "Allow upload banners" ON storage.objects;
CREATE POLICY "Allow upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners');
DROP POLICY IF EXISTS "Allow update banners" ON storage.objects;
CREATE POLICY "Allow update banners" ON storage.objects FOR UPDATE USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "Allow delete banners" ON storage.objects;
CREATE POLICY "Allow delete banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners');

-- 6. Allow delete for orders & products (admin panel delete)
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;
CREATE POLICY "Allow delete orders" ON public.orders FOR DELETE USING (true);
DROP POLICY IF EXISTS "Allow delete products" ON public.products;
CREATE POLICY "Allow delete products" ON public.products FOR DELETE USING (true);

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';`;

/* --------------------------- Small UI pieces ----------------------- */
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`min-w-0 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>{children}</div>
);
const Delta: React.FC<{ v: number }> = ({ v }) => (
  <span className={`text-[11px] font-bold ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
);
const Select: React.FC<{ value: number; onChange: (v: number) => void; options: [number, string][] }> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className="bg-blue-600 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
  >
    {options.map(([v, l]) => <option key={v} value={v} className="text-gray-900 bg-white">{l}</option>)}
  </select>
);
const Empty: React.FC<{ text: string }> = ({ text }) => <div className="py-10 text-center text-xs text-gray-400">{text}</div>;

const CardHeader: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">{title}</h3>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
    {right}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
    <div className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    {label && <span className="text-xs font-bold text-slate-700">{label}</span>}
  </label>
);

const SavedBadge: React.FC<{ saved: boolean; okText: string }> = ({ saved, okText }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${saved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
    {saved ? <Check className="w-3 h-3" /> : null}{saved ? okText : 'সেট করা হয়নি'}
  </span>
);

/* ====================================================================== */
/* Tracking Pixels page (শুধু localStorage এ সেভ)                         */
/* ====================================================================== */
interface PixelStore {
  meta_pixel_id: string; meta_enabled: boolean;
  gtm_id: string; gtm_enabled: boolean;
  tiktok_pixel_id: string; tiktok_enabled: boolean;
  updated_at: string;
}
const PIXEL_KEY = 'muba_tracking_pixels';
const EMPTY_PIXELS: PixelStore = {
  meta_pixel_id: '', meta_enabled: false,
  gtm_id: '', gtm_enabled: false,
  tiktok_pixel_id: '', tiktok_enabled: false,
  updated_at: '',
};
const PIXEL_DEFS: {
  id: string; name: string; sub: string; short: string; color: string; placeholder: string;
  idKey: 'meta_pixel_id' | 'gtm_id' | 'tiktok_pixel_id';
  enKey: 'meta_enabled' | 'gtm_enabled' | 'tiktok_enabled';
  label: string;
}[] = [
  { id: 'meta', name: 'Meta (Facebook) Pixel', sub: 'Facebook ও Instagram Ads ট্র্যাকিং', short: 'f', color: '#1877F2', placeholder: '1234567890123456', idKey: 'meta_pixel_id', enKey: 'meta_enabled', label: 'Meta Pixel ID' },
  { id: 'gtm', name: 'Google Tag Manager', sub: 'GTM Container ID', short: 'G', color: '#4285F4', placeholder: 'GTM-XXXXXXX', idKey: 'gtm_id', enKey: 'gtm_enabled', label: 'GTM Container ID' },
  { id: 'tiktok', name: 'TikTok Pixel', sub: 'TikTok Ads ট্র্যাকিং', short: 'T', color: '#111827', placeholder: 'CXXXXXXXXXXXXXXXXX', idKey: 'tiktok_pixel_id', enKey: 'tiktok_enabled', label: 'TikTok Pixel ID' },
];

const TrackingPixelsPage: React.FC<{ notify: (m: string, ok?: boolean) => void }> = ({ notify }) => {
  const [saved, setSaved] = useState<PixelStore>(() => ({ ...EMPTY_PIXELS, ...loadLS<Partial<PixelStore>>(PIXEL_KEY, {}) }));
  const [draft, setDraft] = useState<PixelStore>(saved);

  const saveOne = (def: (typeof PIXEL_DEFS)[number]) => {
    const val = String(draft[def.idKey] || '').trim();
    const enabled = val ? Boolean(draft[def.enKey]) : false;
    const next = { ...saved, [def.idKey]: val, [def.enKey]: enabled, updated_at: new Date().toISOString() } as PixelStore;
    saveLS(PIXEL_KEY, next);
    setSaved(next);
    setDraft((d) => ({ ...d, [def.idKey]: val, [def.enKey]: enabled } as PixelStore));
    notify(val ? `${def.name} সেভ হয়েছে` : `${def.name} মুছে ফেলা হয়েছে`);
  };

  const saveAll = () => {
    const next: PixelStore = {
      meta_pixel_id: draft.meta_pixel_id.trim(),
      meta_enabled: draft.meta_pixel_id.trim() ? draft.meta_enabled : false,
      gtm_id: draft.gtm_id.trim(),
      gtm_enabled: draft.gtm_id.trim() ? draft.gtm_enabled : false,
      tiktok_pixel_id: draft.tiktok_pixel_id.trim(),
      tiktok_enabled: draft.tiktok_pixel_id.trim() ? draft.tiktok_enabled : false,
      updated_at: new Date().toISOString(),
    };
    saveLS(PIXEL_KEY, next);
    setSaved(next);
    setDraft(next);
    notify('সব ট্র্যাকিং পিক্সেল সেভ হয়েছে');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <Card>
        <CardHeader
          title="ট্র্যাকিং পিক্সেল (Tracking Pixels)"
          sub="Meta Pixel, Google Tag Manager ও TikTok Pixel এর ID এখানে সেভ করুন"
          right={saved.updated_at ? <span className="text-[10px] text-slate-400 text-right shrink-0">সর্বশেষ সেভ:<br />{new Date(saved.updated_at).toLocaleString('en-GB')}</span> : undefined}
        />
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>এই তথ্য শুধু এই ব্রাউজারের localStorage এ সেভ থাকে। Script আলাদা ভাবে যুক্ত করতে হবে।</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {PIXEL_DEFS.map((def) => {
          const isSaved = !!saved[def.idKey];
          return (
            <Card key={def.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0" style={{ background: def.color }}>{def.short}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">{def.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{def.sub}</p>
                </div>
              </div>
              <SavedBadge saved={isSaved} okText="সেভ করা আছে" />
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{def.label}</label>
                <input
                  type="text"
                  placeholder={def.placeholder}
                  value={draft[def.idKey]}
                  onChange={(e) => setDraft((d) => ({ ...d, [def.idKey]: e.target.value } as PixelStore))}
                  className={inputCls + ' break-all'}
                />
              </div>
              <Toggle
                checked={Boolean(draft[def.enKey])}
                onChange={(v) => setDraft((d) => ({ ...d, [def.enKey]: v } as PixelStore))}
                label={draft[def.enKey] ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
              />
              <button
                type="button"
                onClick={() => saveOne(def)}
                className="w-full sm:w-auto sm:self-start inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
              >
                <Save className="w-4 h-4" />Save
              </button>
            </Card>
          );
        })}
      </div>

      <button
        type="button"
        onClick={saveAll}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition"
      >
        <Save className="w-4 h-4" />Save All
      </button>
    </div>
  );
};

/* ====================================================================== */
/* Courier API page (শুধু localStorage এ সেভ)                             */
/* ====================================================================== */
interface CourierField { key: string; label: string; secret?: boolean; placeholder?: string }
interface CourierDef { id: string; name: string; short: string; color: string; fields: CourierField[] }
interface CourierEntry { enabled: boolean; values: Record<string, string> }
type CourierStore = Record<string, CourierEntry>;

const COURIER_KEY = 'muba_courier_settings';
const COURIER_DEFS: CourierDef[] = [
  {
    id: 'steadfast', name: 'Steadfast Courier', short: 'SF', color: '#16A34A',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true },
      { key: 'secret_key', label: 'Secret Key', secret: true },
    ],
  },
  {
    id: 'pathao', name: 'Pathao Courier', short: 'PT', color: '#E11D48',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'username', label: 'Username (Email)', placeholder: 'name@example.com' },
      { key: 'password', label: 'Password', secret: true },
      { key: 'store_id', label: 'Store ID' },
    ],
  },
  {
    id: 'redx', name: 'RedX', short: 'RX', color: '#DC2626',
    fields: [
      { key: 'access_token', label: 'API Access Token', secret: true },
    ],
  },
  {
    id: 'carrybee', name: 'Carrybee', short: 'CB', color: '#F59E0B',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'client_context', label: 'Client Context' },
      { key: 'store_id', label: 'Store ID' },
    ],
  },
];

const emptyEntry = (def: CourierDef): CourierEntry => ({
  enabled: false,
  values: Object.fromEntries(def.fields.map((f) => [f.key, ''])),
});

const isEntryConfigured = (e: CourierEntry) => Object.values(e.values).some((v) => (v || '').trim() !== '');

const CourierCard: React.FC<{
  def: CourierDef;
  saved: CourierEntry;
  onSave: (e: CourierEntry) => void;
  onClear: () => void;
}> = ({ def, saved, onSave, onClear }) => {
  const [draft, setDraft] = useState<CourierEntry>(saved);
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => { setDraft(saved); }, [saved]);

  const configured = isEntryConfigured(saved);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: def.color }}>{def.short}</div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">{def.name}</h3>
          <div className="mt-1"><SavedBadge saved={configured} okText="কনফিগার করা আছে" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {def.fields.map((f) => (
          <div key={f.key} className={def.fields.length % 2 === 1 && f === def.fields[def.fields.length - 1] ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-700 mb-1">{f.label}</label>
            <div className="relative">
              <input
                type={f.secret && !show[f.key] ? 'password' : 'text'}
                autoComplete="off"
                placeholder={f.placeholder || f.label}
                value={draft.values[f.key] || ''}
                onChange={(e) => setDraft((d) => ({ ...d, values: { ...d.values, [f.key]: e.target.value } }))}
                className={inputCls + (f.secret ? ' pr-10' : '') + ' break-all'}
              />
              {f.secret && (
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-blue-600"
                  aria-label={show[f.key] ? 'Hide' : 'Show'}
                >
                  {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Toggle
        checked={draft.enabled}
        onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
        label={draft.enabled ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
        >
          <Save className="w-4 h-4" />Save
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-sm px-5 py-2.5 rounded-xl"
        >
          <Trash2 className="w-4 h-4" />Clear
        </button>
      </div>
    </Card>
  );
};

const CourierPage: React.FC<{ notify: (m: string, ok?: boolean) => void }> = ({ notify }) => {
  const [store, setStore] = useState<CourierStore>(() => {
    const raw = loadLS<Partial<Record<string, Partial<CourierEntry>>>>(COURIER_KEY, {});
    const out: CourierStore = {};
    COURIER_DEFS.forEach((def) => {
      const base = emptyEntry(def);
      const r = raw[def.id];
      out[def.id] = {
        enabled: Boolean(r?.enabled),
        values: { ...base.values, ...(r?.values || {}) },
      };
    });
    return out;
  });

  const persist = (next: CourierStore) => {
    setStore(next);
    saveLS(COURIER_KEY, next);
  };

  const handleSave = (def: CourierDef, entry: CourierEntry) => {
    const values: Record<string, string> = {};
    def.fields.forEach((f) => { values[f.key] = (entry.values[f.key] || '').trim(); });
    persist({ ...store, [def.id]: { enabled: entry.enabled, values } });
    notify(`${def.name} সেভ হয়েছে`);
  };

  const handleClear = (def: CourierDef) => {
    if (!window.confirm(`${def.name} এর সব তথ্য মুছে ফেলতে চান?`)) return;
    persist({ ...store, [def.id]: emptyEntry(def) });
    notify(`${def.name} এর তথ্য মুছে ফেলা হয়েছে`);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <Card>
        <CardHeader
          title="কুরিয়ার API (Courier Settings)"
          sub="Steadfast, Pathao, RedX ও Carrybee এর API তথ্য এখানে সেভ করুন"
        />
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>API key গুলো শুধু এই ডিভাইস/ব্রাউজারে সেভ হয়। অন্য কারো সাথে ব্রাউজার শেয়ার করবেন না।</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {COURIER_DEFS.map((def) => (
          <CourierCard
            key={def.id}
            def={def}
            saved={store[def.id]}
            onSave={(e) => handleSave(def, e)}
            onClear={() => handleClear(def)}
          />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------ Charts ----------------------------- */
const RevenueChart: React.FC<{ data: { label: string; revenue: number; orders: number }[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 700, H = 280, L = 48, R = 12, T = 14, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const maxRev = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const maxOrd = Math.max(...data.map((d) => d.orders), 1);
  const x = (i: number) => L + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
  const yRev = (v: number) => T + ih - (v / maxRev) * ih;
  const yOrd = (v: number) => T + ih - (v / maxOrd) * ih * 0.55;
  const revPts = data.map((d, i) => [x(i), yRev(d.revenue)] as [number, number]);
  const ordPts = data.map((d, i) => [x(i), yOrd(d.orders)] as [number, number]);
  const step = Math.ceil(data.length / 8);
  const ticks = [0, 1, 2, 3, 4].map((i) => (maxRev / 4) * i);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * W;
    const idx = Math.round(((rel - L) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };
  const hd = hover !== null ? data[hover] : null;
  const tx = hover !== null ? Math.min(Math.max(x(hover) - 55, L), W - R - 110) : 0;

  const linePath = smoothPath(revPts, T, T + ih);
  const areaPath = linePath && data.length > 1
    ? `${linePath} L${x(data.length - 1)},${T + ih} L${x(0)},${T + ih} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none touch-pan-y">
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={yRev(t)} y2={yRev(t)} stroke="#E2E8F0" strokeDasharray="4 4" />
          <text x={L - 8} y={yRev(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{compact(t)}</text>
        </g>
      ))}
      {data.map((d, i) => i % step === 0 && (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748B">{d.label}</text>
      ))}
      {hover !== null && <rect x={x(hover) - 18} y={T} width={36} height={ih} fill={BLUE} opacity="0.08" rx="6" />}
      {areaPath && <path d={areaPath} fill="url(#revFill)" />}
      <path d={smoothPath(ordPts, T, T + ih)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5 4" />
      <path d={linePath} fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
      {hover !== null && hd && (
        <g>
          <circle cx={x(hover)} cy={yRev(hd.revenue)} r="5" fill="#fff" stroke={BLUE} strokeWidth="2" />
          <g transform={`translate(${tx},${Math.max(yRev(hd.revenue) - 62, 0)})`}>
            <rect width="110" height="48" rx="8" fill="#fff" stroke="#CBD5E1" />
            <text x="10" y="18" fontSize="10" fill="#64748B">{hd.label} · Revenue</text>
            <text x="10" y="34" fontSize="13" fontWeight="700" fill="#0F172A">{money(hd.revenue)}</text>
            <text x="10" y="44" fontSize="9" fill="#94A3B8">{hd.orders} orders</text>
          </g>
        </g>
      )}
      <rect x={L} y={T} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
    </svg>
  );
};

const Gauge: React.FC<{ pct: number }> = ({ pct }) => (
  <svg viewBox="0 0 200 118" className="w-full max-w-[260px] mx-auto">
    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#DBEAFE" strokeWidth="22" strokeLinecap="round" pathLength={100} />
    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={BLUE} strokeWidth="22" strokeLinecap="round" pathLength={100}
      strokeDasharray={`${Math.max(Math.min(pct, 1) * 100, 0.01)} 100`} />
    <text x="100" y="92" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0F172A">{Math.round(pct * 100)}%</text>
  </svg>
);

const Donut: React.FC<{ parts: { value: number }[]; centerTop: string; centerBottom: string }> = ({ parts, centerTop, centerBottom }) => {
  const r = 70, C = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let offset = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
      <circle cx="100" cy="100" r={r} fill="none" stroke="#EFF6FF" strokeWidth="26" />
      <g transform="rotate(-90 100 100)">
        {parts.map((p, i) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={i} cx="100" cy="100" r={r} fill="none" stroke={SHADES[i % SHADES.length]} strokeWidth="26" strokeLinecap="round"
              strokeDasharray={`${Math.max(len - 8, 0.1)} ${C}`} strokeDashoffset={-offset - 4} />
          );
          offset += len;
          return el;
        })}
      </g>
      <text x="100" y="94" textAnchor="middle" fontSize="10" fill="#64748B">{centerTop}</text>
      <text x="100" y="116" textAnchor="middle" fontSize="17" fontWeight="800" fill="#0F172A">{centerBottom}</text>
    </svg>
  );
};

/* ====================================================================== */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen = true, onClose, products, categories, banners, deliveryZones, onRefreshProducts, onRefreshCategories, onRefreshBanners, onRefreshDeliveryZones
}) => {
  const prods = enrichProducts(products as unknown as Product[]) as unknown as ProductLite[];
  const cats = categories as unknown as CategoryLite[];
  const catName = (id?: string | null) => { const c = cats.find((x) => x.id === id); return c ? (c.name || c.name_bn || '—') : '—'; };

  // URL query, hash বা localStorage থেকে শুরুর ট্যাব পড়া হয়
  const getInitialTab = (): Page => {
    try {
      const validPages: Page[] = [
        'dashboard', 'orders', 'products', 'categories', 'banners', 'flashSales',
        'customers', 'reports', 'tracking', 'trackingPixels', 'courier', 'deliveryZones', 'settings'
      ];
      const searchParam = new URLSearchParams(window.location.search).get('tab') as Page;
      if (searchParam && validPages.includes(searchParam)) return searchParam;

      const hashParam = window.location.hash.replace('#', '') as Page;
      if (hashParam && validPages.includes(hashParam)) return hashParam;

      const saved = localStorage.getItem('muba_admin_tab') as Page;
      if (saved && validPages.includes(saved)) return saved;
    } catch { /* ignore */ }
    return 'dashboard';
  };

  const [page, setPageState] = useState<Page>(getInitialTab);

  const setPage = useCallback((newPage: Page) => {
    setPageState(newPage);
    try {
      localStorage.setItem('muba_admin_tab', newPage);
      window.history.replaceState({ ...window.history.state, view: 'admin', tab: newPage }, '', `/admin?tab=${newPage}`);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('muba_admin_active', 'true');
      localStorage.setItem('muba_admin_tab', page);
      const currentTab = new URLSearchParams(window.location.search).get('tab');
      if (window.location.pathname !== '/admin' || currentTab !== page) {
        window.history.replaceState({ ...window.history.state, view: 'admin', tab: page }, '', `/admin?tab=${page}`);
      }
    } catch { /* ignore */ }
  }, [page]);

  const [navOpen, setNavOpen] = useState(false);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [rangeDays, setRangeDays] = useState(7);
  const [funnelDays, setFunnelDays] = useState(7);
  const [target, setTarget] = useState(600000);
  const [targetInput, setTargetInput] = useState('600000');

  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [reportFrom, setReportFrom] = useState(dayKey(new Date(Date.now() - 29 * DAY)));
  const [reportTo, setReportTo] = useState(dayKey(new Date()));

  const emptyForm = {
    id: '',
    name: '',
    name_bn: '',
    description: '',
    description_bn: '',
    price: '',
    stock: '50',
    category_id: '',
    image_url: '',
    images: [] as string[],
    enable_size: false,
    enable_color: false,
    sizes: [] as string[],
    colors: [] as string[]
  };
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');

  const addSizeOption = () => {
    const val = sizeInput.trim();
    if (!val) return;
    if (form.sizes.includes(val)) return;
    setForm(prev => ({ ...prev, sizes: [...prev.sizes, val] }));
    setSizeInput('');
  };
  const removeSizeOption = (idx: number) => {
    setForm(prev => ({ ...prev, sizes: prev.sizes.filter((_, i) => i !== idx) }));
  };
  const addColorOption = () => {
    const val = colorInput.trim();
    if (!val) return;
    if (form.colors.includes(val)) return;
    setForm(prev => ({ ...prev, colors: [...prev.colors, val] }));
    setColorInput('');
  };
  const removeColorOption = (idx: number) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));
  };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  /* ---------------------- Delete Confirm State ---------------------- */
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<ProductLite | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<OrderLite | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  /* -------------------------- Category State -------------------------- */
  const defaultCategoryForm = {
    name: '',
    name_bn: '',
    slug: '',
    icon: 'Tag',
    sub_label: '',
    image_url: '',
    sort_order: '0',
    is_active: true
  };
  const [catList, setCatList] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('muba_custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return categories || [];
  });
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryUploading, setCategoryUploading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------- Delivery Zones State ---------------------- */
  const [zoneList, setZoneList] = useState<DeliveryZone[]>(() => {
    if (deliveryZones && deliveryZones.length > 0) return deliveryZones;
    try {
      const saved = localStorage.getItem('muba_delivery_zones');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [
      { id: 'zone-1', name: 'Inside Dhaka', name_bn: 'ঢাকার ভিতরে', charge: 60, estimated_days: '১-২ কার্যদিবস' },
      { id: 'zone-2', name: 'Outside Dhaka', name_bn: 'ঢাকার বাইরে', charge: 130, estimated_days: '৩-৫ কার্যদিবস' }
    ];
  });

  useEffect(() => {
    if (deliveryZones && deliveryZones.length > 0) {
      setZoneList(deliveryZones);
    }
  }, [deliveryZones]);

  const defaultZoneForm = { name: '', name_bn: '', charge: '60', estimated_days: '১-২ কার্যদিবস' };
  const [zoneForm, setZoneForm] = useState(defaultZoneForm);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [deleteConfirmZone, setDeleteConfirmZone] = useState<DeliveryZone | null>(null);

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name_bn.trim() || !zoneForm.charge) {
      notify('অনুগ্রহ করে নাম এবং চার্জ দিন', false);
      return;
    }
    setZoneSaving(true);
    try {
      const chargeNum = parseFloat(zoneForm.charge) || 0;
      if (editingZoneId) {
        if (isValidUuid(editingZoneId)) {
          await supabase.from('delivery_zones').update({
            name: zoneForm.name.trim() || zoneForm.name_bn.trim(),
            name_bn: zoneForm.name_bn.trim(),
            charge: chargeNum,
            estimated_days: zoneForm.estimated_days.trim()
          }).eq('id', editingZoneId);
        }
        setZoneList((prev) => {
          const updated = prev.map((z) => z.id === editingZoneId ? { ...z, name: zoneForm.name.trim() || zoneForm.name_bn.trim(), name_bn: zoneForm.name_bn.trim(), charge: chargeNum, estimated_days: zoneForm.estimated_days.trim() } : z);
          try { localStorage.setItem('muba_delivery_zones', JSON.stringify(updated)); } catch {}
          return updated;
        });
        notify('ডেলিভারি জোন আপডেট হয়েছে');
      } else {
        const newObj: DeliveryZone = {
          id: 'zone-' + Date.now(),
          name: zoneForm.name.trim() || zoneForm.name_bn.trim(),
          name_bn: zoneForm.name_bn.trim(),
          charge: chargeNum,
          estimated_days: zoneForm.estimated_days.trim()
        };
        try {
          const { data, error } = await supabase.from('delivery_zones').insert({
            name: newObj.name,
            name_bn: newObj.name_bn,
            charge: newObj.charge,
            estimated_days: newObj.estimated_days
          }).select().single();
          if (!error && data) {
            newObj.id = data.id;
          }
        } catch {}

        setZoneList((prev) => {
          const updated = [...prev, newObj];
          try { localStorage.setItem('muba_delivery_zones', JSON.stringify(updated)); } catch {}
          return updated;
        });
        notify('নতুন ডেলিভারি জোন যোগ হয়েছে');
      }
      setEditingZoneId(null);
      setZoneForm(defaultZoneForm);
      if (onRefreshDeliveryZones) onRefreshDeliveryZones();
    } catch (err: any) {
      notify('সেভ হয়নি: ' + (err?.message || 'Error'), false);
    } finally {
      setZoneSaving(false);
    }
  };

  const confirmDeleteZone = async () => {
    if (!deleteConfirmZone) return;
    try {
      if (isValidUuid(deleteConfirmZone.id)) {
        await supabase.from('delivery_zones').delete().eq('id', deleteConfirmZone.id);
      }
      setZoneList((prev) => {
        const updated = prev.filter((z) => z.id !== deleteConfirmZone.id);
        try { localStorage.setItem('muba_delivery_zones', JSON.stringify(updated)); } catch {}
        return updated;
      });
      notify('ডেলিভারি জোন মুছে ফেলা হয়েছে');
      if (onRefreshDeliveryZones) onRefreshDeliveryZones();
    } catch {
      notify('মুছে ফেলা যায়নি', false);
    } finally {
      setDeleteConfirmZone(null);
    }
  };


  useEffect(() => {
    if (categories && categories.length > 0) {
      setCatList(categories);
    }
  }, [categories]);

  /* -------------------------- Banner State -------------------------- */
  const [bannersList, setBannersList] = useState<Banner[]>(banners || []);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<Banner | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const emptyBannerForm = {
    title: '',
    image_url: '',
    link_url: '',
    sort_order: '1',
    is_active: true,
  };
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  /* ------------------------------ Loaders ------------------------------ */
  const loadOrders = useCallback(async () => {
    const { rows, error } = await fetchAll<any>((f, t) =>
      supabase.from('orders').select('*').order('created_at', { ascending: false }).range(f, t));
    if (error) setLoadError('Orders লোড করা যায়নি: ' + error.message); else { setOrders(rows); setLoadError(''); }
  }, []);

  const loadEvents = useCallback(async () => {
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const { rows, error } = await fetchAll<any>((f, t) =>
      supabase.from('site_events').select('event_type,session_id,country,source,created_at')
        .gte('created_at', since).order('created_at', { ascending: false }).range(f, t));
    setEvents(error ? [] : rows);
  }, []);

  const loadSettings = useCallback(async () => {
    let val: number | null = null;
    try {
      const { data, error } = await supabase.from('store_settings').select('key,value').eq('key', 'monthly_target').maybeSingle();
      if (!error && data?.value) val = Number(data.value);
    } catch { /* ignore */ }
    if (val === null) { try { const l = localStorage.getItem('monthly_target'); if (l) val = Number(l); } catch { /* ignore */ } }
    if (val && val > 0) { setTarget(val); setTargetInput(String(val)); }
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setBannersList(data);
      }
    } catch (e) {
      console.log('Error loading banners:', e);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) {
        setCatList(data);
        try {
          localStorage.setItem('muba_custom_categories', JSON.stringify(data));
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.log('Error loading categories:', e);
    }
  }, []);

  useEffect(() => {
    if (banners && banners.length > 0) {
      setBannersList(banners);
    }
  }, [banners]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([loadOrders(), loadEvents(), loadSettings(), loadBanners(), loadCategories()]).finally(() => setLoading(false));
    let channel: any;
    try {
      channel = supabase.channel('admin-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
        .subscribe();
    } catch { /* realtime বন্ধ থাকলেও সমস্যা নেই */ }
    return () => { try { if (channel) supabase.removeChannel(channel); } catch { /* ignore */ } };
  }, [isOpen, loadOrders, loadEvents, loadSettings, loadBanners, loadCategories]);

  /* ----------------------- Flash Sale Handlers ----------------------- */
  const toggleFlashSale = async (product: { id: string; is_flash_sale?: boolean }) => {
    const nextStatus = !product.is_flash_sale;
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_flash_sale: nextStatus })
        .eq('id', product.id);

      if (error) throw error;

      notify(nextStatus ? 'প্রোডাক্টটি Flash Sale-এ যোগ করা হয়েছে' : 'প্রোডাক্টটি Flash Sale থেকে বাদ দেওয়া হয়েছে');
      onRefreshProducts();
    } catch (err: any) {
      console.error('Error toggling flash sale:', err);
      notify('Flash Sale আপডেট করা যায়নি', false);
    }
  };

  /* ----------------------- Category Handlers ----------------------- */
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      notify('অনুগ্রহ করে ক্যাটাগরির ইংরেজি নাম প্রদান করুন', false);
      return;
    }

    setCategorySaving(true);
    const cleanSlug = (categoryForm.slug.trim() || categoryForm.name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `cat-${Date.now().toString(36)}`;

    const sortNum = parseInt(String(categoryForm.sort_order), 10) || 0;

    const payload: any = {
      name: categoryForm.name.trim(),
      name_en: categoryForm.name.trim(),
      name_bn: categoryForm.name_bn.trim() || categoryForm.name.trim(),
      slug: cleanSlug,
      icon: categoryForm.icon || 'Tag',
      sub_label: categoryForm.sub_label.trim() || null,
      image_url: categoryForm.image_url.trim() || null,
      sort_order: sortNum,
      is_active: categoryForm.is_active !== false,
    };

    let savedCategory: Category | null = null;
    let savedInDb = false;

    try {
      if (editingCategoryId) {
        if (isValidUuid(editingCategoryId)) {
          const { data, error } = await supabase
            .from('categories')
            .update(payload)
            .eq('id', editingCategoryId)
            .select('*')
            .maybeSingle();

          if (!error && data) {
            savedCategory = data;
            savedInDb = true;
          }
        }
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([payload])
          .select('*')
          .maybeSingle();

        if (!error && data) {
          savedCategory = data;
          savedInDb = true;
        }
      }
    } catch (err) {
      console.warn('Supabase category operation failed, using local sync:', err);
    }

    if (!savedCategory) {
      const generatedId = editingCategoryId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`);
      savedCategory = {
        id: generatedId,
        ...payload,
        created_at: new Date().toISOString()
      };
    }

    setCatList((prev) => {
      let updated: Category[];
      if (editingCategoryId) {
        updated = prev.map((c) => (c.id === editingCategoryId ? { ...c, ...savedCategory! } : c));
      } else {
        updated = [...prev, savedCategory!];
      }
      updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      try {
        localStorage.setItem('muba_custom_categories', JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });

    notify(
      editingCategoryId
        ? (savedInDb ? 'ক্যাটাগরি ডাটাবেজে আপডেট হয়েছে!' : 'ক্যাটাগরি আপডেট করা হয়েছে!')
        : (savedInDb ? 'নতুন ক্যাটাগরি সফলভাবে যোগ হয়েছে!' : 'নতুন ক্যাটাগরি সংরক্ষিত হয়েছে!'),
      true
    );

    setCategoryForm(defaultCategoryForm);
    setEditingCategoryId(null);
    setCategorySaving(false);

    if (onRefreshCategories) onRefreshCategories();
    if (onRefreshProducts) onRefreshProducts();
  };

  const handleDeleteCategory = async (cat: Category) => {
    setDeleteConfirmCategory(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteConfirmCategory) return;
    setDeletingCategory(true);
    try {
      if (isValidUuid(deleteConfirmCategory.id)) {
        await supabase.from('categories').delete().eq('id', deleteConfirmCategory.id);
      }

      setCatList((prev) => {
        const updated = prev.filter((c) => c.id !== deleteConfirmCategory.id);
        try {
          localStorage.setItem('muba_custom_categories', JSON.stringify(updated));
        } catch { /* ignore */ }
        return updated;
      });

      notify('ক্যাটাগরি মুছে ফেলা হয়েছে', true);
      if (editingCategoryId === deleteConfirmCategory.id) {
        setEditingCategoryId(null);
        setCategoryForm(defaultCategoryForm);
      }
      if (onRefreshCategories) onRefreshCategories();
      if (onRefreshProducts) onRefreshProducts();
    } catch (e) {
      console.warn('Error deleting category from Supabase:', e);
      notify('ক্যাটাগরি মুছে ফেলা যায়নি', false);
    } finally {
      setDeletingCategory(false);
      setDeleteConfirmCategory(null);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    const newActive = !(cat.is_active !== false);
    try {
      if (isValidUuid(cat.id)) {
        await supabase.from('categories').update({ is_active: newActive }).eq('id', cat.id);
      }
    } catch (e) {
      console.warn('Error toggling category status:', e);
    }

    setCatList((prev) => {
      const updated = prev.map((c) => (c.id === cat.id ? { ...c, is_active: newActive } : c));
      try {
        localStorage.setItem('muba_custom_categories', JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });

    notify(newActive ? 'ক্যাটাগরি সক্রিয় করা হয়েছে' : 'ক্যাটাগরি নিষ্ক্রিয় করা হয়েছে', true);
    if (onRefreshCategories) onRefreshCategories();
  };

  const handleMoveCategoryOrder = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...catList].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex(c => c.id === cat.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const currentOrder = sorted[idx].sort_order ?? idx;
    const targetOrder = sorted[targetIdx].sort_order ?? targetIdx;

    const newCurrentOrder = targetOrder;
    const newTargetOrder = currentOrder === targetOrder ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1) : currentOrder;

    sorted[idx].sort_order = newCurrentOrder;
    sorted[targetIdx].sort_order = newTargetOrder;

    setCatList([...sorted]);
    try {
      localStorage.setItem('muba_custom_categories', JSON.stringify(sorted));
      if (isValidUuid(sorted[idx].id)) {
        await supabase.from('categories').update({ sort_order: newCurrentOrder }).eq('id', sorted[idx].id);
      }
      if (isValidUuid(sorted[targetIdx].id)) {
        await supabase.from('categories').update({ sort_order: newTargetOrder }).eq('id', sorted[targetIdx].id);
      }
    } catch { /* ignore */ }
    notify('ক্রম সাজানো সফল হয়েছে', true);
    if (onRefreshCategories) onRefreshCategories();
  };

  /* ----------------------- Image Upload Handlers ----------------------- */
  // প্রথম bucket না থাকলে পরের bucket এ চেষ্টা করে
  const uploadImageToBuckets = async (buckets: string[], path: string, blob: Blob): Promise<string> => {
    let lastErr: any = null;
    for (const b of buckets) {
      const { error } = await supabase.storage.from(b).upload(path, blob, {
        contentType: 'image/webp', cacheControl: '3600', upsert: true,
      });
      if (!error) {
        const { data } = supabase.storage.from(b).getPublicUrl(path);
        return data.publicUrl;
      }
      console.warn(`Upload to bucket "${b}" failed:`, error.message);
      lastErr = error;
    }
    throw lastErr || new Error('Upload failed');
  };

  const uploadErrorMsg = (err: any) => {
    const m = String(err?.message || 'Unknown error');
    return /bucket not found/i.test(m)
      ? 'Storage bucket পাওয়া যায়নি। Products পেজের "Supabase SQL কোড" একবার Run করুন।'
      : m;
  };

  const handleBannerImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন', false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('ছবির সাইজ সর্বোচ্চ ৫MB হতে পারবে', false);
      return;
    }

    setBannerUploading(true);
    setBannerUploadProgress(10);

    try {
      const compressed = await compressImage(file, 1920, 0.85);
      setBannerUploadProgress(45);

      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const publicUrl = await uploadImageToBuckets(['banners', 'product-images'], path, compressed);
      setBannerUploadProgress(85);

      setBannerForm((prev) => ({ ...prev, image_url: publicUrl }));
      setBannerUploadProgress(100);
      notify('ব্যানারের ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err: any) {
      console.error('Banner upload error:', err);
      notify('ছবি আপলোডে সমস্যা হয়েছে: ' + uploadErrorMsg(err), false);
    } finally {
      setBannerUploading(false);
      setTimeout(() => setBannerUploadProgress(0), 400);
    }
  };

  const handleCategoryImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন', false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('ছবির সাইজ সর্বোচ্চ ৫MB হতে পারবে', false);
      return;
    }

    setCategoryUploading(true);

    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const compressed = await compressImage(file, 800, 0.8);

      const publicUrl = await uploadImageToBuckets(['categories', 'category-images', 'product-images'], fileName, compressed);

      setCategoryForm((prev) => ({ ...prev, image_url: publicUrl }));
      notify('ক্যাটাগরি ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err: any) {
      console.error('Category upload error:', err);
      notify('ছবি আপলোডে সমস্যা হয়েছে: ' + uploadErrorMsg(err), false);
    } finally {
      setCategoryUploading(false);
    }
  };

  /* ----------------------- Banner Handlers ----------------------- */
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const imgUrl = bannerForm.image_url.trim();
    if (!imgUrl) {
      notify('অনুগ্রহ করে একটি ব্যানারের ছবি দিন (আপলোড বা URL)', false);
      return;
    }

    setBannerSaving(true);
    const orderNum = parseInt(bannerForm.sort_order, 10) || 0;
    const payload = {
      title: bannerForm.title.trim() || null,
      image_url: imgUrl,
      link_url: bannerForm.link_url.trim() || null,
      sort_order: orderNum,
      is_active: bannerForm.is_active,
    };

    try {
      if (editingBannerId) {
        const { error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', editingBannerId);

        if (error) {
          console.warn('Supabase banner update warning:', error.message);
        }

        setBannersList((prev) =>
          prev.map((b) => (b.id === editingBannerId ? { ...b, ...payload } : b))
        );
        notify('ব্যানার সফলভাবে আপডেট হয়েছে!');
      } else {
        const { data, error } = await supabase
          .from('banners')
          .insert([payload])
          .select();

        if (!error && data && data[0]) {
          setBannersList((prev) => [...prev, data[0]]);
        } else {
          console.warn('Supabase banner insert fallback:', error?.message);
          const newBanner: Banner = {
            id: `banner-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          } as Banner;
          setBannersList((prev) => [...prev, newBanner]);
        }
        notify('ব্যানার সফলভাবে যোগ হয়েছে!');
      }

      setBannerForm({
        title: '',
        image_url: '',
        link_url: '',
        sort_order: String((bannersList.length || 0) + 1),
        is_active: true,
      });
      setEditingBannerId(null);
      loadBanners();
      onRefreshBanners?.();
    } catch (err: any) {
      console.error('Error saving banner:', err);
      notify('ব্যানার সেভ করা যায়নি', false);
    } finally {
      setBannerSaving(false);
    }
  };

  const startEditBanner = (b: Banner) => {
    setEditingBannerId(b.id);
    setBannerForm({
      title: b.title || '',
      image_url: b.image_url || '',
      link_url: (b as any).link_url || (b as any).link || '',
      sort_order: String(b.sort_order ?? 0),
      is_active: b.is_active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditBanner = () => {
    setEditingBannerId(null);
    setBannerForm({
      title: '',
      image_url: '',
      link_url: '',
      sort_order: String((bannersList.length || 0) + 1),
      is_active: true,
    });
  };

  const toggleBannerStatus = async (b: Banner) => {
    const nextStatus = !b.is_active;
    try {
      await supabase.from('banners').update({ is_active: nextStatus }).eq('id', b.id);
    } catch (e) {
      console.warn('Toggle status warning:', e);
    }
    setBannersList((prev) =>
      prev.map((item) => (item.id === b.id ? { ...item, is_active: nextStatus } : item))
    );
    notify(nextStatus ? 'ব্যানার সক্রিয় করা হয়েছে' : 'ব্যানার নিষ্ক্রিয় করা হয়েছে');
    onRefreshBanners?.();
  };

  const moveBannerOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bannersList.length) return;

    const currentBanner = bannersList[index];
    const targetBanner = bannersList[targetIndex];

    const currentOrder = currentBanner.sort_order ?? index;
    const targetOrder = targetBanner.sort_order ?? targetIndex;

    const newOrderCurrent = targetOrder === currentOrder ? (direction === 'up' ? targetOrder - 1 : targetOrder + 1) : targetOrder;
    const newOrderTarget = currentOrder;

    const updatedList = [...bannersList];
    updatedList[index] = { ...currentBanner, sort_order: newOrderCurrent };
    updatedList[targetIndex] = { ...targetBanner, sort_order: newOrderTarget };
    updatedList.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setBannersList(updatedList);

    try {
      await Promise.all([
        supabase.from('banners').update({ sort_order: newOrderCurrent }).eq('id', currentBanner.id),
        supabase.from('banners').update({ sort_order: newOrderTarget }).eq('id', targetBanner.id),
      ]);
    } catch (e) {
      console.warn('Reorder error:', e);
    }
    notify('ব্যানারের ক্রম আপডেট হয়েছে');
    onRefreshBanners?.();
  };

  const handleDeleteBanner = async (b: Banner) => {
    try {
      await supabase.from('banners').delete().eq('id', b.id);

      if (b.image_url && b.image_url.includes('/banners/')) {
        const parts = b.image_url.split('/banners/');
        const path = parts[parts.length - 1];
        if (path) {
          await supabase.storage.from('banners').remove([path]);
        }
      }
    } catch (e) {
      console.warn('Delete banner warning:', e);
    }

    setBannersList((prev) => prev.filter((item) => item.id !== b.id));
    if (editingBannerId === b.id) {
      cancelEditBanner();
    }
    setDeleteConfirmBanner(null);
    notify('ব্যানার সফলভাবে মুছে ফেলা হয়েছে');
    onRefreshBanners?.();
  };

  /* ------------------------------ Derived ------------------------------ */
  const valid = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);
  const pendingCount = useMemo(() => orders.filter((o) => (o.status || 'pending') === 'pending').length, [orders]);

  const stats = useMemo(() => {
    const t = Date.now();
    const sum = (a: number, b: number) => valid.filter((o) => ts(o) >= a && ts(o) < b).reduce((s, o) => s + (o.total || 0), 0);
    const cnt = (a: number, b: number) => orders.filter((o) => ts(o) >= a && ts(o) < b).length;
    const visits = events.filter((e) => e.event_type === 'visit');
    const sess = (a: number, b: number) => new Set(visits.filter((e) => ts(e) >= a && ts(e) < b).map((e, i) => e.session_id || `x${i}`)).size;
    return {
      sales: valid.reduce((s, o) => s + (o.total || 0), 0),
      salesDelta: pctChange(sum(t - 7 * DAY, t + 1), sum(t - 14 * DAY, t - 7 * DAY)),
      orders: orders.length,
      ordersDelta: pctChange(cnt(t - 7 * DAY, t + 1), cnt(t - 14 * DAY, t - 7 * DAY)),
      visitors: new Set(visits.map((e, i) => e.session_id || `x${i}`)).size,
      visitorsDelta: pctChange(sess(t - 7 * DAY, t + 1), sess(t - 14 * DAY, t - 7 * DAY)),
    };
  }, [valid, orders, events]);

  const series = useMemo(() => {
    const out: { label: string; revenue: number; orders: number }[] = [];
    const map: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach((o) => {
      if (!o.created_at) return;
      const k = dayKey(new Date(o.created_at));
      map[k] = map[k] || { revenue: 0, orders: 0 };
      map[k].orders += 1;
      if (o.status !== 'cancelled') map[k].revenue += o.total || 0;
    });
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const v = map[dayKey(d)] || { revenue: 0, orders: 0 };
      out.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), ...v });
    }
    return out;
  }, [orders, rangeDays]);

  const monthly = useMemo(() => {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    const prevStart = new Date(n.getFullYear(), n.getMonth() - 1, 1).getTime();
    const cur = valid.filter((o) => ts(o) >= start).reduce((s, o) => s + (o.total || 0), 0);
    const prev = valid.filter((o) => ts(o) >= prevStart && ts(o) < start).reduce((s, o) => s + (o.total || 0), 0);
    return { cur, delta: pctChange(cur, prev) };
  }, [valid]);
  const targetPct = target > 0 ? monthly.cur / target : 0;

  const topCats = useMemo(() => {
    const byId = new Map(prods.map((p) => [p.id, p]));
    const totals: Record<string, number> = {};
    valid.forEach((o) => getItems(o).forEach((it) => {
      const p = byId.get(it.product_id ?? it.id);
      const cid = p?.category_id || 'none';
      const qty = Number(it.quantity ?? it.qty ?? 1);
      totals[cid] = (totals[cid] || 0) + Number(it.price ?? p?.price ?? 0) * qty;
    }));
    let mode: 'sales' | 'inventory' = 'sales';
    if (!Object.values(totals).some((v) => v > 0)) {
      mode = 'inventory';
      prods.forEach((p) => { const cid = p.category_id || 'none'; totals[cid] = (totals[cid] || 0) + (p.price || 0) * (p.stock ?? 0); });
    }
    const list = Object.entries(totals).filter(([, v]) => v > 0)
      .map(([id, value]) => ({ name: id === 'none' ? 'Others' : catName(id), value }))
      .sort((a, b) => b.value - a.value);
    const top = list.slice(0, 4);
    const rest = list.slice(4).reduce((s, x) => s + x.value, 0);
    if (rest > 0) top.push({ name: 'Others', value: rest });
    return { mode, list: top, total: list.reduce((s, x) => s + x.value, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, prods, cats]);

  const countries = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    const all = new Set<string>();
    events.filter((e) => e.event_type === 'visit').forEach((e, i) => {
      const sid = e.session_id || `x${i}`; const c = e.country || 'Unknown';
      (m[c] = m[c] || new Set()).add(sid); all.add(sid);
    });
    return { total: all.size, list: Object.entries(m).map(([name, s]) => ({ name, n: s.size })).sort((a, b) => b.n - a.n).slice(0, 4) };
  }, [events]);

  const sources = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    events.filter((e) => e.event_type === 'visit').forEach((e, i) => { const s = e.source || 'direct'; (m[s] = m[s] || new Set()).add(e.session_id || `x${i}`); });
    const total = Object.values(m).reduce((s, x) => s + x.size, 0);
    return { total, list: Object.keys(SOURCE_LABEL).map((k) => ({ key: k, label: SOURCE_LABEL[k], n: m[k]?.size || 0 })).sort((a, b) => b.n - a.n) };
  }, [events]);

  const funnel = useMemo(() => {
    const since = Date.now() - funnelDays * DAY;
    const ev = events.filter((e) => ts(e) >= since);
    const set = (type: string) => new Set(ev.filter((e) => e.event_type === type).map((e, i) => e.session_id || `x${i}`));
    const views = ev.filter((e) => e.event_type === 'product_view').length;
    const cart = set('add_to_cart'), chk = set('checkout_start'), buy = set('purchase');
    const abandoned = Array.from(cart).filter((s) => !buy.has(s)).length;
    return [
      { label: 'Product Views', n: views }, { label: 'Add to Cart', n: cart.size },
      { label: 'Proceed to Checkout', n: chk.size }, { label: 'Completed Purchases', n: buy.size },
      { label: 'Abandoned Carts', n: abandoned },
    ];
  }, [events, funnelDays]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) =>
      (orderStatus === 'all' || (o.status || 'pending') === orderStatus) &&
      (!q || [o.order_number, o.customer_name, o.phone, o.address].some((v) => (v || '').toLowerCase().includes(q))));
  }, [orders, orderQuery, orderStatus]);

  const customers = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; address: string; count: number; spent: number; last: number }>();
    orders.forEach((o) => {
      const key = o.phone || o.customer_name || 'unknown';
      const c = m.get(key) || { name: o.customer_name || '—', phone: o.phone || '—', address: o.address || '', count: 0, spent: 0, last: 0 };
      c.count += 1; if (o.status !== 'cancelled') c.spent += o.total || 0; c.last = Math.max(c.last, ts(o));
      m.set(key, c);
    });
    const q = customerQuery.trim().toLowerCase();
    return Array.from(m.values()).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)).sort((a, b) => b.spent - a.spent);
  }, [orders, customerQuery]);

  const reportOrders = useMemo(() => {
    const a = new Date(reportFrom + 'T00:00:00').getTime(), b = new Date(reportTo + 'T23:59:59').getTime();
    return orders.filter((o) => ts(o) >= a && ts(o) <= b);
  }, [orders, reportFrom, reportTo]);

  /* ------------------------------ Actions ------------------------------ */
  const updateStatus = async (id: string, status: string) => {
    const old = orders;
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { setOrders(old); notify('Status আপডেট হয়নি: ' + error.message, false); } else notify('Order status updated');
  };

  const handleMultipleImageUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImage(file);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${cleanName}`;

        const { error } = await supabase.storage.from('product-images').upload(path, compressed, {
          cacheControl: '3600',
          upsert: true
        });

        if (!error) {
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
          if (urlData?.publicUrl) {
            newUrls.push(urlData.publicUrl);
            continue;
          }
        }

        console.warn('Supabase storage fallback used:', error?.message);
        const base64Url = await blobToBase64(compressed);
        newUrls.push(base64Url);
      } catch (err) {
        console.error('File process error:', err);
        try {
          const fallbackBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newUrls.push(fallbackBase64);
        } catch {
          notify(`Failed to process ${file.name}`, false);
        }
      }
    }

    if (newUrls.length > 0) {
      setForm((prev) => {
        const updatedImages = [...(prev.images || []), ...newUrls];
        return {
          ...prev,
          images: updatedImages,
          image_url: prev.image_url || updatedImages[0] || '',
        };
      });
      notify(`${newUrls.length} টি ছবি যোগ হয়েছে!`);
    }
    setUploading(false);
  };

  const removeImage = (indexToRemove: number) => {
    setForm((prev) => {
      const updated = prev.images.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        image_url: updated[0] || '',
      };
    });
  };

  const setAsMainImage = (url: string) => {
    setForm((prev) => {
      const reordered = [url, ...prev.images.filter((img) => img !== url)];
      return {
        ...prev,
        images: reordered,
        image_url: url,
      };
    });
    notify('মেইন ইমেজ হিসেবে সেট করা হয়েছে');
  };

  const addImageUrl = () => {
    const val = imageUrlInput.trim();
    if (!val) return;
    if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('data:image/')) {
      notify('সঠিক ইমেজ URL দিন (https://...)', false);
      return;
    }
    setForm((prev) => {
      const updated = [...(prev.images || []), val];
      return {
        ...prev,
        images: updated,
        image_url: prev.image_url || val,
      };
    });
    setImageUrlInput('');
    notify('ছবির লিঙ্ক যোগ হয়েছে!');
  };

  const openForm = (p?: any) => {
    let initialImages: string[] = [];
    if (p?.images && Array.isArray(p.images) && p.images.length > 0) {
      initialImages = [...p.images];
    } else if (p?.image_url) {
      initialImages = [p.image_url];
    }

    setForm(p ? {
      id: p.id,
      name: p.name || '',
      name_bn: p.name_bn || '',
      description: p.description || '',
      description_bn: p.description_bn || '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? 50),
      category_id: p.category_id || '',
      image_url: p.image_url || initialImages[0] || '',
      images: initialImages,
      enable_size: !!p.enable_size,
      enable_color: !!p.enable_color,
      sizes: p.sizes || (p.variants ? p.variants.filter((v: any) => v.name === 'Size').map((v: any) => v.value) : []),
      colors: p.colors || (p.variants ? p.variants.filter((v: any) => v.name === 'Color').map((v: any) => v.value) : []),
    } : {
      ...emptyForm,
      category_id: '',
      images: [],
      sizes: [],
      colors: [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true);

    const primaryImage = (form.images && form.images.length > 0)
      ? form.images[0]
      : (form.image_url.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');

    const allImages = (form.images && form.images.length > 0)
      ? form.images
      : [primaryImage];

    if (!form.category_id || !isValidUuid(form.category_id)) {
      notify('অনুগ্রহ করে একটি ক্যাটাগরি নির্বাচন করুন', false);
      setSaving(false);
      return;
    }

    const validCategoryId = form.category_id.trim();
    const isExistingDbProduct = isValidUuid(form.id);

    const payload: Record<string, any> = {
      name: form.name.trim(),
      name_bn: form.name_bn.trim() || form.name.trim(),
      description: form.description.trim(),
      description_bn: form.description_bn.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock || '0', 10),
      image_url: primaryImage,
      images: allImages,
      category_id: validCategoryId,
      enable_size: !!form.enable_size,
      enable_color: !!form.enable_color,
      sizes: form.sizes || [],
      colors: form.colors || [],
    };

    if (!isExistingDbProduct) {
      payload.slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4);
    }

    const saveAttempt = async (dataToSave: Record<string, any>) => {
      if (isExistingDbProduct && form.id) {
        return await supabase.from('products').update(dataToSave).eq('id', form.id);
      } else {
        return await supabase.from('products').insert(dataToSave);
      }
    };

    let result = await saveAttempt(payload);

    const omittedCols: string[] = [];
    let retries = 5;
    while (result.error && retries > 0) {
      retries--;
      const msg = result.error.message || '';

      if (msg.includes('Could not find the')) {
        const match = msg.match(/Could not find the '([^']+)' column/);
        const missingCol = match ? match[1] : null;
        if (missingCol && missingCol in payload) {
          delete payload[missingCol];
          omittedCols.push(missingCol);
          console.warn(`Retrying save without missing column: ${missingCol}`);
          result = await saveAttempt(payload);
          continue;
        }
      }

      if (msg.includes('invalid input syntax for type uuid') || msg.includes('foreign key') || msg.includes('category_id')) {
        if ('category_id' in payload && payload.category_id !== null) {
          console.warn('Retrying save with category_id = null');
          payload.category_id = null;
          result = await saveAttempt(payload);
          continue;
        }
      }

      if (msg.includes('unique') && msg.includes('slug')) {
        payload.slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 8);
        result = await saveAttempt(payload);
        continue;
      }

      break;
    }

    setSaving(false);

    try {
      const prodId = form.id || payload.slug || form.name.trim();
      const savedMap = localStorage.getItem('muba_product_variations_map');
      const map = savedMap ? JSON.parse(savedMap) : {};
      const varData = {
        enable_size: !!form.enable_size,
        enable_color: !!form.enable_color,
        sizes: form.sizes || [],
        colors: form.colors || [],
      };
      map[prodId] = varData;
      if (form.id) map[form.id] = varData;
      if (payload.slug) map[payload.slug] = varData;
      if (form.name) map[form.name.trim()] = varData;
      localStorage.setItem('muba_product_variations_map', JSON.stringify(map));
    } catch { /* ignore */ }

    if (result.error) {
      notify('Save হয়নি: ' + result.error.message, false);
      return;
    }

    if (omittedCols.length > 0) {
      notify(`প্রোডাক্ট সেভ হয়েছে! (নোট: Supabase-এ ${omittedCols.join(', ')} যোগ করতে SQL কোডটি রান করুন)`);
    } else {
      notify(form.id ? 'Product updated successfully' : 'Product added successfully');
    }

    setShowForm(false);
    setForm(emptyForm);
    setImageUrlInput('');
    onRefreshProducts();
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    const id = deleteConfirmProduct.id;
    setDeletingProduct(true);
    try {
      if (isValidUuid(id)) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          console.warn('Supabase product delete warning:', error.message);
        }
      }
      notify('প্রোডাক্ট সফলভাবে ডিলিট হয়েছে', true);
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      console.warn('Error deleting product:', err);
      notify('প্রোডাক্ট সফলভাবে ডিলিট হয়েছে', true);
      if (onRefreshProducts) onRefreshProducts();
    } finally {
      setDeletingProduct(false);
      setDeleteConfirmProduct(null);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    const id = deleteConfirmOrder.id;
    if (!id) {
      setDeleteConfirmOrder(null);
      return;
    }
    setDeletingOrder(true);
    try {
      try { await supabase.from('order_items').delete().eq('order_id', id); } catch { /* ignore */ }
      if (isValidUuid(id)) {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) {
          console.warn('Supabase order delete warning:', error.message);
        }
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (expanded === id) setExpanded(null);
      notify('অর্ডার সফলভাবে ডিলিট হয়েছে', true);
    } catch (err: any) {
      console.warn('Error deleting order:', err);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (expanded === id) setExpanded(null);
      notify('অর্ডার সফলভাবে ডিলিট হয়েছে', true);
    } finally {
      setDeletingOrder(false);
      setDeleteConfirmOrder(null);
    }
  };

  const saveTarget = async () => {
    const v = Number(targetInput);
    if (!v || v <= 0) { notify('সঠিক টার্গেট দিন', false); return; }
    setTarget(v);
    try { localStorage.setItem('monthly_target', String(v)); } catch { /* ignore */ }
    try { await supabase.from('store_settings').upsert({ key: 'monthly_target', value: String(v) }, { onConflict: 'key' }); } catch { /* ignore */ }
    notify('Monthly target saved');
  };

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Order No', 'Date', 'Customer', 'Phone', 'Address', 'Zone', 'Payment', 'Status', 'Total'];
    const lines = reportOrders.map((o) => [o.order_number, o.created_at ? new Date(o.created_at).toLocaleString('en-GB') : '', o.customer_name, o.phone, o.address, o.delivery_zone, o.payment_method, o.status || 'pending', o.total].map(esc).join(','));
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `orders-${reportFrom}_to_${reportTo}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!isOpen) return null;

  const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-[18px] h-[18px]" /> },
    { id: 'categories', label: 'ক্যাটাগরি (Categories)', icon: <FolderTree className="w-[18px] h-[18px]" /> },
    { id: 'flashSales', label: 'Flash Sales', icon: <Zap className="w-[18px] h-[18px]" /> },
    { id: 'trackingPixels', label: 'ট্র্যাকিং পিক্সেল (Pixels)', icon: <Target className="w-[18px] h-[18px]" /> },
    { id: 'courier', label: 'কুরিয়ার (Courier API)', icon: <Truck className="w-[18px] h-[18px]" /> },
    { id: 'banners', label: 'ব্যানার (Banners)', icon: <ImageIcon className="w-[18px] h-[18px]" /> },
    { id: 'deliveryZones', label: 'ডেলিভারি চার্জ (Zones)', icon: <Truck className="w-[18px] h-[18px]" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-[18px] h-[18px]" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: 'tracking', label: 'Tracking', icon: <Bell className="w-[18px] h-[18px]" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-[18px] h-[18px]" /> },
  ];
  const pageTitle = NAV.find((n) => n.id === page)?.label || page;

  const statCards = [
    { label: 'Total Sales', value: money(stats.sales), d: stats.salesDelta as number | null, icon: <DollarSign className="w-4 h-4" />, accent: 'bg-blue-600 text-white', tint: true },
    { label: 'Total Orders', value: stats.orders.toLocaleString(), d: stats.ordersDelta as number | null, icon: <ShoppingCart className="w-4 h-4" />, accent: 'bg-blue-50 text-blue-600', tint: false },
    { label: 'Total Visitors', value: stats.visitors.toLocaleString(), d: stats.visitorsDelta as number | null, icon: <Eye className="w-4 h-4" />, accent: 'bg-blue-50 text-blue-600', tint: false },
    { label: 'Pending Orders', value: pendingCount.toLocaleString(), d: null as number | null, icon: <Clock className="w-4 h-4" />, accent: 'bg-amber-50 text-amber-600', tint: false },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900">
      <style>{`
        .admin-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .admin-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .admin-scroll::-webkit-scrollbar-track { background: transparent; }
        .admin-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .admin-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .admin-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .admin-scroll::-webkit-scrollbar-corner { background: transparent; }
      `}</style>
      {navOpen && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setNavOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col p-4 transition-transform duration-200 lg:static lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 py-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30"><Store className="w-5 h-5" /></div>
            <div className="leading-tight"><p className="font-extrabold text-lg">Muba Admin</p><p className="text-[11px] text-slate-400">মুবা গ্যাজেটস</p></div>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setNavOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="admin-scroll flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setPage(n.id); setNavOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${page === n.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
              {n.icon}<span className="text-left">{n.label}</span>
              {n.id === 'orders' && pendingCount > 0 && (
                <span className={`ml-auto text-[10px] font-bold rounded-full px-2 py-0.5 ${page === 'orders' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
        <button onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="w-[18px] h-[18px]" /> Back to store
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3 border-b border-slate-200">
          <button className="lg:hidden p-2 rounded-xl bg-white border border-slate-200" onClick={() => setNavOpen(true)} aria-label="Menu"><Menu className="w-5 h-5" /></button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold leading-tight truncate">{pageTitle}</h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-2 rounded-xl">
            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">ওয়েবসাইট দেখুন</span><span className="sm:hidden">সাইট</span>
          </a>
        </header>

        {/* Content */}
        <main className="admin-scroll flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading && <div className="h-1 rounded bg-blue-100 overflow-hidden mb-4"><div className="h-full w-1/3 bg-blue-600 animate-pulse" /></div>}
          {loadError && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">{loadError}</div>}

          {/* ============================ DASHBOARD ============================ */}
          {page === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">

              {/* Row 1: Stat cards */}
              {statCards.map((s) => (
                <div key={s.label} className={`xl:col-span-3 min-w-0 rounded-2xl p-5 border shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${s.tint ? 'bg-gradient-to-br from-blue-50 to-white border-blue-100' : 'bg-white border-slate-200/80'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{s.label}</span>
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.accent}`}>{s.icon}</span>
                  </div>
                  <div className="flex items-end justify-between mt-5 gap-2">
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{s.value}</p>
                    {s.d !== null && (
                      <div className="text-right leading-tight shrink-0"><Delta v={s.d} /><p className="text-[10px] text-slate-400">vs last week</p></div>
                    )}
                  </div>
                </div>
              ))}

              {/* Row 2: Revenue + Monthly target */}
              <Card className="sm:col-span-2 xl:col-span-8">
                <CardHeader
                  title="Revenue Analytics"
                  sub="দৈনিক রেভিনিউ ও অর্ডার"
                  right={<Select value={rangeDays} onChange={setRangeDays} options={[[7, 'Last 7 Days'], [14, 'Last 14 Days'], [30, 'Last 30 Days']]} />}
                />
                <div className="flex gap-4 text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600 rounded" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-amber-500" />Orders</span>
                </div>
                <RevenueChart data={series} />
              </Card>

              <Card className="sm:col-span-2 xl:col-span-4">
                <CardHeader
                  title="Monthly Target"
                  sub="এই মাসের বিক্রয় লক্ষ্য"
                  right={<button onClick={() => setPage('settings')} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>}
                />
                <Gauge pct={targetPct} />
                <p className="text-center text-xs -mt-1"><Delta v={monthly.delta} /> <span className="text-slate-500">from last month</span></p>
                <p className="text-center font-bold mt-3">{targetPct >= 1 ? 'Target achieved! 🎉' : 'Keep going!'}</p>
                <p className="text-center text-xs text-slate-500 mt-1 px-2">
                  {targetPct >= 1 ? 'এই মাসের টার্গেট পূরণ হয়েছে।' : `১০০% পূর্ণ করতে আরও ${money(target - monthly.cur)} দরকার।`}
                </p>
                <div className="grid grid-cols-2 mt-4 rounded-xl bg-blue-50 text-center overflow-hidden">
                  <div className="py-3 border-r border-white"><p className="text-[11px] text-slate-500">Target</p><p className="font-bold text-sm">{money(target)}</p></div>
                  <div className="py-3"><p className="text-[11px] text-slate-500">Revenue</p><p className="font-bold text-sm">{money(monthly.cur)}</p></div>
                </div>
              </Card>

              {/* Row 3: Categories, Active users, Traffic */}
              <Card className="xl:col-span-4">
                <CardHeader
                  title="Top Categories"
                  right={<button onClick={() => setPage('products')} className="text-xs font-bold text-blue-600 hover:underline">See All</button>}
                />
                {topCats.list.length === 0 ? <Empty text="এখনো কোনো ডাটা নেই" /> : (
                  <>
                    <Donut parts={topCats.list} centerTop={topCats.mode === 'sales' ? 'Total Sales' : 'Inventory Value'} centerBottom={money(topCats.total)} />
                    <ul className="mt-4 space-y-2.5">
                      {topCats.list.map((c, i) => (
                        <li key={c.name + i} className="flex items-center justify-between text-sm gap-2">
                          <span className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SHADES[i % SHADES.length] }} /><span className="truncate text-slate-700">{c.name}</span></span>
                          <span className="font-semibold shrink-0">{money(c.value)}</span>
                        </li>
                      ))}
                    </ul>
                    {topCats.mode === 'inventory' && <p className="text-[11px] text-slate-400 mt-3">Orders-এ items সেভ হলে এটা আসল সেলস দেখাবে।</p>}
                  </>
                )}
              </Card>

              <Card className="xl:col-span-4">
                <CardHeader title="Active Users" sub="গত ৩০ দিনের ভিজিটর" />
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-extrabold">{countries.total.toLocaleString()}</p>
                  <span className="text-xs font-bold bg-emerald-50 rounded-md px-2 py-1"><Delta v={stats.visitorsDelta} /></span>
                </div>
                <div className="mt-5 space-y-4">
                  {countries.list.length === 0 && <Empty text="Visitor ডাটা নেই" />}
                  {countries.list.map((c) => {
                    const p = countries.total ? (c.n / countries.total) * 100 : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-sm mb-1.5"><span className="text-slate-700">{c.name}</span><span className="font-semibold">{p.toFixed(p % 1 ? 1 : 0)}%</span></div>
                        <div className="h-2 rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${p}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="sm:col-span-2 xl:col-span-4">
                <CardHeader title="Traffic Sources" sub="ভিজিটর কোথা থেকে আসছে" />
                <div className="flex h-12 gap-1 rounded-lg overflow-hidden bg-blue-50">
                  {sources.total > 0 && sources.list.filter((s) => s.n > 0).map((s, i) => (
                    <div key={s.key} style={{ width: `${(s.n / sources.total) * 100}%`, background: SHADES[i % SHADES.length] }} title={`${s.label}: ${s.n}`} />
                  ))}
                </div>
                <ul className="mt-5 space-y-3">
                  {sources.list.map((s, i) => (
                    <li key={s.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SHADES[i % SHADES.length] }} />{s.label}</span>
                      <span className="font-semibold">{sources.total ? Math.round((s.n / sources.total) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Row 4: Conversion funnel */}
              <Card className="sm:col-span-2 xl:col-span-12">
                <CardHeader
                  title="Conversion Rate"
                  sub="প্রোডাক্ট ভিউ থেকে কেনা পর্যন্ত"
                  right={<Select value={funnelDays} onChange={setFunnelDays} options={[[7, 'This Week'], [30, 'This Month']]} />}
                />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-4">
                  {funnel.map((f, i) => {
                    const max = Math.max(...funnel.map((x) => x.n), 1);
                    const prev = i === 0 ? 0 : i === 4 ? funnel[1].n : funnel[i - 1].n;
                    const pct = prev ? Math.round((f.n / prev) * 100) : 0;
                    const shade = ['#DBEAFE', '#BFDBFE', '#93C5FD', '#3B82F6', '#FDA4AF'][i];
                    return (
                      <div key={f.label} className={`px-3 pt-1 flex flex-col ${i > 0 ? 'sm:border-l border-slate-100' : ''}`}>
                        <p className="text-[11px] text-slate-500 h-8 leading-tight">{f.label}</p>
                        <p className="text-xl font-extrabold mt-1">{f.n.toLocaleString()}</p>
                        {i > 0 && <span className={`self-start mt-1 text-[10px] font-bold rounded px-1.5 py-0.5 ${i === 4 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{pct}% {i === 4 ? 'of carts' : 'of prev'}</span>}
                        <div className="h-28 flex items-end mt-3 -mx-3">
                          <div className="w-full rounded-t-2xl" style={{ height: `${Math.max((f.n / max) * 100, 5)}%`, background: shade }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {events.length === 0 && !loading && (
                <div className="sm:col-span-2 xl:col-span-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm px-4 py-3">
                  Visitor, funnel ও traffic ডাটা এখনো আসছে না। SQL চালানো ও <code>analytics.ts</code> যোগ করা হলে এগুলো নিজে থেকেই ভরে যাবে। Sales, orders ও revenue ইতোমধ্যে আসল ডাটা দেখাচ্ছে।
                </div>
              )}
            </div>
          )}

          {/* ============================== ORDERS ============================== */}
          {page === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} placeholder="Order no, name, phone, address..." className={inputCls + ' sm:max-w-sm bg-white'} />
                <div className="admin-scroll flex gap-2 overflow-x-auto pb-1">
                  {['all', ...STATUSES].map((s) => (
                    <button key={s} onClick={() => setOrderStatus(s)}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold capitalize border ${orderStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {s}{s !== 'all' && ` (${orders.filter((o) => (o.status || 'pending') === s).length})`}
                    </button>
                  ))}
                </div>
              </div>
              {filteredOrders.length === 0 ? <Card><Empty text="কোনো অর্ডার পাওয়া যায়নি।" /></Card> : filteredOrders.map((o, idx) => {
                const key = o.id || String(idx); const st = o.status || 'pending'; const items = getItems(o);
                return (
                  <Card key={key} className="!p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-blue-600">{o.order_number || '#' + (o.id || '').slice(0, 6)}</span>
                          {o.payment_method && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{o.payment_method}</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${STATUS_STYLE[st] || 'bg-gray-100'}`}>{st}</span>
                        </div>
                        <p className="text-sm font-bold">{o.customer_name} <span className="font-normal text-slate-500">— {o.phone}</span></p>
                        <p className="text-xs text-slate-500">{o.address}{o.delivery_zone ? ` (${o.delivery_zone})` : ''}</p>
                        {o.created_at && <p className="text-[11px] text-slate-400">{new Date(o.created_at).toLocaleString('en-GB')}</p>}
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-0 pt-3 md:pt-0">
                        <div><p className="text-[11px] text-slate-400">Total</p><p className="font-extrabold">{money(o.total || 0)}</p></div>
                        <select value={st} onChange={(e) => o.id && updateStatus(o.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold capitalize focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {items.length > 0 && <button onClick={() => setExpanded(expanded === key ? null : key)} className="text-xs font-semibold text-blue-600">{expanded === key ? 'Hide' : 'Items'}</button>}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmOrder(o)}
                          disabled={!o.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition disabled:opacity-40"
                          title="অর্ডার ডিলিট করুন"
                          aria-label="Delete order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expanded === key && items.length > 0 && (
                      <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-700">
                        {items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3"><span>{it.name || it.title || it.product_id || 'Item'} × {it.quantity ?? it.qty ?? 1}</span><span className="font-semibold">{money(Number(it.price || 0) * Number(it.quantity ?? it.qty ?? 1))}</span></li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ============================== TRACKING ============================== */}
          {page === 'tracking' && <TrackingTab />}

          {/* ========================== TRACKING PIXELS ========================== */}
          {page === 'trackingPixels' && <TrackingPixelsPage notify={notify} />}

          {/* ============================ COURIER API ============================ */}
          {page === 'courier' && <CourierPage notify={notify} />}

          {/* ============================= PRODUCTS ============================= */}
          {page === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products..." className={inputCls + ' sm:max-w-sm bg-white'} />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(true)}
                    className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-blue-600" />
                    Supabase SQL কোড
                  </button>
                  <button type="button" onClick={() => (showForm ? setShowForm(false) : openForm())} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl">
                    {showForm ? <><X className="w-4 h-4" />Close</> : <><Plus className="w-4 h-4" />Add product</>}
                  </button>
                </div>
              </div>

              {showForm && (
                <Card>
                  <h3 className="font-bold mb-4 text-lg">{form.id ? 'Edit product' : 'New product'}</h3>
                  <form onSubmit={saveProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                    <input placeholder="বাংলা নাম (optional)" value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className={inputCls} />
                    <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + ' col-span-full'} rows={3} />
                    <div className="flex items-center gap-2">
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                        className={inputCls + ' flex-1'}
                      >
                        <option value="">ক্যাটাগরি নির্বাচন করুন (No category)</option>
                        {catList.filter(c => c.is_active !== false).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.name_bn} / {c.name_bn || c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setPage('categories');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border border-blue-200"
                        title="নতুন ক্যাটাগরি তৈরি করুন"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">নতুন ক্যাটাগরি</span>
                      </button>
                    </div>
                    <input required type="number" min="0" step="any" placeholder="Price (BDT)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
                    <input type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />

                    {/* Multiple Images Upload & Gallery */}
                    <div className="col-span-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          প্রোডাক্টের ছবিসমূহ (Multiple Images)
                          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                            {form.images?.length || 0} টি ছবি
                          </span>
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          প্রথম ছবিটি মূল (Main) হিসেবে প্রদর্শিত হবে। যেকোনো ছবির &quot;Set Main&quot; ক্লিক করে মূল ছবি পরিবর্তন করতে পারবেন।
                        </p>
                      </div>

                      {form.images && form.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                          {form.images.map((imgUrl, idx) => {
                            const isMain = idx === 0 || imgUrl === form.image_url;
                            return (
                              <div
                                key={idx}
                                className={`relative group rounded-xl overflow-hidden border-2 bg-white aspect-square flex items-center justify-center ${
                                  isMain ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                <img src={imgUrl} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />

                                {isMain ? (
                                  <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow">MAIN</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAsMainImage(imgUrl)}
                                    className="absolute top-1.5 left-1.5 bg-slate-900/80 hover:bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shadow"
                                    title="Make this the main image"
                                  >
                                    Set Main
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1.5 right-1.5 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow cursor-pointer"
                                  title="Remove image"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <label className="sm:col-span-2 block border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-4 text-center cursor-pointer transition">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploading}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                handleMultipleImageUpload(e.target.files);
                              }
                            }}
                          />
                          <div className="flex flex-col items-center justify-center gap-1">
                            {uploading ? (
                              <>
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-bold text-blue-600">ছবি আপলোড হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-6 h-6 text-blue-600" />
                                <span className="text-xs font-bold text-slate-700">
                                  ছবি আপলোড করতে ক্লিক করুন (এক সাথে একাধিক ছবি সিলেক্ট করা যাবে)
                                </span>
                                <span className="text-[11px] text-slate-400">PNG, JPG, WEBP (Auto Compressed)</span>
                              </>
                            )}
                          </div>
                        </label>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <span className="text-xs font-semibold text-slate-700">বা ছবির URL যোগ করুন:</span>
                          <div className="flex gap-1.5 mt-2">
                            <input
                              type="url"
                              placeholder="https://images.unsplash..."
                              value={imageUrlInput}
                              onChange={(e) => setImageUrlInput(e.target.value)}
                              className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={addImageUrl}
                              disabled={!imageUrlInput.trim()}
                              className="bg-slate-900 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition"
                            >
                              যোগ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Variations (Optional) */}
                    <div className="col-span-full space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                      <div>
                        <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          প্রোডাক্ট ভেরিয়েশন (Product Variations - Optional)
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">সাইজ বা কালার ভেরিয়েশন যোগ করতে চাইলে নিচের অপশনগুলো চালু করুন।</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Enable Size */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-slate-800">Enable Size Variation (সাইজ)</span>
                            <input
                              type="checkbox"
                              checked={form.enable_size}
                              onChange={(e) => setForm({ ...form, enable_size: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                          </label>
                          {form.enable_size && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="যেমন: S, M, L, XL, 256GB"
                                  value={sizeInput}
                                  onChange={(e) => setSizeInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizeOption(); } }}
                                  className={inputCls + ' text-xs'}
                                />
                                <button
                                  type="button"
                                  onClick={addSizeOption}
                                  className="px-3 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shrink-0 transition"
                                >
                                  যোগ
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {form.sizes.map((sz, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                                    {sz}
                                    <button type="button" onClick={() => removeSizeOption(idx)} className="text-blue-400 hover:text-rose-600 ml-1">×</button>
                                  </span>
                                ))}
                                {form.sizes.length === 0 && <span className="text-xs text-slate-400 italic">কোনো সাইজ যোগ করা হয়নি</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enable Color */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-slate-800">Enable Color Variation (কালার)</span>
                            <input
                              type="checkbox"
                              checked={form.enable_color}
                              onChange={(e) => setForm({ ...form, enable_color: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                          </label>
                          {form.enable_color && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="যেমন: Black, Red, Space Gray"
                                  value={colorInput}
                                  onChange={(e) => setColorInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorOption(); } }}
                                  className={inputCls + ' text-xs'}
                                />
                                <button
                                  type="button"
                                  onClick={addColorOption}
                                  className="px-3 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shrink-0 transition"
                                >
                                  যোগ
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {form.colors.map((col, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-purple-200">
                                    {col}
                                    <button type="button" onClick={() => removeColorOption(idx)} className="text-purple-400 hover:text-rose-600 ml-1">×</button>
                                  </span>
                                ))}
                                {form.colors.length === 0 && <span className="text-xs text-slate-400 italic">কোনো কালার যোগ করা হয়নি</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
                      <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200">Cancel</button>
                      <button type="submit" disabled={saving || uploading} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 inline-flex items-center gap-2">
                        <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {prods.filter((p) => !productQuery || (p.name + ' ' + (p.name_bn || '')).toLowerCase().includes(productQuery.toLowerCase())).map((p) => (
                  <Card key={p.id} className="!p-3 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-blue-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} /> : <Package className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{catName(p.category_id)}</p>
                      <p className="text-sm font-extrabold text-blue-600">{money(p.price)}
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${(p.stock ?? 0) <= 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>Stock {p.stock ?? 0}</span></p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => toggleFlashSale(p)} className={`p-2 rounded-lg ${p.is_flash_sale ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} aria-label="Flash Sale"><Zap className="w-4 h-4" /></button>
                      <button type="button" onClick={() => openForm(p)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleteConfirmProduct(p)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Card>
                ))}
              </div>
              {prods.length === 0 && <Card><Empty text="কোনো প্রোডাক্ট নেই। উপরের Add product বাটনে চাপুন।" /></Card>}
            </div>
          )}

          {/* ============================= CATEGORIES ============================= */}
          {page === 'categories' && (
            <div className="space-y-6">
              <Card className="!p-5 sm:!p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-blue-600" />
                      {editingCategoryId ? 'ক্যাটাগরি সম্পাদনা (Edit Category)' : 'নতুন ক্যাটাগরি যোগ করুন (Add New Category)'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ওয়েবসাইটের হোম পেজ, নেভবার ও প্রোডাক্ট যোগ ফর্মে রিয়েল-টাইমে আপডেট হবে
                    </p>
                  </div>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm(defaultCategoryForm);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg self-start sm:self-auto transition"
                    >
                      সম্পাদনা বাতিল
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ইংরেজি নাম (English Name) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Smartwatches"
                        value={categoryForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCategoryForm((prev) => ({
                            ...prev,
                            name: val,
                            slug: editingCategoryId ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                          }));
                        }}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        বাংলা নাম (Bangla Name) <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: স্মার্টওয়াচ"
                        value={categoryForm.name_bn}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, name_bn: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        সাব-লেবেল (Sub-label) <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: 40+ আইটেম, নতুন কালেকশন"
                        value={categoryForm.sub_label}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, sub_label: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        স্লাগ (URL Slug)
                      </label>
                      <input
                        type="text"
                        placeholder="smartwatches"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                        className={inputCls}
                      />
                      <span className="text-[10px] text-slate-400">ফিল্টার লিঙ্ক: /shop বা ?category={categoryForm.slug || 'slug'}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ক্রম নম্বর (Sort Order)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={categoryForm.sort_order}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                        className={inputCls}
                      />
                      <span className="text-[10px] text-slate-400">ছোট সংখ্যা আগে দেখাবে (০, ১, ২...)</span>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="block text-xs font-bold text-slate-700 mb-2">স্ট্যাটাস</label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={categoryForm.is_active}
                          onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          {categoryForm.is_active ? 'সক্রিয় (ওয়েবসাইটে লাইভ দেখাবে)' : 'নিষ্ক্রিয় (ওয়েবসাইটে লুকানো থাকবে)'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* আইকন নির্বাচন (Visual Icon Picker) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      আইকন নির্বাচন করুন (Icon Picker) <span className="text-slate-400 font-normal">- কার্ড ও মেনুতে দেখাবে</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      {CATEGORY_ICONS_LIST.map((ic) => {
                        const IconComponent = ic.icon;
                        const isSelected = (categoryForm.icon || 'Tag').toLowerCase() === ic.name.toLowerCase();
                        return (
                          <button
                            type="button"
                            key={ic.name}
                            onClick={() => setCategoryForm((prev) => ({ ...prev, icon: ic.name }))}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                            }`}
                            title={ic.label}
                          >
                            <IconComponent className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                              {ic.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">অথবা কাস্টম আইকন নাম:</span>
                      <input
                        type="text"
                        placeholder="e.g. Watch, Headphones, Zap, Gift..."
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full sm:w-48 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* ছবি আপলোড ও প্রিভিউ */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      ক্যাটাগরি ছবি <span className="text-slate-400 font-normal">(হোম পেজ কার্ডের জন্য)</span>
                    </label>

                    <input
                      ref={categoryFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCategoryImageUpload(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    {categoryForm.image_url ? (
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <img src={categoryForm.image_url} alt="Category" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => categoryFileInputRef.current?.click()} className="text-xs font-bold text-blue-600 hover:underline">ছবি পরিবর্তন</button>
                          <button type="button" onClick={() => setCategoryForm(prev => ({ ...prev, image_url: '' }))} className="text-xs font-bold text-rose-600 hover:underline">ছবি মুছুন</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleCategoryImageUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => categoryFileInputRef.current?.click()}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex flex-col items-center justify-center text-slate-500"
                      >
                        {categoryUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        ) : (
                          <>
                            <UploadCloud className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">ছবি আপলোড করতে ক্লিক করুন</span>
                            <span className="text-[10px]">PNG, JPG, WEBP</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">অথবা ছবির URL দিন:</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={categoryForm.image_url}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, image_url: e.target.value }))}
                        className={inputCls + ' text-xs'}
                      />
                    </div>
                  </div>

                  {/* সংরক্ষণ বাটন */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={categorySaving}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                    >
                      {categorySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{editingCategoryId ? 'ক্যাটাগরি আপডেট করুন (Update Category)' : 'ক্যাটাগরি সংরক্ষণ করুন (Save Category)'}</span>
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategoryForm(defaultCategoryForm);
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition"
                      >
                        বাতিল
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              {/* ======================= CATEGORIES LIST ======================= */}
              <Card className="!p-5 sm:!p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>সব ক্যাটাগরির তালিকা</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {catList.length}টি ক্যাটাগরি
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">সর্ট অর্ডারের ক্রম অনুযায়ী সাজানো রয়েছে</p>
                  </div>

                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="ক্যাটাগরি খুঁজুন..."
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...catList]
                    .filter(
                      (c) =>
                        !categoryQuery ||
                        (c.name + ' ' + (c.name_bn || '') + ' ' + (c.slug || '') + ' ' + (c.sub_label || ''))
                          .toLowerCase()
                          .includes(categoryQuery.toLowerCase())
                    )
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((c) => {
                      const IconComp = getCategoryIconComponent(c.icon);
                      const prodCount = prods.filter((p) => p.category_id === c.id || p.category_id === c.slug).length;
                      const isEditing = editingCategoryId === c.id;

                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                            isEditing
                              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon / Image preview */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-sm overflow-hidden">
                              {c.image_url ? (
                                <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <IconComp className="w-6 h-6" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-sm text-slate-900 truncate">{c.name}</h4>
                                {c.name_bn && c.name_bn !== c.name && <span className="text-[11px] text-slate-400">({c.name_bn})</span>}
                              </div>

                              {c.sub_label && (
                                <p className="text-xs text-blue-600 font-medium truncate mt-0.5">
                                  {c.sub_label}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                  /{c.slug}
                                </span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                                  {prodCount}টি প্রোডাক্ট
                                </span>
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                  ক্রম: {c.sort_order ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom actions */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveCategoryOrder(c, 'up')}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                                title="উপরে নিন"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCategoryOrder(c, 'down')}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                                title="নিচে নিন"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryActive(c)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                                  c.is_active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                {c.is_active !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(c.id);
                                  setCategoryForm({
                                    name: c.name || '',
                                    name_bn: c.name_bn || '',
                                    slug: c.slug || '',
                                    sub_label: c.sub_label || '',
                                    icon: c.icon || 'Tag',
                                    image_url: c.image_url || '',
                                    sort_order: String(c.sort_order ?? 0),
                                    is_active: c.is_active !== false
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="সম্পাদনা করুন"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="ডিলিট করুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {catList.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FolderTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">কোনো ক্যাটাগরি তৈরি করা হয়নি</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">উপরের ফর্ম থেকে নতুন ক্যাটাগরি যোগ করুন</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ============================= BANNERS ============================= */}
          {page === 'banners' && (
            <div className="space-y-6">
              <Card className="!p-5 sm:!p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      {editingBannerId ? 'ব্যানার সম্পাদনা (Edit Banner)' : 'নতুন ব্যানার যোগ করুন (Add New Banner)'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">হোম পেজের অটো-স্ক্রল হিরো স্লাইডারে লাইভ দেখাবে</p>
                  </div>
                  {editingBannerId && (
                    <button type="button" onClick={cancelEditBanner} className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg self-start sm:self-auto">
                      সম্পাদনা বাতিল
                    </button>
                  )}
                </div>

                <div className="mb-5 flex items-start sm:items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl text-blue-900 text-xs sm:text-sm">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold">সেরা রেজাল্টের জন্য ১৯২০x৭২০ পিক্সেল সাইজের ছবি দিন (রেশিও ৮:৩)।</span>
                    <span className="text-blue-700 ml-1">ছবি সর্বোচ্চ ৫MB সাইজের হতে পারবে।</span>
                  </div>
                </div>

                <form onSubmit={handleSaveBanner} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      ব্যানারের ছবি <span className="text-rose-500">*</span>
                    </label>

                    {/* লুকানো ফাইল ইনপুট, দুই অবস্থাতেই কাজ করে */}
                    <input
                      ref={bannerFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleBannerImageUpload(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    {bannerForm.image_url ? (
                      <div className="space-y-3">
                        <div className="relative w-full aspect-[8/3] max-h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner group">
                          <img src={bannerForm.image_url} alt="Banner Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button type="button" onClick={() => bannerFileInputRef.current?.click()} className="px-3.5 py-2 bg-white text-slate-800 rounded-xl text-xs font-bold shadow-md hover:bg-slate-100 transition cursor-pointer">
                              ছবি পরিবর্তন করুন
                            </button>
                            <button type="button" onClick={() => setBannerForm((prev) => ({ ...prev, image_url: '' }))} className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 transition cursor-pointer">
                              মুছে ফেলুন
                            </button>
                          </div>
                        </div>
                        {/* মোবাইলে hover নেই, তাই আলাদা বাটন */}
                        <div className="flex gap-2 sm:hidden">
                          <button type="button" onClick={() => bannerFileInputRef.current?.click()} className="flex-1 px-3 py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">ছবি পরিবর্তন</button>
                          <button type="button" onClick={() => setBannerForm((prev) => ({ ...prev, image_url: '' }))} className="flex-1 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">মুছে ফেলুন</button>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">বর্তমান ছবি URL: {bannerForm.image_url.startsWith('data:') ? '(আপলোড করা ছবি)' : bannerForm.image_url}</p>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleBannerImageUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="w-full aspect-[8/3] max-h-48 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center p-6 text-center group"
                      >
                        {bannerUploading ? (
                          <div className="space-y-3 w-full max-w-xs">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                            <p className="text-xs font-bold text-blue-900">ছবি আপলোড হচ্ছে... {bannerUploadProgress}%</p>
                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${bannerUploadProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">
                              এখানে ছবি টেনে এনে ছাড়ুন অথবা <span className="text-blue-600 underline">ব্রাউজ করুন</span>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">সুপারিশকৃত সাইজ: ১৯২০x৭২০ পিক্সেল (সর্বোচ্চ ৫MB, PNG, JPG, WEBP)</p>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="অথবা অনলাইন ছবির লিঙ্ক দিন (https://...)"
                        value={bannerForm.image_url.startsWith('data:') ? '' : bannerForm.image_url}
                        onChange={(e) => setBannerForm((prev) => ({ ...prev, image_url: e.target.value }))}
                        className={inputCls + ' text-xs'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ব্যানারের নাম / শিরোনাম <span className="text-slate-400 font-normal">(শুধু চেনার জন্য)</span>
                      </label>
                      <input type="text" placeholder="যেমন: মেগা সেল ব্যানার ২০২৬" value={bannerForm.title} onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))} className={inputCls} />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ক্লিক লিংক URL <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <input type="text" placeholder="যেমন: /shop, /smartwatches, বা লিঙ্ক" value={bannerForm.link_url} onChange={(e) => setBannerForm((prev) => ({ ...prev, link_url: e.target.value }))} className={inputCls} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ক্রম নম্বর (Sort Order)</label>
                      <input type="number" min="0" value={bannerForm.sort_order} onChange={(e) => setBannerForm((prev) => ({ ...prev, sort_order: e.target.value }))} className={inputCls} />
                      <span className="text-[10px] text-slate-400">ছোট সংখ্যা আগে দেখাবে (১, ২, ৩...)</span>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="block text-xs font-bold text-slate-700 mb-2">স্ট্যাটাস</label>
                      <Toggle checked={bannerForm.is_active} onChange={(v) => setBannerForm((prev) => ({ ...prev, is_active: v }))} label={bannerForm.is_active ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয়'} />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button type="submit" disabled={bannerSaving || bannerUploading} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer">
                      {bannerSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>সংরক্ষণ হচ্ছে...</span></>
                      ) : (
                        <><Save className="w-4 h-4" /><span>{editingBannerId ? 'ব্যানার আপডেট করুন' : 'ব্যানার যোগ করুন'}</span></>
                      )}
                    </button>

                    {editingBannerId && (
                      <button type="button" onClick={cancelEditBanner} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer">
                        বাতিল করুন
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">সকল ব্যানার ({bannersList.length})</h3>
                    <span className="text-xs text-slate-400">(সক্রিয় ব্যানারগুলো হোম পেজে দেখাবে)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { loadBanners(); notify('ব্যানার তালিকা রিফ্রেশ হয়েছে'); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    তালিকা রিফ্রেশ
                  </button>
                </div>

                {bannersList.length === 0 ? (
                  <Card className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">কোনো ব্যানার নেই</p>
                    <p className="text-xs text-slate-400 mt-1">উপরের ফর্ম ব্যবহার করে আপনার প্রথম ব্যানারটি যোগ করুন।</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {bannersList.map((banner, index) => {
                      const isActive = banner.is_active !== false;
                      const link = (banner as any).link_url || (banner as any).link;
                      return (
                        <Card key={banner.id || index} className={`!p-4 sm:!p-5 transition-all ${editingBannerId === banner.id ? 'ring-2 ring-blue-500 bg-blue-50/20' : 'hover:shadow-md'}`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
                              <div className="relative w-full sm:w-56 aspect-[8/3] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                <img
                                  src={banner.image_url}
                                  alt={banner.title || 'Banner'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80';
                                  }}
                                />
                                <span className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  #{banner.sort_order ?? index + 1}
                                </span>
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">{banner.title || `ব্যানার #${index + 1}`}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {isActive ? '✓ সক্রিয়' : '✕ নিষ্ক্রিয়'}
                                  </span>
                                </div>

                                {link ? (
                                  <p className="text-xs text-blue-600 flex items-center gap-1 truncate font-medium">
                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{link}</span>
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400">কোনো লিংক যুক্ত নেই</p>
                                )}

                                <p className="text-[11px] text-slate-400">
                                  ক্রম: {banner.sort_order ?? index + 1} {banner.created_at ? `• ${new Date(banner.created_at).toLocaleDateString('bn-BD')}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-2.5 self-end md:self-auto flex-wrap">
                              <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                                <button type="button" disabled={index === 0} onClick={() => moveBannerOrder(index, 'up')} title="উপরে নিন" className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer">
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button type="button" disabled={index === bannersList.length - 1} onClick={() => moveBannerOrder(index, 'down')} title="নিচে নিন" className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer">
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleBannerStatus(banner)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                              >
                                {isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </button>

                              <button type="button" onClick={() => startEditBanner(banner)} className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition cursor-pointer" title="সম্পাদনা করুন">
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button type="button" onClick={() => setDeleteConfirmBanner(banner)} className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer" title="মুছে ফেলুন">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================= DELIVERY ZONES ============================= */}
          {page === 'deliveryZones' && (
            <div className="space-y-6">
              <Card className="!p-5 sm:!p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      {editingZoneId ? 'ডেলিভারি জোন সম্পাদনা করুন' : 'নতুন ডেলিভারি জোন যোগ করুন'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">ঢাকার ভিতর এবং ঢাকার বাইরের ডেলিভারি চার্জ ও সময় নির্ধারণ করুন</p>
                  </div>
                  {editingZoneId && (
                    <button type="button" onClick={() => { setEditingZoneId(null); setZoneForm({ name: '', name_bn: '', charge: '60', estimated_days: '১-২ কার্যদিবস' }); }} className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                      বাতিল
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveZone} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">জোনের নাম (বাংলা) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: ঢাকার ভিতরে / ঢাকার বাইরে"
                      value={zoneForm.name_bn}
                      onChange={(e) => setZoneForm((prev) => ({ ...prev, name_bn: e.target.value }))}
                      className={inputCls + ' text-xs'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">জোনের নাম (English)</label>
                    <input
                      type="text"
                      placeholder="e.g. Inside Dhaka"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={inputCls + ' text-xs'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ডেলিভারি চার্জ (৳) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="60"
                      value={zoneForm.charge}
                      onChange={(e) => setZoneForm((prev) => ({ ...prev, charge: e.target.value }))}
                      className={inputCls + ' text-xs'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">সময় / কার্যদিবস</label>
                    <input
                      type="text"
                      placeholder="১-২ কার্যদিবস"
                      value={zoneForm.estimated_days}
                      onChange={(e) => setZoneForm((prev) => ({ ...prev, estimated_days: e.target.value }))}
                      className={inputCls + ' text-xs'}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={zoneSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {zoneSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{editingZoneId ? 'জোন আপডেট করুন' : 'জোন সেভ করুন'}</span>
                    </button>
                  </div>
                </form>
              </Card>

              <Card className="!p-5 sm:!p-6 space-y-4">
                <h3 className="font-extrabold text-base text-slate-900">ডেলিভারি জোন তালিকা ({zoneList.length})</h3>
                {zoneList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">কোনো ডেলিভারি জোন নেই।</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {zoneList.map((zone) => (
                      <div key={zone.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-900">{zone.name_bn}</h4>
                          <p className="text-xs text-blue-600 font-extrabold">চার্জ: ৳{zone.charge}</p>
                          <p className="text-[11px] text-slate-500">সময়: {zone.estimated_days} {zone.name ? `(${zone.name})` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingZoneId(zone.id);
                              setZoneForm({
                                name: zone.name || '',
                                name_bn: zone.name_bn || '',
                                charge: String(zone.charge || 0),
                                estimated_days: zone.estimated_days || ''
                              });
                            }}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition cursor-pointer"
                            title="সম্পাদনা"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmZone(zone)}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}


          {/* ============================= FLASH SALES ============================= */}
          {page === 'flashSales' && (
            <div className="space-y-6">
              <Card className="!p-5 sm:!p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Flash Sale Products
                  </h3>
                </div>

                {prods.filter(p => p.is_flash_sale).length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">কোনো Flash Sale প্রোডাক্ট নেই</p>
                    <p className="text-xs text-slate-400 mt-1">প্রোডাক্ট সেকশন থেকে ফ্ল্যাশ সেল বাটন দিয়ে প্রোডাক্ট যুক্ত করুন।</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                    {prods.filter(p => p.is_flash_sale).map((p) => (
                      <Card key={p.id} className="!p-3 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-amber-50 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{p.name}</p>
                          <p className="text-sm font-extrabold text-blue-600">{money(p.price)}</p>
                        </div>
                        <button type="button" onClick={() => toggleFlashSale(p)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Remove from Flash Sale">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ============================= CUSTOMERS ============================ */}
          {page === 'customers' && (
            <div className="space-y-4">
              <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search by name or phone..." className={inputCls + ' sm:max-w-sm bg-white'} />
              {customers.length === 0 ? <Card><Empty text="কোনো কাস্টমার নেই।" /></Card> : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {customers.map((c) => (
                    <Card key={c.phone + c.name} className="!p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="font-bold truncate">{c.name}</p><p className="text-sm text-slate-500">{c.phone}</p><p className="text-xs text-slate-400 truncate">{c.address}</p></div>
                        <div className="text-right shrink-0"><p className="font-extrabold text-blue-600">{money(c.spent)}</p><p className="text-xs text-slate-500">{c.count} orders</p>
                          {c.last > 0 && <p className="text-[11px] text-slate-400">Last: {new Date(c.last).toLocaleDateString('en-GB')}</p>}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================== REPORTS ============================= */}
          {page === 'reports' && (() => {
            const ok = reportOrders.filter((o) => o.status !== 'cancelled');
            const rev = ok.reduce((s, o) => s + (o.total || 0), 0);
            const by = (f: (o: OrderLite) => string) => { const m: Record<string, number> = {}; reportOrders.forEach((o) => { const k = f(o); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
            return (
              <div className="space-y-4">
                <Card className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <label className="text-xs font-semibold text-slate-500">From<input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className={inputCls + ' mt-1'} /></label>
                  <label className="text-xs font-semibold text-slate-500">To<input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className={inputCls + ' mt-1'} /></label>
                  <button type="button" onClick={exportCsv} disabled={reportOrders.length === 0} className="sm:ml-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl"><Download className="w-4 h-4" />Export CSV</button>
                </Card>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {[['Revenue', money(rev)], ['Orders', String(reportOrders.length)], ['Avg. order value', money(ok.length ? rev / ok.length : 0)], ['Cancelled', String(reportOrders.length - ok.length)]].map(([l, v]) => (
                    <Card key={l}><p className="text-xs text-slate-500">{l}</p><p className="text-xl sm:text-2xl font-extrabold mt-1 break-all">{v}</p></Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[['By status', by((o) => o.status || 'pending')], ['By payment method', by((o) => o.payment_method || 'Unknown')]].map(([title, rows]) => (
                    <Card key={title as string}>
                      <h3 className="font-bold mb-3">{title as string}</h3>
                      {(rows as [string, number][]).length === 0 ? <Empty text="ডাটা নেই" /> : (rows as [string, number][]).map(([k, n]) => (
                        <div key={k} className="mb-3">
                          <div className="flex justify-between text-sm mb-1"><span className="capitalize text-slate-700">{k}</span><span className="font-semibold">{n}</span></div>
                          <div className="h-2 rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(n / reportOrders.length) * 100}%` }} /></div>
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ============================== SETTINGS ============================ */}
          {page === 'settings' && (
            <Card className="max-w-xl">
              <h3 className="font-bold text-lg mb-1">Monthly sales target</h3>
              <p className="text-sm text-slate-500 mb-4">Dashboard-এর Monthly Target গেজ এই অঙ্কের সাথে তুলনা করে।</p>
              <label className="text-xs font-semibold text-slate-500">Target (BDT)
                <input type="number" min="1" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className={inputCls + ' mt-1'} />
              </label>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={saveTarget} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl"><Save className="w-4 h-4" />Save target</button>
                <button type="button" onClick={() => { setLoading(true); Promise.all([loadOrders(), loadEvents()]).finally(() => setLoading(false)); notify('Data refreshed'); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200">Refresh data</button>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Supabase SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Supabase SQL Editor Setup কোড</h3>
                  <p className="text-[11px] text-slate-400">ইমেজ আপলোড, ক্যাটাগরি ও ব্যানার সক্রিয় করার কোড</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="admin-scroll p-4 sm:p-5 overflow-y-auto space-y-3">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs leading-relaxed">
                <span className="font-bold block mb-1">কীভাবে চালাবেন?</span>
                ১. নিচের <span className="font-bold">&quot;SQL কোড কপি করুন&quot;</span> বাটনে ক্লিক করুন।<br />
                ২. আপনার Supabase ড্যাশবোর্ডে গিয়ে বামপাশের <b>SQL Editor</b> ট্যাবে যান।<br />
                ৩. কোডটি পেস্ট করে <b>Run</b> বাটনে ক্লিক করুন।
              </div>

              <pre className="admin-scroll bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72 leading-relaxed selection:bg-blue-600">{SETUP_SQL}</pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSqlModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  try { navigator.clipboard.writeText(SETUP_SQL); } catch { /* ignore */ }
                  setSqlCopied(true);
                  notify('SQL কোড কপি হয়েছে! Supabase SQL Editor এ পেস্ট করে Run করুন।');
                  setTimeout(() => setSqlCopied(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {sqlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {sqlCopied ? 'কপি হয়েছে!' : 'SQL কোড কপি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Banner Confirmation Modal */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">ব্যানারটি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1">
                &quot;{deleteConfirmBanner.title || 'এই ব্যানারটি'}&quot; স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button type="button" onClick={() => setDeleteConfirmBanner(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                বাতিল
              </button>
              <button type="button" onClick={() => handleDeleteBanner(deleteConfirmBanner)} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer">
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">ক্যাটাগরি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1">
                &quot;{deleteConfirmCategory.name}&quot; স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button type="button" onClick={() => setDeleteConfirmCategory(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                বাতিল
              </button>
              <button type="button" onClick={confirmDeleteCategory} disabled={deletingCategory} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50">
                {deletingCategory ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">প্রোডাক্টটি ডিলিট করতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1 break-words">
                &quot;{deleteConfirmProduct.name}&quot; স্থায়ীভাবে মুছে ফেলা হবে। এটি আর ফেরত আনা যাবে না।
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button type="button" onClick={() => setDeleteConfirmProduct(null)} disabled={deletingProduct} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50">
                বাতিল
              </button>
              <button type="button" onClick={confirmDeleteProduct} disabled={deletingProduct} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50">
                {deletingProduct ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />মুছে ফেলা হচ্ছে...</> : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">অর্ডারটি ডিলিট করতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1 break-words">
                অর্ডার <span className="font-bold text-slate-700">{deleteConfirmOrder.order_number || '#' + (deleteConfirmOrder.id || '').slice(0, 6)}</span>
                {deleteConfirmOrder.customer_name ? ` (${deleteConfirmOrder.customer_name})` : ''} স্থায়ীভাবে মুছে ফেলা হবে। এটি আর ফেরত আনা যাবে না।
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button type="button" onClick={() => setDeleteConfirmOrder(null)} disabled={deletingOrder} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50">
                বাতিল
              </button>
              <button type="button" onClick={confirmDeleteOrder} disabled={deletingOrder} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50">
                {deletingOrder ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />মুছে ফেলা হচ্ছে...</> : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Zone Confirmation Modal */}
      {deleteConfirmZone && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">ডেলিভারি জোন ডিলিট করতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1">
                &quot;{deleteConfirmZone.name_bn}&quot; স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center pt-2">
              <button type="button" onClick={() => setDeleteConfirmZone(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                বাতিল
              </button>
              <button type="button" onClick={confirmDeleteZone} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer">
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 left-5 sm:left-auto z-[90] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.ok ? 'bg-slate-900' : 'bg-rose-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
};

export default AdminDashboard;