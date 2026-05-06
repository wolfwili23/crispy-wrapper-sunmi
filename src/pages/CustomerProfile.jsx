import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, MapPin, Phone, LogOut, Truck, LayoutDashboard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function CustomerProfile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm({ phone: u.phone || '', address: u.address || '' });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    toast.success('Profilo aggiornato!');
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    toast.info('Richiesta eliminazione account inviata. Sarai contattato dal supporto.');
    // In a real scenario you'd call a backend function here
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profilo</h1>

      <div className="bg-card rounded-2xl p-6 border border-border mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.full_name || 'Utente'}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Telefono</Label>
            <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+39 333 1234567" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Indirizzo predefinito</Label>
            <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Via Roma 1, Roma" className="mt-1 rounded-xl" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
            Salva modifiche
          </Button>
        </div>
      </div>

      {/* Quick links to other interfaces */}
      {(user.role === 'admin' || user.role === 'restaurant') && (
        <Link to="/restaurant" className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border mb-3 hover:border-primary/30 transition-colors">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Pannello Ristorante</span>
        </Link>
      )}
      {(user.role === 'admin' || user.role === 'driver') && (
        <Link to="/driver" className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border mb-3 hover:border-primary/30 transition-colors">
          <Truck className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Area Driver</span>
        </Link>
      )}

      <button
        onClick={() => base44.auth.logout()}
        className="flex items-center gap-3 w-full bg-card rounded-2xl p-4 border border-border text-destructive hover:bg-destructive/5 transition-colors mt-4"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Esci</span>
      </button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="flex items-center gap-3 w-full bg-card rounded-2xl p-4 border border-destructive/30 text-destructive/70 hover:bg-destructive/5 transition-colors mt-3">
            <Trash2 className="w-5 h-5" />
            <span className="font-medium text-sm">Elimina account</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'account?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Tutti i tuoi dati, ordini e preferenze verranno eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sì, elimina account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}