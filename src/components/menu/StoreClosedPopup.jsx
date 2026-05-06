import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Popup mostrato all'apertura dell'app quando il negozio è chiuso.
 * Si mostra una volta per sessione (sessionStorage).
 */
export default function StoreClosedPopup({ isOpen: storeIsOpen, isLoading }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!storeIsOpen) {
      // Mostra una volta sola per sessione
      const alreadyShown = sessionStorage.getItem('storeClosedPopupShown');
      if (!alreadyShown) {
        setOpen(true);
        sessionStorage.setItem('storeClosedPopupShown', '1');
      }
    } else {
      // Se il negozio riapre, resetta il flag in modo da mostrarlo di nuovo alla prossima chiusura
      sessionStorage.removeItem('storeClosedPopupShown');
    }
  }, [storeIsOpen, isLoading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl border-destructive/40 bg-card p-0 overflow-hidden">
        {/* Header rosso */}
        <div className="bg-destructive/90 px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-display font-black text-xl uppercase tracking-widest text-white">
              Siamo Chiusi
            </p>
            <p className="text-white/70 text-xs font-medium mt-0.5">Torneremo presto!</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Spiacenti, il negozio è momentaneamente chiuso.{' '}
            <span className="text-foreground font-semibold">
              Non è possibile ricevere ordini al di fuori degli orari di apertura.
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Puoi comunque sfogliare il menu, ma il carrello sarà disabilitato finché non riapriamo.
          </p>
          <Button
            className="w-full rounded-xl h-11"
            onClick={() => setOpen(false)}
          >
            Ho capito
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}