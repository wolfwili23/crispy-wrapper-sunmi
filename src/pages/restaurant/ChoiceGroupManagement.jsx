import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const emptyGroup = { group_name: '', min_selections: 1, max_selections: 1, options: [{ name: '', price: 0 }] };

export default function ChoiceGroupManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState(emptyGroup);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['choiceGroups'],
    queryFn: () => base44.entities.ChoiceGroup.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChoiceGroup.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['choiceGroups'] }); toast.success('Gruppo creato!'); closeDialog(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChoiceGroup.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['choiceGroups'] }); toast.success('Gruppo aggiornato!'); closeDialog(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChoiceGroup.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['choiceGroups'] }); toast.success('Gruppo eliminato!'); },
  });

  const openCreate = () => { setEditGroup(null); setForm(emptyGroup); setDialogOpen(true); };
  const openEdit = (g) => { setEditGroup(g); setForm({ group_name: g.group_name, min_selections: g.min_selections ?? 1, max_selections: g.max_selections ?? 1, options: g.options || [] }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditGroup(null); };

  const handleSave = () => {
    if (!form.group_name) { toast.error('Nome gruppo obbligatorio'); return; }
    if (editGroup) updateMutation.mutate({ id: editGroup.id, data: form });
    else createMutation.mutate(form);
  };

  const addOption = () => setForm(prev => ({ ...prev, options: [...prev.options, { name: '', price: 0 }] }));
  const updateOption = (i, field, value) => {
    const opts = [...form.options]; opts[i] = { ...opts[i], [field]: value };
    setForm(prev => ({ ...prev, options: opts }));
  };
  const removeOption = (i) => setForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gruppi Scelte Obbligatorie</h1>
        <Button onClick={openCreate} className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Nuovo gruppo</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold uppercase tracking-widest text-sm">Nessun gruppo salvato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.id} className="bg-card rounded-xl p-4 border border-border flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{g.group_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                  {(g.options || []).map(o => o.name + (o.price > 0 ? ` (+€${o.price.toFixed(2)})` : '')).join(' · ')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Min: {g.min_selections ?? 1} · Max: {g.max_selections ?? 1}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                <button onClick={() => deleteMutation.mutate(g.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editGroup ? 'Modifica gruppo' : 'Nuovo gruppo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome gruppo *</Label>
              <Input value={form.group_name} onChange={e => setForm(prev => ({ ...prev, group_name: e.target.value }))} className="mt-1" placeholder="Es. Cottura, Formato, Salsa..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min. selezioni</Label>
                <Input type="number" min="0" value={form.min_selections} onChange={e => setForm(prev => ({ ...prev, min_selections: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Max. selezioni</Label>
                <Input type="number" min="1" value={form.max_selections} onChange={e => setForm(prev => ({ ...prev, max_selections: parseInt(e.target.value) || 1 }))} className="mt-1" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold">Opzioni</Label>
                <Button variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Aggiungi</Button>
              </div>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} placeholder="Nome opzione" className="h-8 text-sm flex-1" />
                  <Input type="number" step="0.01" value={opt.price} onChange={e => updateOption(i, 'price', parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20" placeholder="€" />
                  <button onClick={() => removeOption(i)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={handleSave}>{editGroup ? 'Aggiorna' : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}