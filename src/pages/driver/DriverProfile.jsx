import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverProfile() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setPhone(u.phone || '');
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone });
    toast.success('Profilo aggiornato!');
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profilo Driver</h1>

      <div className="bg-card rounded-2xl p-6 border border-border mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.full_name || 'Driver'}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Telefono</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+39 333 1234567" className="mt-1 rounded-xl" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">Salva</Button>
        </div>
      </div>

      <button
        onClick={() => base44.auth.logout()}
        className="flex items-center gap-3 w-full bg-card rounded-2xl p-4 border border-border text-destructive hover:bg-destructive/5 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Esci</span>
      </button>
    </div>
  );
}