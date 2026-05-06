import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ReceiptPreview from '@/components/printer/ReceiptPreview';
import { getReceiptConfig, saveReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '@/utils/receiptConfig';

const SEPARATORS = [
  { value: '-', label: '──────' },
  { value: '=', label: '══════' },
  { value: '*', label: '******' },
  { value: '~', label: '~~~~~~' },
];

const PAPER_OPTIONS = [
  { value: 80, label: '80 mm' },
  { value: 57, label: '57 mm' },
];

export default function ReceiptDesigner() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(getReceiptConfig());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Carica dal DB se esiste
    base44.entities.AppConfig.filter({ key: 'receipt_config' }).then(results => {
      if (results.length > 0 && results[0].value) {
        const loaded = { ...DEFAULT_RECEIPT_CONFIG, ...results[0].value };
        setConfig(loaded);
        saveReceiptConfig(loaded);
      }
    });
  }, []);

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    saveReceiptConfig(config);
    const results = await base44.entities.AppConfig.filter({ key: 'receipt_config' });
    if (results.length > 0) {
      await base44.entities.AppConfig.update(results[0].id, { value: config });
    } else {
      await base44.entities.AppConfig.create({ key: 'receipt_config', value: config });
    }
    setSaving(false);
    toast.success('Grafica scontrino salvata!');
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_RECEIPT_CONFIG });
    toast.info('Impostazioni ripristinate');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/restaurant/printer')} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-none">Grafica Scontrino</h1>
            <p className="text-xs text-muted-foreground">Personalizza il layout di stampa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> Salva
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Pannello impostazioni */}
        <div className="lg:w-96 lg:min-h-[calc(100vh-57px)] border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Intestazione */}
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Intestazione</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome ristorante</Label>
                  <Input value={config.restaurantName} onChange={e => update('restaurantName', e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tagline / sito web</Label>
                  <Input value={config.tagline} onChange={e => update('tagline', e.target.value)} className="mt-1 rounded-xl" placeholder="es. crispyparma.it" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL Logo</Label>
                  <Input value={config.logoUrl} onChange={e => update('logoUrl', e.target.value)} className="mt-1 rounded-xl font-mono text-xs" placeholder="https://..." />
                </div>
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm cursor-pointer">Mostra logo</Label>
                  <Switch checked={config.showLogo} onCheckedChange={v => update('showLogo', v)} />
                </div>
              </div>
            </section>

            {/* Dati cliente */}
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Dati cliente</p>
              <div className="space-y-2">
                {[
                  { key: 'showOrderNumber', label: 'Numero ordine' },
                  { key: 'showDateTime', label: 'Data e ora' },
                  { key: 'showPhone', label: 'Telefono cliente' },
                  { key: 'showAddress', label: 'Indirizzo consegna' },
                  { key: 'showCoupon', label: 'Coupon / sconto' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <Label className="text-sm cursor-pointer">{label}</Label>
                    <Switch checked={config[key]} onCheckedChange={v => update(key, v)} />
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Footer</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Riga 1</Label>
                  <Input value={config.footerLine1} onChange={e => update('footerLine1', e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Riga 2</Label>
                  <Input value={config.footerLine2} onChange={e => update('footerLine2', e.target.value)} className="mt-1 rounded-xl" />
                </div>
              </div>
            </section>

            {/* Layout */}
            <section>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Layout</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Separatore</Label>
                  <div className="flex gap-2 flex-wrap">
                    {SEPARATORS.map(s => (
                      <button key={s.value} onClick={() => update('accentChar', s.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${config.accentChar === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Larghezza carta</Label>
                  <div className="flex gap-2">
                    {PAPER_OPTIONS.map(p => (
                      <button key={p.value} onClick={() => update('paperWidth', p.value)}
                        className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${config.paperWidth === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Anteprima scontrino */}
        <div className="flex-1 bg-muted/20 p-6 flex flex-col items-center">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-5">Anteprima live</p>
          <ReceiptPreview config={config} />
        </div>
      </div>
    </div>
  );
}