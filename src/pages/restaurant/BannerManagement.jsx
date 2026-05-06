import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Image } from 'lucide-react';
import { toast } from 'sonner';

const emptyBanner = { title: '', image_url: '', link_type: 'none', menu_item_id: '', promo_category: '', sort_order: 0, active: true };

export default function BannerManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [form, setForm] = useState(emptyBanner);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => base44.entities.Banner.list('sort_order'),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Banner.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner creato!'); close(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Banner.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner aggiornato!'); close(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Banner.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner eliminato!'); },
  });

  const open = (banner = null) => {
    setEditBanner(banner);
    setForm(banner ? { ...emptyBanner, ...banner } : emptyBanner);
    setDialogOpen(true);
  };
  const close = () => { setDialogOpen(false); setEditBanner(null); };

  const handleSave = () => {
    if (!form.image_url) { toast.error('URL immagine obbligatorio'); return; }
    if (editBanner) updateMutation.mutate({ id: editBanner.id, data: form });
    else createMutation.mutate(form);
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const categories = ['antipasti', 'primi', 'secondi', 'pizze', 'contorni', 'dolci', 'bevande'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banner Pubblicitari</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestisci il carousel della home page</p>
        </div>
        <Button onClick={() => open()} className="gap-2 rounded-sm font-bold uppercase tracking-wider text-xs">
          <Plus className="w-4 h-4" /> Nuovo Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-sm animate-pulse" />)}</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-sm">
          <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest">Nessun banner</p>
          <p className="text-xs text-muted-foreground mt-1">Aggiungi banner promozionali per la home page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((banner, i) => (
            <div key={banner.id} className="bg-card rounded-sm border border-border flex items-center gap-4 overflow-hidden">
              <div className="w-24 h-16 flex-shrink-0 relative">
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                {!banner.active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-[9px] text-white/60 font-bold uppercase">Off</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 py-3">
                <p className="font-bold text-sm truncate">{banner.title || '(senza titolo)'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                    banner.link_type === 'product' ? 'bg-primary/20 text-primary' :
                    banner.link_type === 'promo' ? 'bg-accent/20 text-accent' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {banner.link_type === 'product' ? '→ Prodotto' : banner.link_type === 'promo' ? '→ Promo' : 'Nessun link'}
                  </span>
                  <span className="text-xs text-muted-foreground">Ordine: {banner.sort_order}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 pr-3">
                <button onClick={() => open(banner)} className="p-2 hover:bg-muted rounded-sm transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => deleteMutation.mutate(banner.id)} className="p-2 hover:bg-destructive/10 rounded-sm transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-wide">
              {editBanner ? 'Modifica Banner' : 'Nuovo Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider">Titolo</Label>
              <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Es. Offerta Speciale!" className="mt-1 rounded-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">URL Immagine *</Label>
              <Input value={form.image_url} onChange={e => update('image_url', e.target.value)} placeholder="https://..." className="mt-1 rounded-sm" />
              {form.image_url && (
                <div className="mt-2 h-28 rounded-sm overflow-hidden border border-border">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider">Tipo di Link</Label>
                <Select value={form.link_type} onValueChange={v => update('link_type', v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessun link</SelectItem>
                    <SelectItem value="product">→ Prodotto</SelectItem>
                    <SelectItem value="promo">→ Categoria promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Ordine</Label>
                <Input type="number" value={form.sort_order} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} className="mt-1 rounded-sm" />
              </div>
            </div>

            {form.link_type === 'product' && (
              <div>
                <Label className="text-xs uppercase tracking-wider">Prodotto collegato</Label>
                <Select value={form.menu_item_id} onValueChange={v => update('menu_item_id', v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue placeholder="Seleziona un piatto..." /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.link_type === 'promo' && (
              <div>
                <Label className="text-xs uppercase tracking-wider">Categoria promo</Label>
                <Select value={form.promo_category} onValueChange={v => update('promo_category', v)}>
                  <SelectTrigger className="mt-1 rounded-sm"><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger>
                  <SelectContent>
                    {['antipasti', 'primi', 'secondi', 'pizze', 'contorni', 'dolci', 'bevande'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.active} onCheckedChange={v => update('active', v)} />
              <Label className="text-sm">Banner attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} className="rounded-sm">Annulla</Button>
            <Button onClick={handleSave} className="rounded-sm font-bold uppercase tracking-wider text-xs">
              {editBanner ? 'Aggiorna' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}