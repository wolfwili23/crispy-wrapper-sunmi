import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/context/CartContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function UpsellModal({ open, onClose, onProceed }) {
  const { items: cartItems, addItem } = useCart();
  const [added, setAdded] = useState({});

  const { data: upsellItems = [] } = useQuery({
    queryKey: ['upsellItems'],
    queryFn: () => base44.entities.MenuItem.filter({ is_upsell_item: true }),
    enabled: open,
  });

  const cartItemIds = new Set(cartItems.map(i => i.menu_item_id));
  const visibleItems = upsellItems.filter(i => !cartItemIds.has(i.id));

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display font-black text-xl uppercase tracking-wider text-white">
            🔥 Vuoi aggiungere qualcosa?
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Prima di procedere al pagamento</p>
        </DialogHeader>

        {visibleItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            Nessun prodotto consigliato disponibile.
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[55vh] px-4 py-3 space-y-2">
            {visibleItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-secondary rounded-sm border border-border p-3"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-sm object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-sm bg-muted flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm uppercase tracking-wide text-white truncate">{item.name}</p>
                  {item.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>}
                  <p className="text-accent font-black text-base mt-1">€{item.price?.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={added[item.id]}
                  className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 transition-all font-black text-xs ${
                    added[item.id]
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/30'
                  }`}
                >
                  {added[item.id] ? '✓' : <Plus className="w-4 h-4" strokeWidth={3} />}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="px-4 pb-5 pt-3 space-y-2 border-t border-border">
          <button
            onClick={onProceed}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-display font-black text-sm uppercase tracking-widest rounded-sm flex items-center justify-between px-5 transition-all shadow-lg shadow-primary/20"
          >
            <span>Procedi al pagamento</span>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onProceed}
            className="w-full text-center text-xs text-muted-foreground hover:text-white transition-colors py-1"
          >
            No grazie, prosegui al pagamento
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}