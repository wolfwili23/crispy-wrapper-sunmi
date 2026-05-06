import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Tag, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {
  code: '', description: '', discount_type: 'percentage', discount_value: 10,
  min_order: 0, max_uses: '', assigned_to_email: '', active: true, expires_at: '',
};

export default function CouponManagement() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date'),
  });

  const { data: fidelityCards = [] } = useQuery({
    queryKey: ['fidelity-cards'],
    queryFn: () => base44.entities.FidelityCard.list('-points'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        code: data.code.toUpperCase().trim(),
        discount_value: parseFloat(data.discount_value),
        min_order: parseFloat(data.min_order) || 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        expires_at: data.expires_at || null,
        assigned_to_email: data.assigned_to_email || null,
      };
      if (editing) return base44.entities.Coupon.update(editing.id, payload);
      return base44.entities.Coupon.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['coupons']); setOpen(false); toast.success('Coupon salvato'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => { qc.invalidateQueries(['coupons']); toast.success('Coupon eliminato'); },
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c, max_uses: c.max_uses ?? '', assigned_to_email: c.assigned_to_email ?? '', expires_at: c.expires_at ?? '' }); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Coupons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Coupon</h2>
          <Button onClick={openNew} size="sm" className="rounded-xl"><Plus className="w-4 h-4 mr-1" /> Nuovo coupon</Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Caricamento...</p>
        ) : coupons.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessun coupon creato.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-primary">{c.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.description || (c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-€${c.discount_value}`)}</p>
                  </div>
                </div>
                <div className="text-sm font-semibold shrink-0">
                  {c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-€${c.discount_value}`}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {c.uses_count || 0}{c.max_uses ? `/${c.max_uses}` : ''} usi
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fidelity */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-accent" /> Clienti Fidelity</h2>
        {fidelityCards.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessun cliente fidelity ancora.</p>
        ) : (
          <div className="space-y-2">
            {fidelityCards.map(card => (
              <div key={card.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{card.customer_name || card.customer_email}</p>
                  <p className="text-xs text-muted-foreground">{card.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">{card.points} pt</p>
                  <p className="text-xs text-muted-foreground">{card.total_orders} ordini · €{(card.total_spent || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Modifica coupon' : 'Nuovo coupon'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Codice *</Label>
              <Input value={form.code} onChange={e => upd('code', e.target.value.toUpperCase())} placeholder="BENVENUTO10" className="mt-1 rounded-xl font-mono" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrizione</Label>
              <Input value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Sconto benvenuto" className="mt-1 rounded-xl" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Tipo sconto *</Label>
                <Select value={form.discount_type} onValueChange={v => upd('discount_type', v)}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentuale (%)</SelectItem>
                    <SelectItem value="fixed">Fisso (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="text-xs text-muted-foreground">Valore *</Label>
                <Input type="number" value={form.discount_value} onChange={e => upd('discount_value', e.target.value)} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Ordine minimo (€)</Label>
                <Input type="number" value={form.min_order} onChange={e => upd('min_order', e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Max utilizzi</Label>
                <Input type="number" value={form.max_uses} onChange={e => upd('max_uses', e.target.value)} placeholder="Illimitato" className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Riservato a (email utente)</Label>
              <Input value={form.assigned_to_email} onChange={e => upd('assigned_to_email', e.target.value)} placeholder="Lascia vuoto per tutti" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Scadenza</Label>
              <Input type="date" value={form.expires_at} onChange={e => upd('expires_at', e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.active} onCheckedChange={v => upd('active', v)} />
              <Label className="text-sm">Coupon attivo</Label>
            </div>
            <Button onClick={() => saveMutation.mutate(form)} className="w-full rounded-xl mt-2" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvataggio...' : 'Salva coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}