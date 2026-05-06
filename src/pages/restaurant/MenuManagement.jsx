import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X, BookCopy, Search } from 'lucide-react';
import { toast } from 'sonner';

const emptyItem = {
  name: '', description: '', price: 0, category: '', image_url: '',
  available: true, removals: [], extras: [], required_choices: [], preparation_time: 15,
};

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [search, setSearch] = useState('');

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
    select: (data) => data.filter(c => c.active !== false),
  });

  const { data: savedGroups = [] } = useQuery({
    queryKey: ['choiceGroups'],
    queryFn: () => base44.entities.ChoiceGroup.list(),
  });

  const importGroup = (g) => {
    update('required_choices', [...form.required_choices, { group_name: g.group_name, options: g.options || [] }]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menuItems'] }); toast.success('Piatto creato!'); closeDialog(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menuItems'] }); toast.success('Piatto aggiornato!'); closeDialog(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menuItems'] }); toast.success('Piatto eliminato!'); },
  });

  const openCreate = () => { setEditItem(null); setForm(emptyItem); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '', description: item.description || '', price: item.price || 0,
      category: item.category || '', image_url: item.image_url || '', available: item.available !== false,
      removals: item.removals || [], extras: item.extras || [],
      required_choices: item.required_choices || [], preparation_time: item.preparation_time || 15,
    });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name || !form.price) { toast.error('Nome e prezzo obbligatori'); return; }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Removals helpers
  const addRemoval = () => update('removals', [...form.removals, { name: '' }]);
  const updateRemoval = (i, name) => {
    const arr = [...form.removals]; arr[i] = { name }; update('removals', arr);
  };
  const removeRemoval = (i) => update('removals', form.removals.filter((_, idx) => idx !== i));

  // Extras helpers
  const addExtra = () => update('extras', [...form.extras, { name: '', price: 0 }]);
  const updateExtra = (i, field, value) => {
    const arr = [...form.extras]; arr[i] = { ...arr[i], [field]: value }; update('extras', arr);
  };
  const removeExtra = (i) => update('extras', form.extras.filter((_, idx) => idx !== i));

  // Required choices helpers
  const addGroup = () => update('required_choices', [...form.required_choices, { group_name: '', min_selections: 1, max_selections: 1, options: [{ name: '', price: 0 }] }]);
  const updateGroupName = (i, name) => {
    const arr = [...form.required_choices]; arr[i] = { ...arr[i], group_name: name }; update('required_choices', arr);
  };
  const addOption = (gi) => {
    const arr = [...form.required_choices]; arr[gi] = { ...arr[gi], options: [...arr[gi].options, { name: '', price: 0 }] }; update('required_choices', arr);
  };
  const updateOption = (gi, oi, field, value) => {
    const arr = [...form.required_choices]; const opts = [...arr[gi].options]; opts[oi] = { ...opts[oi], [field]: value }; arr[gi] = { ...arr[gi], options: opts }; update('required_choices', arr);
  };
  const removeOption = (gi, oi) => {
    const arr = [...form.required_choices]; arr[gi] = { ...arr[gi], options: arr[gi].options.filter((_, idx) => idx !== oi) }; update('required_choices', arr);
  };
  const removeGroup = (i) => update('required_choices', form.required_choices.filter((_, idx) => idx !== i));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestione Menu</h1>
        <Button onClick={openCreate} className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Nuovo piatto</Button>
      </div>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca piatto..."
          className="pl-9 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const catItems = menuItems.filter(i => i.category === cat.slug && (!search || i.name.toLowerCase().includes(search.toLowerCase())));
            if (catItems.length === 0) return null;
            return (
              <div key={cat.slug}>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2 mt-4">{cat.icon} {cat.name}</h2>
                {catItems.map(item => (
                  <div key={item.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 mb-2">
                    {item.image_url && <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">€{item.price?.toFixed(2)} · {item.available !== false ? '✅ Disponibile' : '❌ Non disponibile'}</p>
                    </div>
                    {/* Upsell toggle */}
                    <div className="flex flex-col items-center gap-0.5">
                      <Switch
                        checked={item.is_upsell_item === true}
                        onCheckedChange={(val) => {
                          const upsellCount = menuItems.filter(m => m.is_upsell_item).length;
                          if (val && upsellCount >= 6) { toast.error('Massimo 6 prodotti upsell'); return; }
                          base44.entities.MenuItem.update(item.id, { is_upsell_item: val })
                            .then(() => queryClient.invalidateQueries({ queryKey: ['menuItems'] }));
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Cross-selling</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => deleteMutation.mutate(item.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Modifica piatto' : 'Nuovo piatto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Prezzo (€) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => update('price', parseFloat(e.target.value) || 0)} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Descrizione</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} className="mt-1" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category} onValueChange={v => update('category', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona..." /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.icon} {c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs">Tempo prep. (min)</Label><Input type="number" value={form.preparation_time} onChange={e => update('preparation_time', parseInt(e.target.value) || 15)} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">URL Immagine</Label><Input value={form.image_url} onChange={e => update('image_url', e.target.value)} className="mt-1" placeholder="https://..." /></div>
            <div className="flex items-center gap-3"><Switch checked={form.available} onCheckedChange={v => update('available', v)} /><Label className="text-sm">Disponibile</Label></div>

            {/* Removals */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2"><Label className="text-xs font-semibold">Rimozioni (Senza...)</Label><Button variant="ghost" size="sm" onClick={addRemoval} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Aggiungi</Button></div>
              {form.removals.map((r, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={r.name} onChange={e => updateRemoval(i, e.target.value)} placeholder="Es. cipolla" className="h-8 text-sm" />
                  <button onClick={() => removeRemoval(i)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              ))}
            </div>

            {/* Extras */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2"><Label className="text-xs font-semibold">Extra (Aggiunte)</Label><Button variant="ghost" size="sm" onClick={addExtra} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Aggiungi</Button></div>
              {form.extras.map((ex, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={ex.name} onChange={e => updateExtra(i, 'name', e.target.value)} placeholder="Es. doppia mozzarella" className="h-8 text-sm flex-1" />
                  <Input type="number" step="0.01" value={ex.price} onChange={e => updateExtra(i, 'price', parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20" placeholder="€" />
                  <button onClick={() => removeExtra(i)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              ))}
            </div>

            {/* Required Choices */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold">Scelte Obbligatorie</Label>
                <div className="flex gap-1">
                  {savedGroups.length > 0 && (
                    <Select onValueChange={(id) => { const g = savedGroups.find(x => x.id === id); if (g) importGroup(g); }}>
                      <SelectTrigger className="h-7 text-xs w-36 border-dashed">
                        <BookCopy className="w-3 h-3 mr-1" /><SelectValue placeholder="Importa..." />
                      </SelectTrigger>
                      <SelectContent>{savedGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.group_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="sm" onClick={addGroup} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Gruppo</Button>
                </div>
              </div>
              {form.required_choices.map((g, gi) => (
                <div key={gi} className="bg-muted rounded-lg p-3 mb-2">
                <div className="flex gap-2 mb-2">
                  <Input value={g.group_name} onChange={e => updateGroupName(gi, e.target.value)} placeholder="Es. Cottura" className="h-8 text-sm font-semibold flex-1" />
                  <button onClick={() => removeGroup(gi)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">Min</span>
                    <Input type="number" min="0" value={g.min_selections ?? 1} onChange={e => { const arr=[...form.required_choices]; arr[gi]={...arr[gi], min_selections: parseInt(e.target.value)||0}; update('required_choices',arr); }} className="h-7 text-xs" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">Max</span>
                    <Input type="number" min="1" value={g.max_selections ?? 1} onChange={e => { const arr=[...form.required_choices]; arr[gi]={...arr[gi], max_selections: parseInt(e.target.value)||1}; update('required_choices',arr); }} className="h-7 text-xs" />
                  </div>
                </div>
                  {g.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2 mb-1 ml-2">
                      <Input value={opt.name} onChange={e => updateOption(gi, oi, 'name', e.target.value)} placeholder="Opzione" className="h-7 text-xs flex-1" />
                      <Input type="number" step="0.01" value={opt.price} onChange={e => updateOption(gi, oi, 'price', parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16" placeholder="€" />
                      <button onClick={() => removeOption(gi, oi)}><X className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(gi)} className="h-6 text-[10px] mt-1"><Plus className="w-3 h-3 mr-1" />Opzione</Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={handleSave}>{editItem ? 'Aggiorna' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}