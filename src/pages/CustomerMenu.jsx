import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CouponInput from '@/components/checkout/CouponInput';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, MapPin, ChevronDown, RefreshCw, Clock } from 'lucide-react';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { motion, AnimatePresence } from 'framer-motion';
import MenuCard from '@/components/menu/MenuCard';
import CustomizationSheet from '@/components/menu/CustomizationSheet';
import BannerCarousel from '@/components/menu/BannerCarousel';
import StoreClosedPopup from '@/components/menu/StoreClosedPopup';

export default function CustomerMenu() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const { isOpen: storeIsOpen, isLoading: storeLoading } = useStoreStatus();

  React.useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email)).catch(() => {});
  }, []);
  const queryClient = useQueryClient();

  // Pull-to-refresh
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = (e) => {touchStartY.current = e.touches[0].clientY;};
  const handleTouchMove = (e) => {
    if (window.scrollY > 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullY(Math.min(delta, PULL_THRESHOLD + 20));
  };
  const handleTouchEnd = async () => {
    if (pullY >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setRefreshing(false);
    }
    setPullY(0);
  };

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
    select: (data) => data.filter((c) => c.active !== false)
  });

  const categories = [
  ...dbCategories.map((c) => ({ key: c.slug, label: c.name.toUpperCase(), emoji: c.icon || '🍽️' }))];


  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: () => base44.entities.Banner.list('sort_order'),
    select: (data) => data.filter((b) => b.active !== false)
  });

  const effectiveCategory = activeCategory || categories[0]?.key;

  const filtered = menuItems.filter((item) => {
    const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = search || !effectiveCategory || item.category === effectiveCategory;
    return matchSearch && matchCategory && item.available !== false;
  });

  return (
    <div
      className="min-h-screen bg-background font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullY > 10 &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-primary/90 text-white text-xs font-bold uppercase tracking-widest"
          style={{ height: Math.min(pullY, PULL_THRESHOLD + 20) }}>
          
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Aggiornamento...' : pullY >= PULL_THRESHOLD ? 'Rilascia per aggiornare' : 'Tira per aggiornare'}
          </motion.div>
        }
      </AnimatePresence>

      {/* HERO BANNER */}
      <div className="relative overflow-hidden bg-black">
        {/* Graffiti background texture */}
        <div className="absolute inset-0 bg-[url('https://media.base44.com/images/public/69cfa945a182b6ae303e88a8/984780d56_generated_image.png')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/65 to-background" />

        {/* Red top stripe */}
        <div className="relative z-10 bg-primary h-1 w-full" />

        















        
      </div>

      {/* BANNER CAROUSEL */}
      {banners.length > 0 &&
      <div className="max-w-lg mx-auto px-4 pt-4">
          <BannerCarousel
          banners={banners}
          onProductClick={(itemId) => {
            const item = menuItems.find((m) => m.id === itemId);
            if (item) setSelectedItem(item);
          }}
          onPromoClick={(category) => setActiveCategory(category)} />
        
        </div>
      }

      {/* CHIUSO BANNER */}
      {!storeLoading && !storeIsOpen && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/40 rounded-2xl px-5 py-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-black text-base text-destructive uppercase tracking-wide">Siamo Chiusi</p>
              <p className="text-xs text-muted-foreground mt-0.5">Al momento non accettiamo ordini. Torna presto! 🍕</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 -mt-2">

        {/* CATEGORY TABS + SEARCH BUTTON */}
        <div className="flex gap-1.5 overflow-x-auto py-4 scrollbar-hide -mx-4 px-4 items-center">
          {categories.map((cat) =>
          <button
            key={cat.key}
            onClick={() => { setActiveCategory(cat.key); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
            effectiveCategory === cat.key && !search ?
            'bg-primary text-white border-primary shadow-lg shadow-primary/30' :
            'bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'}`
            }>
              {cat.label}
            </button>
          )}
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cerca nel menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-10 bg-secondary border border-border rounded-sm text-foreground placeholder-muted-foreground text-sm font-medium outline-none focus:border-primary/60 transition-all uppercase tracking-wide" />
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="font-display font-black text-xl uppercase tracking-wider text-foreground">
            {categories.find((c) => c.key === effectiveCategory)?.label || 'MENU'}
          </h2>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">{filtered.length} piatti</span>
        </div>

        {/* GRID */}
        {isLoading ?
        <div className="grid grid-cols-2 gap-3 pb-8">
            {[...Array(6)].map((_, i) =>
          <div key={i} className="bg-card rounded-xl h-52 animate-pulse border border-border" />
          )}
          </div> :
        filtered.length === 0 ?
        <div className="text-center py-20">
            <span className="text-5xl block mb-4">🔍</span>
            <p className="text-muted-foreground uppercase font-bold tracking-widest text-sm">Nessun piatto trovato</p>
          </div> :

        <div className="grid grid-cols-2 gap-3 pb-8">
            <AnimatePresence>
              {filtered.map((item, i) =>
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              
                  <MenuCard item={item} onClick={() => storeIsOpen && setSelectedItem(item)} />
                </motion.div>
            )}
            </AnimatePresence>
          </div>
        }
      </div>

      <CustomizationSheet
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)} />

      <StoreClosedPopup isOpen={storeIsOpen} isLoading={storeLoading} />
      
    </div>);

}