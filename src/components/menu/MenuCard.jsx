import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MenuCard({ item, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      className="relative bg-card rounded-xl overflow-hidden cursor-pointer group border border-border hover:border-primary/50 transition-all duration-300"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-secondary">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Unavailable overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70 border border-white/30 px-3 py-1.5 rounded">
              Non disponibile
            </span>
          </div>
        )}

        {/* Category tag */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-white px-2 py-0.5 rounded-sm">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-display font-bold text-base uppercase tracking-wide text-foreground leading-tight truncate">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-display font-bold text-xl text-accent">€{item.price?.toFixed(2)}</span>
          {item.available !== false && (
            <button
              className="w-8 h-8 rounded-sm bg-primary text-white flex items-center justify-center hover:bg-primary/80 active:scale-95 transition-all shadow-lg shadow-primary/30"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}