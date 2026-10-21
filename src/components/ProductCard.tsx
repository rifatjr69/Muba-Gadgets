import React from 'react';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import { Product } from '../types';

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onOrderNow?: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  isWishlisted: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onOrderNow,
  onSelectProduct,
  onToggleWishlist,
  isWishlisted
}) => {
  // Calculate discount percentage if old price exists and is higher
  const calculatedDiscount = 
    product.old_price && product.old_price > product.price
      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
      : (product.discount_percent || 0);

  // Determine badge text (e.g. "33% OFF", "28% OFF", or "NEW")
  const hasDiscount = calculatedDiscount > 0;
  const badgeText = hasDiscount 
    ? `${calculatedDiscount}% OFF` 
    : (product.badge || (product.is_featured ? 'NEW' : null));

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 hover:border-gray-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group overflow-hidden relative h-full select-none">
      
      {/* Top Floating Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start pointer-events-none">
        {badgeText && (
          <span className="bg-[#B84040] text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider shadow-sm">
            {badgeText}
          </span>
        )}
      </div>

      {/* Wishlist Heart Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist(product.id);
        }}
        className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border shadow-sm cursor-pointer ${
          isWishlisted
            ? 'bg-rose-50 text-[#B84040] border-[#B84040]/30'
            : 'bg-white/95 text-gray-400 hover:text-[#B84040] hover:bg-white border-gray-200/90'
        }`}
        title="Wishlist"
        aria-label="Wishlist"
      >
        <Heart 
          className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${
            isWishlisted ? 'fill-[#B84040] text-[#B84040]' : ''
          }`} 
        />
      </button>

      {/* Product Image Container */}
      <div 
        onClick={() => onSelectProduct(product)}
        className="relative w-full aspect-square bg-[#F8F9FA] overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=600';
          }}
        />
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Product Title */}
          <h3 
            onClick={() => onSelectProduct(product)}
            title={product.name}
            className="text-xs sm:text-[13px] font-medium text-gray-800 hover:text-gray-950 line-clamp-2 leading-snug cursor-pointer transition-colors min-h-[2rem] sm:min-h-[2.25rem] mb-1"
          >
            {product.name}
          </h3>

          {/* Star Rating and Review Count */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center text-amber-400 gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (product.review_count || 0) > 0 && star <= Math.round(product.rating || 0);
                return (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-amber-400 fill-transparent stroke-[1.5]'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] text-gray-400 font-normal">
              ({product.review_count || 0})
            </span>
          </div>

          {/* Price Row */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
              ৳{product.price.toLocaleString()}
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xs text-gray-400 line-through font-normal">
                ৳{product.old_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Two Purchase Action Buttons (BUY NOW and Cart Icon) */}
        <div className="flex items-center gap-2 mt-3 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOrderNow) {
                onOrderNow(product);
              }
            }}
            className="flex-1 py-1.5 sm:py-2 px-2.5 rounded border border-[#B84040] text-[#B84040] hover:bg-[#B84040] hover:text-white active:scale-[0.98] transition-all duration-200 text-[11px] sm:text-xs font-semibold tracking-wider uppercase flex items-center justify-center cursor-pointer select-none"
          >
            BUY NOW
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="w-8.5 h-7.5 sm:w-10 sm:h-8.5 rounded border border-[#B84040] text-[#B84040] hover:bg-[#B84040] hover:text-white active:scale-[0.98] transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
            title="Add to Cart"
            aria-label="Add to Cart"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.8]" />
          </button>
        </div>

      </div>

    </div>
  );
};
