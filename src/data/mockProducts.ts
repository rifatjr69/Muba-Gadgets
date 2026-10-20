import { Category, Product, Banner, DeliveryZone, Coupon } from '../types';

export const MOCK_CATEGORIES: Category[] = [];

export const MOCK_BANNERS: Banner[] = [
  {
    id: 'banner-1',
    title: 'ভেরিফাইড স্মার্ট গ্যাজেট মেগা সেল ২০২৬',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&h=720&q=85',
    link_url: '/shop',
    link: '/shop',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'banner-2',
    title: 'প্রিমিয়াম ওয়্যারলেস এএনসি ইয়ারবাড কালেকশন',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1920&h=720&q=85',
    link_url: '/shop?category=tws-earbuds',
    link: '/shop?category=tws-earbuds',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'banner-3',
    title: 'অ্যামোলেড ব্লুটুথ কলিং স্মার্টওয়াচ কালেকশন',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1920&h=720&q=85',
    link_url: '/shop?category=smartwatches',
    link: '/shop?category=smartwatches',
    sort_order: 3,
    is_active: true
  }
];

export const MOCK_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-inside-dhaka',
    name: 'Inside Dhaka',
    name_bn: 'ঢাকার ভিতরে (Inside Dhaka)',
    charge: 60,
    estimated_days: '১-২ কার্যদিবস',
    is_active: true
  },
  {
    id: 'zone-outside-dhaka',
    name: 'Outside Dhaka',
    name_bn: 'ঢাকার বাইরে (Outside Dhaka)',
    charge: 120,
    estimated_days: '৩-৫ কার্যদিবস',
    is_active: true
  }
];

export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'MUBA50',
    type: 'fixed',
    value: 50,
    min_order: 999
  },
  {
    id: 'coup-2',
    code: 'GADGET10',
    type: 'percent',
    value: 10,
    min_order: 1499
  }
];

export const MOCK_PRODUCTS: Product[] = [];
