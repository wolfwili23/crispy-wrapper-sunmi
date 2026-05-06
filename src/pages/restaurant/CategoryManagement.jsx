import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const emptyForm = { name: '', slug: '', icon: '🍽️', sort_order: 0, active: true };

export default function CategoryManagement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [inlineEdit, setInlineEdit] = useState(null); // { id, name }
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('sort_order'),
  });

  const save = useMutation({
    mutationFn: (data) =>
      editId
        ? base44.entities.Category.update(editId, data)
        : base44.entities.Category.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: editId ? 'Categoria aggiornata' : 'Categoria creata' });
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria eliminata' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Category.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, sort_order: categories.length });
    setOpen(true);
  };

  const openEdit = (cat) => {
    setEditId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '🍽️', sort_order: cat.sort_order ?? 0, active: cat.active !== false });
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save.mutate({ ...form, sort_order: Number(form.sort_order) });
  };

  const autoSlug = (name) => name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const saveInlineName = (cat) => {
    if (!inlineEdit || !inlineEdit.name.trim()) { setInlineEdit(null); return; }
    base44.entities.Category.update(cat.id, { name: inlineEdit.name.trim() })
      .then(() => { qc.invalidateQueries({ queryKey: ['categories'] }); toast({ title: 'Nome aggiornato' }); });
    setInlineEdit(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl uppercase tracking-wider text-white">CATEGORIE</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci le categorie visibili nel menu cliente</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs gap-2">
          <Plus className="w-4 h-4" /> AGGIUNGI
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Caricamento...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-sm">
          <p className="text-muted-foreground text-sm">Nessuna categoria. Creane una!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 bg-card border border-border rounded-sm px-4 py-3"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-2xl">{cat.icon || '🍽️'}</span>
              <div className="flex-1 min-w-0">
                {inlineEdit?.id === cat.id ? (
                  <input
                    autoFocus
                    value={inlineEdit.name}
                    onChange={e => setInlineEdit(prev => ({ ...prev, name: e.target.value }))}
                    onBlur={() => saveInlineName(cat)}
                    onKeyDown={e => { if (e.key === 'Enter') saveInlineName(cat); if (e.key === 'Escape') setInlineEdit(null); }}
                    className="font-bold text-white text-sm bg-transparent border-b border-primary outline-none w-full"
                  />
                ) : (
                  <p
                    className="font-bold text-white text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setInlineEdit({ id: cat.id, name: cat.name })}
                    title="Clicca per modificare il nome"
                  >{cat.name}</p>
                )}
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{cat.slug}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">#{cat.sort_order ?? 0}</span>

              {/* Toggle active */}
              <Switch
                checked={cat.active !== false}
                onCheckedChange={(val) => toggleActive.mutate({ id: cat.id, active: val })}
              />

              <button
                onClick={() => openEdit(cat)}
                className="p-2 text-muted-foreground hover:text-white transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => remove.mutate(cat.id)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl uppercase tracking-wider">
              {editId ? 'MODIFICA CATEGORIA' : 'NUOVA CATEGORIA'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Emoji / Icona</label>
              <Input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🍽️"
                className="text-2xl text-center w-24"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Nome *</label>
              <Input
                required
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({ ...f, name, slug: f.slug || autoSlug(name) }));
                }}
                placeholder="Es. Pizze"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Slug (ID univoco) *</label>
              <Input
                required
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))}
                placeholder="Es. pizze"
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Usato internamente per filtrare il menu. Solo lettere minuscole e _</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Ordine</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={val => setForm(f => ({ ...f, active: val }))}
              />
              <span className="text-sm text-muted-foreground">Visibile nel menu</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="submit" className="flex-1 bg-primary font-black uppercase tracking-widest text-xs" disabled={save.isPending}>
                {save.isPending ? 'Salvo...' : 'SALVA'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}