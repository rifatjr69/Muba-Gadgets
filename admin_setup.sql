-- SQL setup for Muba Gadgets
-- Run this in your Supabase SQL Editor

-- 1. Create Storage Bucket
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;

-- 2. Storage Policies
create policy "Public Read" on storage.objects for select using (bucket_id = 'product-images');
create policy "Authenticated Insert/Update/Delete" on storage.objects for all to authenticated using (bucket_id = 'product-images');

-- 3. Add images column to products
alter table products add column if not exists images text[];

-- 4. Create tracking_settings table
create table if not exists public.tracking_settings (
    id int primary key default 1,
    fb_pixel_id text,
    fb_pixel_code text,
    fb_access_token text,
    fb_enabled boolean default false,
    gtm_id text,
    gtm_head_code text,
    gtm_body_code text,
    gtm_enabled boolean default false,
    tiktok_pixel_id text,
    tiktok_pixel_code text,
    tiktok_enabled boolean default false,
    custom_head_code text,
    custom_body_code text,
    updated_at timestamptz default now()
);

-- 5. Banners Table & Storage for Hero Slider
create table if not exists public.banners (
    id uuid primary key default gen_random_uuid(),
    image_url text not null,
    title text,
    link_url text,
    sort_order int default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);
alter table public.banners enable row level security;
drop policy if exists "Public read active banners" on public.banners;
create policy "Public read active banners" on public.banners for select using (true);
drop policy if exists "Allow insert banners" on public.banners;
create policy "Allow insert banners" on public.banners for insert with check (true);
drop policy if exists "Allow update banners" on public.banners;
create policy "Allow update banners" on public.banners for update using (true);
drop policy if exists "Allow delete banners" on public.banners;
create policy "Allow delete banners" on public.banners for delete using (true);

insert into storage.buckets (id, name, public) values ('banners', 'banners', true) on conflict do nothing;
drop policy if exists "Public Read banners" on storage.objects;
create policy "Public Read banners" on storage.objects for select using (bucket_id = 'banners');
drop policy if exists "Allow upload banners" on storage.objects;
create policy "Allow upload banners" on storage.objects for insert with check (bucket_id = 'banners');
drop policy if exists "Allow update banners" on storage.objects;
create policy "Allow update banners" on storage.objects for update using (bucket_id = 'banners');
drop policy if exists "Allow delete banners" on storage.objects;
create policy "Allow delete banners" on storage.objects for delete using (bucket_id = 'banners');

