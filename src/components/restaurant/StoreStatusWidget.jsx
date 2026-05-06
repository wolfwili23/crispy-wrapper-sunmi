import React, { useState } from 'react';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { Power, Clock, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StoreStatusWidget() {
  const { isOpen, scheduledOpen, manualOverride, schedule, isSaving, isSavingSchedule, setManualOverride, saveSchedule } = useStoreStatus();
  const [showSchedule, setShowSchedule] = useState(false);
  const [localSchedule, setLocalSchedule] = useState(null);

  const effectiveSchedule = localSchedule || schedule;

  const handleToggle = async () => {
    const next = isOpen ? 'closed' : 'open';
    await setManualOverride(next);
    toast.success(next === 'open' ? '🟢 Negozio aperto manualmente' : '🔴 Negozio chiuso manualmente');
  };

  const handleResetOverride = async () => {
    await setManualOverride(null);
    toast.success('Torna agli orari programmati');
  };

  const handleSaveSchedule = async () => {
    await saveSchedule(effectiveSchedule);
    setLocalSchedule(null);
    toast.success('Orari salvati');
  };

  const updateSlot = (day, field, value) => {
    const updated = effectiveSchedule.map(s =>
      s.day === day ? { ...s, [field]: value } : s
    );
    setLocalSchedule(updated);
  };

  return (
    <div className={`rounded-2xl border-2 transition-all ${isOpen ? 'border-green-500/60 bg-green-950/20' : 'border-destructive/60 bg-destructive/10'}`}>

      {/* Header / toggle principale */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOpen ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
            <Power className={`w-6 h-6 ${isOpen ? 'text-green-400' : 'text-destructive'}`} />
          </div>
          <div>
            <p className="font-black text-lg uppercase tracking-widest">
              {isOpen ? '🟢 Negozio Aperto' : '🔴 Negozio Chiuso'}
            </p>
            <p className="text-xs text-muted-foreground">
              {manualOverride === 'open' && 'Aperto manualmente (fuori orario)'}
              {manualOverride === 'closed' && 'Chiuso manualmente (override attivo)'}
              {!manualOverride && (scheduledOpen ? 'Aperto secondo orario programmato' : 'Chiuso secondo orario programmato')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {manualOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOverride}
              disabled={isSaving}
              className="text-xs rounded-xl"
            >
              <Clock className="w-3 h-3 mr-1" /> Usa orari
            </Button>
          )}
          <Button
            size="lg"
            variant={isOpen ? 'destructive' : 'default'}
            onClick={handleToggle}
            disabled={isSaving}
            className="rounded-xl font-black uppercase tracking-widest px-6 h-12"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isOpen ? 'CHIUDI ORA' : 'APRI ORA'}
          </Button>
        </div>
      </div>

      {/* Toggle orari */}
      <button
        onClick={() => setShowSchedule(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-border/50 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Orari programmati</span>
        {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showSchedule && (
        <div className="px-5 pb-5 space-y-2">
          {effectiveSchedule.map(slot => (
            <div key={slot.day} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-32 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={e => updateSlot(slot.day, 'enabled', e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className={`text-sm font-semibold ${slot.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {slot.label}
                </span>
              </label>
              <input
                type="time"
                value={slot.open}
                disabled={!slot.enabled}
                onChange={e => updateSlot(slot.day, 'open', e.target.value)}
                className="bg-muted border border-border rounded-lg px-2 py-1 text-xs font-mono disabled:opacity-40"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="time"
                value={slot.close}
                disabled={!slot.enabled}
                onChange={e => updateSlot(slot.day, 'close', e.target.value)}
                className="bg-muted border border-border rounded-lg px-2 py-1 text-xs font-mono disabled:opacity-40"
              />
            </div>
          ))}
          {localSchedule && (
            <Button
              size="sm"
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="mt-3 rounded-xl"
            >
              {isSavingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva orari'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}