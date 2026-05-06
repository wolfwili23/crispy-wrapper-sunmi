import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronRight, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Categorie da suggerire sempre
const SUGGEST_SLUGS = ['salse', 'contorni', 'bibite', 'bevande', 'dolci'];

export default function CrossSellSheet({ open, onClose, onProceed }) {
  const { items, addItem } = useCart();
  const [suggestions, setSuggestions] = useState([]);
  const [added, setAdded] = useState({});

  useEffect(() => {
    if (!open) return;
    base44.entities.MenuItem.list().then(all => {
      // Categorie già nel carrello
      const cartSlugs = new Set(items.map(i => i.category || ''));

      // Filtra: solo da SUGGEST_SLUGS, non già nel carrello, disponibili
      const candidates = all.filter(m =>
        m.available !== false &&
        SUGGEST_SLUGS.some(s => m.category?.toLowerCase().includes(s)) &&
        !cartSlugs.has(m.category)
      );

      // Shuffle e prendi max 8
      const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 8);
      setSuggestions(shuffled);
    });
  }, [open]);

  const handleAdd = (item) => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      base_price: item.price,
      quantity: 1,
      removals: [],
      extras: [],
      required_choices: [],
      item_total: item.price,
      notes: '',
    });
    setAdded(prev => ({ ...prev, [item.id]: true }));
    toast.success(`${item.name} aggiunto!`);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl bg-card border-t-2 border-primary p-0 max-h-[75vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div>
            <h2 className="font-display font-black text-2xl uppercase tracking-wide">Completa il tuo pasto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Aggiungi qualcosa in più al tuo ordine</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Carousel */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nessun suggerimento disponibile</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {suggestions.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex-shrink-0 w-36 bg-secondary rounded-xl border border-border overflow-hidden"
                >
                  {/* Image */}
                  <div className="h-24 bg-muted relative overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="font-bold text-xs uppercase tracking-wide leading-tight line-clamp-2 mb-1.5">{item.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-display font-black text-sm text-accent">€{item.price?.toFixed(2)}</span>
                      <button
                        onClick={() => handleAdd(item)}
                        disabled={added[item.id]}
                        className={`w-7 h-7 rounded-sm flex items-center justify-center transition-all ${
                          added[item.id]
                            ? 'bg-green-500 text-white'
                            : 'bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/30'
                        }`}
                      >
                        {added[item.id] ? '✓' : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-4 pb-6 pt-3 border-t border-border space-y-2">
          <button
            onClick={onProceed}
            className="w-full h-13 bg-primary hover:bg-primary/90 text-white font-display font-black text-sm uppercase tracking-widest rounded-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 py-3.5"
          >
            Vai al pagamento <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onProceed}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 text-center"
          >
            No grazie, prosegui senza aggiungere
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}