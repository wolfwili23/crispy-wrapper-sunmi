import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ShoppingBag } from 'lucide-react';

export default function CrossSelling() {
  const queryClient = useQueryClient();

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const upsellCount = menuItems.filter(i => i.is_upsell_item).length;

  const handleToggle = async (item, val) => {
    if (val && upsellCount >= 6) {
      toast.error('Massimo 6 prodotti cross-selling attivi');
      return;
    }
    await base44.entities.MenuItem.update(item.id, { is_upsell_item: val });
    queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    toast.success(val ? `"${item.name}" aggiunto al cross-selling` : `"${item.name}" rimosso`);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Cross-selling</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Seleziona i prodotti da mostrare nel popup prima del checkout. <strong>Massimo 6</strong> prodotti attivi ({upsellCount}/6 selezionati).
      </p>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {menuItems.map(item => (
            <div key={item.id} className={`bg-card rounded-xl p-4 border flex items-center gap-4 transition-all ${item.is_upsell_item ? 'border-primary/50' : 'border-border'}`}>
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">€{item.price?.toFixed(2)} · {item.category}</p>
              </div>
              {item.is_upsell_item && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-sm">
                  Attivo
                </span>
              )}
              <Switch
                checked={item.is_upsell_item === true}
                onCheckedChange={(val) => handleToggle(item, val)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}