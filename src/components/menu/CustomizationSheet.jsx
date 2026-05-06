import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export default function CustomizationSheet({ item, open, onClose }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedRemovals, setSelectedRemovals] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [requiredSelections, setRequiredSelections] = useState({});
  const [notes, setNotes] = useState('');

  const hasRequiredChoices = item?.required_choices?.length > 0;
  const allRequiredSelected = !hasRequiredChoices ||
    item.required_choices.every(g => requiredSelections[g.group_name]);

  const extrasTotal = useMemo(() =>
    selectedExtras.reduce((sum, ex) => sum + (ex.price || 0), 0), [selectedExtras]);
  const requiredTotal = useMemo(() =>
    Object.values(requiredSelections).reduce((sum, sel) => sum + (sel?.price || 0), 0), [requiredSelections]);

  const itemPrice = (item?.price || 0) + extrasTotal + requiredTotal;
  const totalPrice = itemPrice * quantity;

  const toggleRemoval = (name) =>
    setSelectedRemovals(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);

  const toggleExtra = (extra) =>
    setSelectedExtras(prev =>
      prev.find(e => e.name === extra.name) ? prev.filter(e => e.name !== extra.name) : [...prev, extra]);

  const handleAdd = () => {
    if (!allRequiredSelected) { toast.error('Seleziona tutte le opzioni obbligatorie'); return; }
    addItem({
      menu_item_id: item.id, name: item.name, base_price: item.price, quantity,
      removals: selectedRemovals, extras: selectedExtras,
      required_choices: Object.entries(requiredSelections).map(([group_name, sel]) => ({
        group_name, selected: sel.name, price: sel.price || 0,
      })),
      item_total: itemPrice, notes,
    });
    toast.success(`${item.name} aggiunto!`);
    reset();
  };

  const reset = () => {
    setQuantity(1); setSelectedRemovals([]); setSelectedExtras([]); setRequiredSelections({}); setNotes('');
    onClose();
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={reset}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[92vh] overflow-y-auto bg-card border-t-2 border-primary p-0"
      >
        {/* Image header */}
        <div className="relative h-52 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl">🍽️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-black/30 to-transparent" />
          <button
            onClick={reset}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Category badge */}
          <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm">
            {item.category}
          </div>
        </div>

        <div className="px-5 pt-4 pb-2">
          <h2 className="font-display font-black text-3xl uppercase text-foreground tracking-tight leading-none">
            {item.name}
          </h2>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1.5">{item.description}</p>
          )}
          <p className="text-accent font-display font-black text-3xl mt-2">€{item.price?.toFixed(2)}</p>
        </div>

        <div className="px-5 pb-36 space-y-5 mt-2">
          {/* Required Choices */}
          {item.required_choices?.map((group) => (
            <div key={group.group_name}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="font-bold text-sm uppercase tracking-widest">{group.group_name}</h3>
                <span className="text-[9px] font-black uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-sm">
                  Obbligatorio
                </span>
              </div>
              <RadioGroup
                value={requiredSelections[group.group_name]?.name || ''}
                onValueChange={(val) => {
                  const option = group.options.find(o => o.name === val);
                  setRequiredSelections(prev => ({ ...prev, [group.group_name]: option }));
                }}
              >
                {group.options.map(option => (
                  <label key={option.name} className="flex items-center justify-between p-3 rounded-sm border border-border hover:border-primary/50 bg-secondary cursor-pointer transition-all mb-1.5">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.name} />
                      <span className="text-sm font-medium">{option.name}</span>
                    </div>
                    {option.price > 0 && (
                      <span className="text-xs font-bold text-accent">+€{option.price.toFixed(2)}</span>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>
          ))}

          {/* Removals */}
          {item.removals?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-muted-foreground rounded-full" />
                <h3 className="font-bold text-sm uppercase tracking-widest">Rimuovi ingredienti</h3>
              </div>
              {item.removals.map(removal => (
                <label key={removal.name} className="flex items-center gap-3 p-3 rounded-sm border border-border hover:border-primary/50 bg-secondary cursor-pointer transition-all mb-1.5">
                  <Checkbox
                    checked={selectedRemovals.includes(removal.name)}
                    onCheckedChange={() => toggleRemoval(removal.name)}
                  />
                  <span className="text-sm font-medium">Senza {removal.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* Extras */}
          {item.extras?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-accent rounded-full" />
                <h3 className="font-bold text-sm uppercase tracking-widest">Extra</h3>
              </div>
              {item.extras.map(extra => (
                <label key={extra.name} className="flex items-center justify-between p-3 rounded-sm border border-border hover:border-accent/50 bg-secondary cursor-pointer transition-all mb-1.5">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={!!selectedExtras.find(e => e.name === extra.name)}
                      onCheckedChange={() => toggleExtra(extra)}
                    />
                    <span className="text-sm font-medium">{extra.name}</span>
                  </div>
                  <span className="text-xs font-bold text-accent">+€{extra.price?.toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-muted-foreground/40 rounded-full" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Note</h3>
            </div>
            <Textarea
              placeholder="Es. ben cotto, allergie..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none bg-secondary border-border rounded-sm text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-border p-4">
          {/* Qty */}
          <div className="flex items-center justify-center gap-5 mb-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-sm border border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-display font-black text-2xl w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={3} />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={!allRequiredSelected}
            className="w-full h-13 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-display font-black text-base uppercase tracking-widest rounded-sm flex items-center justify-between px-5 transition-all shadow-lg shadow-primary/30 py-3"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Aggiungi al carrello</span>
            <span>€{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}