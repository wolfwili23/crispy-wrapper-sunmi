import React, { useState } from 'react';
import UpsellModal from '@/components/cart/UpsellModal';
import { useCart } from '@/context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, itemCount } = useCart();
  const [showUpsell, setShowUpsell] = useState(false);
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="w-28 h-28 rounded-sm bg-secondary border border-border flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
        </div>
        <h2 className="font-display font-black text-3xl uppercase tracking-wide mb-2">Carrello vuoto</h2>
        <p className="text-muted-foreground text-sm mb-8 uppercase tracking-wider">Aggiungi qualcosa di buono</p>
        <Link to="/">
          <button className="h-12 px-8 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded-sm flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Vai al menu
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black border-b-2 border-primary px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display font-black text-2xl uppercase tracking-wide">Il tuo ordine</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{itemCount} articoli</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Items */}
        <div className="space-y-2 mb-6">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.cartId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-card rounded-sm border border-border overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-bold text-base uppercase tracking-wide flex-1 pr-2">{item.name}</h3>
                    <button
                      onClick={() => removeItem(item.cartId)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Customizations */}
                  <div className="space-y-0.5 mb-3">
                    {item.removals?.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">❌ Senza: {item.removals.join(', ')}</p>
                    )}
                    {item.extras?.length > 0 && (
                      <p className="text-[11px] text-accent">➕ Extra: {item.extras.map(e => `${e.name}`).join(', ')}</p>
                    )}
                    {item.required_choices?.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {item.required_choices.map(c => `${c.group_name}: ${c.selected}`).join(' · ')}
                      </p>
                    )}
                    {item.notes && <p className="text-[11px] text-muted-foreground">📝 {item.notes}</p>}
                  </div>

                  {/* Qty + price row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                        className="w-8 h-8 rounded-sm border border-border flex items-center justify-center hover:border-primary text-white/70 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-display font-black text-lg w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                        className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                      </button>
                    </div>
                    <span className="font-display font-black text-xl text-accent">
                      €{(item.item_total * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-sm border border-border p-5 mb-6">
          <h3 className="font-display font-black text-sm uppercase tracking-widest text-muted-foreground mb-4">Riepilogo</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotale</span>
              <span className="font-medium">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Consegna</span>
              <span className="font-medium text-xs text-muted-foreground/70">calcolata al checkout</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo di Servizio</span>
              <span className="font-medium">€1.50</span>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex justify-between items-center">
            <span className="font-display font-black text-lg uppercase tracking-wide">Subtotale</span>
            <span className="font-display font-black text-3xl text-primary">€{subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowUpsell(true)}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-display font-black text-base uppercase tracking-widest rounded-sm flex items-center justify-between px-6 transition-all shadow-xl shadow-primary/20"
        >
          <span>Procedi al checkout</span>
          <div className="flex items-center gap-2">
            <span>€{subtotal.toFixed(2)}</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>
      </div>

      <UpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        onProceed={() => { setShowUpsell(false); navigate('/checkout'); }}
      />
    </div>
  );
}