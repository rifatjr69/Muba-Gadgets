-- 1. Create Flash Sales table
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sale_price NUMERIC(10, 2) NOT NULL,
  sale_stock INT NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- Public can read active flash sales
CREATE POLICY "Public read active flash_sales" ON public.flash_sales 
FOR SELECT USING (is_active = true AND start_at <= NOW() AND end_at >= NOW());

-- Admin full access
CREATE POLICY "Admin manage flash_sales" ON public.flash_sales 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

NOTIFY pgrst, 'reload schema';
