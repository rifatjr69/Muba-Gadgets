import React from 'react';
import { Heart, ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react';
import { Product } from '../types';

interface WishlistPageProps {
  onClose: () => void;
  products: Product[];
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ 
  onClose, 
  products, 
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct
}) => {
  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                My Wishlist ({wishlistProducts.length})
              </h1>
              <p className="text-xs text-slate-500">Your favorite verified gadgets saved for later</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-xs font-bold text-[#0052FF] hover:underline"
          >
            Back to store
          </button>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-lg mx-auto p-8 space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Your wishlist is currently empty</h2>
            <p className="text-xs text-slate-500">
              Browse our premium gadgets and click the heart icon on any product to save it here.
            </p>
            <div className="pt-2">
              <button 
                onClick={onClose} 
                className="bg-[#0052FF] hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition"
              >
                Explore Products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistProducts.map(product => (
              <div 
                key={product.id} 
                className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => onSelectProduct(product)}
                >
                  <div className="relative pt-[85%] rounded-2xl overflow-hidden bg-slate-50 mb-3">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                    />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-[#0052FF] transition">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-base font-black text-[#0052FF]">
                      ৳{product.price.toLocaleString()}
                    </span>
                    {product.old_price && product.old_price > product.price && (
                      <span className="text-xs text-slate-400 line-through">
                        ৳{product.old_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button 
                    onClick={() => onAddToCart(product, 1)} 
                    className="flex-1 bg-[#0052FF] hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                  <button 
                    onClick={() => onToggleWishlist(product.id)} 
                    title="Remove from wishlist"
                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default WishlistPage;
