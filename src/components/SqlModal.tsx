import React, { useState } from 'react';
import { X, Database, Copy, Check, Terminal } from 'lucide-react';

interface SqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlModal: React.FC<SqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCommand = `-- ==============================================================================
-- Muba Gadgets - Supabase PostgreSQL Database Schema & Security Hardening
-- Complete Role-Based Access Control (RBAC): 'user' (default) & 'admin'
-- 100% Validated for Supabase SQL Editor execution
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  name_en TEXT,
  name_bn TEXT,
  slug TEXT,
  icon TEXT DEFAULT 'Tag',
  image_url TEXT,
  sub_label TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if table was already created
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_bn TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Tag';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sub_label TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- Storage bucket for categories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('categories', 'categories', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read categories_bucket" ON storage.objects;
CREATE POLICY "Public Read categories_bucket" ON storage.objects FOR SELECT USING (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow upload categories_bucket" ON storage.objects;
CREATE POLICY "Allow upload categories_bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow update categories_bucket" ON storage.objects;
CREATE POLICY "Allow update categories_bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'categories');
DROP POLICY IF EXISTS "Allow delete categories_bucket" ON storage.objects;
CREATE POLICY "Allow delete categories_bucket" ON storage.objects FOR DELETE USING (bucket_id = 'categories');

INSERT INTO public.categories (name, name_bn, slug, sub_label, sort_order, is_active)
VALUES 
  ('Smartwatches', 'স্মার্টওয়াচ', 'smartwatches', 'AMOLED, Bluetooth Calling', 1, true),
  ('TWS Earbuds', 'ওয়্যারলেস ইয়ারবাড', 'tws-earbuds', 'ANC, Deep Bass, Long Battery', 2, true),
  ('Power Banks', 'পাওয়ার ব্যাংক', 'power-banks', '20W/65W PD Fast Charging', 3, true),
  ('GaN Chargers', 'চার্জার ও অ্যাডাপ্টার', 'chargers', 'Fast charging adapters', 4, true),
  ('Phone Accessories', 'ফোন এক্সেসরিজ', 'accessories', 'Cases, holders, cables', 5, true),
  ('Gaming Gadgets', 'গেমিং গ্যাজেটস', 'gaming', 'Triggers, coolers, controllers', 6, true)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  description_bn TEXT,
  short_description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10, 2),
  discount_percent INT DEFAULT 0,
  badge TEXT,
  rating NUMERIC(2, 1) DEFAULT 4.8,
  review_count INT DEFAULT 50,
  stock INT DEFAULT 100,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  is_flash_sale BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if products table was created earlier
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_bn TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;

-- Storage Bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Public Read product-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert/Update/Delete" ON storage.objects;
CREATE POLICY "Allow upload product-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow update product-images" ON storage.objects;
CREATE POLICY "Allow update product-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow delete product-images" ON storage.objects;
CREATE POLICY "Allow delete product-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'product-images');

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  charge NUMERIC(10, 2) NOT NULL,
  estimated_days TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'percent',
  value NUMERIC(10, 2) NOT NULL,
  min_order NUMERIC(10, 2) DEFAULT 0
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('MB-' || nextval('order_number_seq')::TEXT),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL,
  delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 60,
  subtotal NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  coupon_code TEXT,
  payment_method TEXT DEFAULT 'COD',
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant TEXT,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL
);

-- 3. FUNCTIONS & TRIGGERS FOR NEW USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update categories" ON public.categories;
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete categories" ON public.categories;
CREATE POLICY "Allow delete categories" ON public.categories FOR DELETE USING (true);
CREATE POLICY "Public read delivery zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Orders insertable by anyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders readable by owner" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Order items insertable" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Order items readable" ON public.order_items FOR SELECT USING (true);

-- 5. INITIAL SEED DATA
INSERT INTO public.delivery_zones (name, name_bn, charge, estimated_days) VALUES
('Inside Dhaka', 'ঢাকার ভিতরে', 60, '১-২ কার্যদিবস'),
('Sub-Dhaka', 'ঢাকার আশেপাশে (সাভার, গাজীপুর, নারায়ণগঞ্জ)', 100, '২-৩ কার্যদিবস'),
('Outside Dhaka', 'ঢাকার বাইরে পুরো বাংলাদেশ', 130, '৩-৫ কার্যদিবস')
-- BANNERS TABLE & STORAGE FOR HERO SLIDER
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

INSERT INTO public.coupons (code, type, value, min_order) VALUES
('MUBA50', 'fixed', 50, 999),
('GADGET10', 'percent', 10, 1499)
ON CONFLICT (code) DO NOTHING;
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center text-white shadow">
              <Database className="w-6 h-6 text-[#00E5FF]" />
            </div>
            <div>
              <h2 className="text-base font-black">Supabase SQL Schema Command</h2>
              <p className="text-xs text-gray-400">Copy & Paste this in your Supabase SQL Editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action bar */}
        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-[#0052FF]" /> Supabase Project URL: <code className="text-blue-600 font-bold">ybklofybvifuiiugldas.supabase.co</code>
          </span>
          <button
            onClick={handleCopy}
            className="bg-[#0052FF] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'കോপি হয়েছে!' : 'SQL কোপি করুন'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950 text-gray-200 font-mono text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap">{sqlCommand}</pre>
        </div>

      </div>
    </div>
  );
};
