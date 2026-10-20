import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '../types';

interface HeroSliderProps {
  banners: Banner[];
  onNavigate?: (url: string) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ banners, onNavigate }) => {
  // Filter active banners and sort by sort_order
  const activeBanners = React.useMemo(() => {
    return (banners || [])
      .filter((b) => b.is_active !== false && b.image_url)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});

  // Touch gesture state for mobile swiping
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const count = activeBanners.length;

  // Next slide (infinite loop)
  const nextSlide = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  // Previous slide (infinite loop)
  const prevSlide = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto slide every 5 seconds (5000ms) with pause on hover
  useEffect(() => {
    if (count <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, isPaused, nextSlide]);

  // Reset index if banners array changes and index is out of bounds
  useEffect(() => {
    if (currentIndex >= count && count > 0) {
      setCurrentIndex(0);
    }
  }, [count, currentIndex]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const deltaX = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 45; // threshold in pixels

      if (deltaX > minSwipeDistance) {
        // Swiped left -> next slide
        nextSlide();
      } else if (deltaX < -minSwipeDistance) {
        // Swiped right -> prev slide
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // If no active banners, hide the entire section (no empty space or error)
  if (count === 0) {
    return null;
  }

  const handleBannerClick = (banner: Banner) => {
    const targetUrl = banner.link_url || banner.link;
    if (!targetUrl) return;

    if (onNavigate) {
      onNavigate(targetUrl);
    } else if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <div
        className="relative group w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-shadow bg-gray-100 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Aspect Ratio Container: 16:9 on mobile, ~21:9 on tablet, 8:3 (1920x720) on desktop */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[8/3] max-h-[520px] overflow-hidden">
          
          {/* Slider Track with Smooth Transition */}
          <div
            className="flex w-full h-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {activeBanners.map((banner, index) => {
              const hasLink = Boolean(banner.link_url || banner.link);
              const isLoaded = imagesLoaded[banner.id || index];

              return (
                <div
                  key={banner.id || index}
                  className="w-full h-full flex-shrink-0 relative overflow-hidden"
                >
                  {/* Skeleton loader shown before image finishes loading */}
                  {!isLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin opacity-50" />
                    </div>
                  )}

                  {/* Banner Image */}
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Muba Gadgets Promotional Banner'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    decoding="async"
                    onClick={() => hasLink && handleBannerClick(banner)}
                    onLoad={() => {
                      setImagesLoaded((prev) => ({ ...prev, [banner.id || index]: true }));
                    }}
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.currentTarget;
                      if (!target.src.includes('unsplash')) {
                        target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&h=720&q=85';
                      }
                      setImagesLoaded((prev) => ({ ...prev, [banner.id || index]: true }));
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    } ${hasLink ? 'cursor-pointer hover:scale-[1.01] transition-transform duration-500' : 'cursor-default'}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Controls: Only shown when there are 2 or more banners */}
          {count > 1 && (
            <>
              {/* Left Navigation Arrow (Desktop) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="আগের ব্যানার"
                className="hidden sm:flex absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 items-center justify-center shadow-lg backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95 z-20"
              >
                <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
              </button>

              {/* Right Navigation Arrow (Desktop) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="পরের ব্যানার"
                className="hidden sm:flex absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 items-center justify-center shadow-lg backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95 z-20"
              >
                <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
              </button>

              {/* Bottom Dot Indicators */}
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {activeBanners.map((banner, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <button
                      key={`dot-${banner.id || index}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(index);
                      }}
                      aria-label={`ব্যানার ${index + 1}`}
                      className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-6 sm:w-7 bg-white shadow-md'
                          : 'w-2 sm:w-2.5 bg-white/60 hover:bg-white/90'
                      }`}
                    />
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
