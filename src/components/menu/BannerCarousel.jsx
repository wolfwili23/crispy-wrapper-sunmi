import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BannerCarousel({ banners, onProductClick, onPromoClick }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const startXRef = useRef(null);

  const total = banners.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  // Auto-scroll every 4.5s unless paused
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(next, 4500);
    return () => clearInterval(timerRef.current);
  }, [paused, next, total]);

  const handleClick = (banner) => {
    if (banner.link_type === 'product' && banner.menu_item_id) {
      onProductClick?.(banner.menu_item_id);
    } else if (banner.link_type === 'promo' && banner.promo_category) {
      onPromoClick?.(banner.promo_category);
    }
  };

  // Touch/swipe support
  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e) => {
    if (startXRef.current === null) return;
    const delta = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    startXRef.current = null;
  };

  // Mouse drag support
  const handleMouseDown = (e) => { startXRef.current = e.clientX; setPaused(true); };
  const handleMouseUp = (e) => {
    if (startXRef.current === null) return;
    const delta = startXRef.current - e.clientX;
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    startXRef.current = null;
  };

  if (!banners || total === 0) return null;

  const banner = banners[current];

  return (
    <div className="relative w-full overflow-hidden rounded-sm select-none">
      {/* Slide */}
      <div
        className="relative h-44 cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={() => { if (Math.abs((startXRef.current || 0)) < 5) handleClick(banner); }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <img
              src={banner.image_url}
              alt={banner.title || 'Banner'}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Title + CTA label */}
            {banner.title && (
              <div className="absolute bottom-4 left-4 right-12">
                <p className="font-display font-black text-white text-xl uppercase tracking-wide leading-none drop-shadow-lg">
                  {banner.title}
                </p>
                {banner.link_type !== 'none' && (
                  <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest bg-primary text-white px-2.5 py-1 rounded-sm">
                    {banner.link_type === 'product' ? 'Scopri →' : 'Vedi offerte →'}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev/Next arrows (desktop) */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors hidden md:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors hidden md:flex"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5 pb-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setPaused(true); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}