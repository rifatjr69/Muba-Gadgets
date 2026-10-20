-- ==============================================================================
-- Muba Gadgets: Supabase SQL Setup for Product Columns & Image Storage
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Ensure required columns exist in the 'products' table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_bn TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;

-- 2. Create Public Storage Bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies for 'product-images' (Idempotent: drop first then create)
-- (Note: storage.objects already has RLS enabled by Supabase system; do not alter table)

-- Allow public read access for all visitors
DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Public Read product-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'product-images');

-- Allow image uploads (both anon and authenticated for admin dashboard)
DROP POLICY IF EXISTS "Allow upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert/Update/Delete" ON storage.objects;
CREATE POLICY "Allow upload product-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Allow update
DROP POLICY IF EXISTS "Allow update product-images" ON storage.objects;
CREATE POLICY "Allow update product-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'product-images');

-- Allow delete
DROP POLICY IF EXISTS "Allow delete product-images" ON storage.objects;
CREATE POLICY "Allow delete product-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'product-images');

-- 4. Ensure categories table exists, columns are up to date, and RLS is enabled
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  name_bn TEXT,
  slug TEXT,
  image_url TEXT,
  sub_label TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist even if table was already created
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_bn TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sub_label TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- Enable RLS on public.categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read categories" ON public.categories;
CREATE POLICY "Public Read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update categories" ON public.categories;
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete categories" ON public.categories;
CREATE POLICY "Allow delete categories" ON public.categories FOR DELETE USING (true);

-- Storage bucket 'categories'
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

-- 5. Banners Table & Storage Setup for Hero Carousel
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on public.banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access to banners
DROP POLICY IF EXISTS "Public read active banners" ON public.banners;
CREATE POLICY "Public read active banners" ON public.banners 
FOR SELECT USING (true);

-- Allow insert/update/delete for banners
DROP POLICY IF EXISTS "Allow insert banners" ON public.banners;
CREATE POLICY "Allow insert banners" ON public.banners 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update banners" ON public.banners;
CREATE POLICY "Allow update banners" ON public.banners 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete banners" ON public.banners;
CREATE POLICY "Allow delete banners" ON public.banners 
FOR DELETE USING (true);

-- Storage Bucket for banners
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read banners" ON storage.objects;
CREATE POLICY "Public Read banners" ON storage.objects 
FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Allow upload banners" ON storage.objects;
CREATE POLICY "Allow upload banners" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'banners');

DROP POLICY IF EXISTS "Allow update banners" ON storage.objects;
CREATE POLICY "Allow update banners" ON storage.objects 
FOR UPDATE USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Allow delete banners" ON storage.objects;
CREATE POLICY "Allow delete banners" ON storage.objects 
FOR DELETE USING (bucket_id = 'banners');

-- Seed starter banners if none exist
INSERT INTO public.banners (title, image_url, link_url, sort_order, is_active)
SELECT 'ভেরিফাইড স্মার্ট গ্যাজেট মেগা সেল ২০২৬', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&h=720&q=85', '/shop', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.banners LIMIT 1);

INSERT INTO public.banners (title, image_url, link_url, sort_order, is_active)
SELECT 'প্রিমিয়াম ওয়্যারলেস এএনসি ইয়ারবাড কালেকশন', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1920&h=720&q=85', '/tws-earbuds', 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.banners WHERE sort_order = 2);

INSERT INTO public.banners (title, image_url, link_url, sort_order, is_active)
SELECT 'অ্যামোলেড ব্লুটুথ কলিং স্মার্টওয়াচ কালেকশন', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1920&h=720&q=85', '/smartwatches', 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.banners WHERE sort_order = 3);

-- 6. Reload PostgREST schema cache so new columns take effect immediately
NOTIFY pgrst, 'reload schema';
