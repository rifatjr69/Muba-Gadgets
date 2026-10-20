export interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_bn: string;
  slug: string;
  icon?: string;
  image_url?: string;
  sub_label?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_override?: number;
  stock?: number;
}

export interface Product {
  id: string;
  category_id?: string;
  name: string;
  name_bn: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  old_price?: number;
  discount_percent?: number;
  badge?: string;
  secondary_badge?: string;
  sold_count?: number;
  rating?: number;
  review_count?: number;
  stock?: number;
  image_url: string;
  images?: string[];
  is_featured?: boolean;
  is_flash_sale?: boolean;
  is_hot_deal?: boolean;
  is_active?: boolean;
  created_at?: string;
  variants?: ProductVariant[];
  enable_size?: boolean;
  enable_color?: boolean;
  sizes?: string[];
  colors?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface Banner {
  id: string;
  title?: string | null;
  image_url: string;
  link_url?: string | null;
  link?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  name_bn: string;
  charge: number;
  estimated_days: string;
  is_active?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
}

export interface Order {
  id?: string;
  order_number?: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_zone: string;
  delivery_charge: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code?: string;
  payment_method: string;
  status: string;
  note?: string;
  created_at?: string;
  items: {
    product_name: string;
    variant?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}

export interface FlashSale {
  id: string;
  product_id: string;
  product?: Product;
  sale_price: number;
  sale_stock: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
}

export const enrichProducts = (prods: Product[]): Product[] => {
  try {
    const savedMap = localStorage.getItem('muba_product_variations_map');
    if (!savedMap) return prods;
    const map = JSON.parse(savedMap);
    return prods.map(p => {
      const overrides = map[p.id] || map[p.slug] || (p.name ? map[p.name.trim()] : null);
      if (overrides) {
        return {
          ...p,
          enable_size: overrides.enable_size ?? p.enable_size,
          enable_color: overrides.enable_color ?? p.enable_color,
          sizes: overrides.sizes ?? p.sizes,
          colors: overrides.colors ?? p.colors,
        };
      }
      return p;
    });
  } catch {
    return prods;
  }
};
