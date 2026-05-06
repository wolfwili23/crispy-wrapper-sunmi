import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const MAX_POLLS = 20;
const POLL_INTERVAL = 1500; // ms

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | failed
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) { navigate('/'); return; }

    // Poll until webhook updates order status away from pending_payment
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const results = await base44.entities.Order.filter({ id: orderId });
      const found = results[0];
      if (!found) { setStatus('failed'); return; }

      if (found.status === 'pending_payment') {
        // Still waiting for webhook
        if (attempts >= MAX_POLLS) {
          // Timeout — mark as failed
          setStatus('failed');
          return;
        }
        setTimeout(poll, POLL_INTERVAL);
        return;
      }

      if (found.status === 'cancelled') {
        setOrder(found);
        setStatus('failed');
        return;
      }

      // Any other status (pending, accepted, etc.) = payment succeeded
      setOrder(found);
      setStatus('success');
      setTimeout(() => navigate(`/order/${found.id}`), 2500);
    };

    poll();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Verifica del pagamento in corso...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Pagamento non riuscito</h1>
          <p className="text-muted-foreground text-sm">Il pagamento non è stato completato. L'ordine è stato annullato.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/cart')} className="w-full rounded-xl">
            Torna al carrello
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-xl">
            Torna al menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">Pagamento confermato! 🎉</h1>
        <p className="text-muted-foreground text-sm">Il tuo ordine è stato ricevuto e sarà presto preparato.</p>
        <p className="text-xs text-muted-foreground mt-1">Redirect automatico al tracciamento ordine...</p>
      </div>
      {order && (
        <div className="bg-card border border-border rounded-2xl p-4 text-left space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3">Riepilogo</p>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span>€{(item.item_total).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Totale pagato</span>
            <span className="text-primary">€{order.total?.toFixed(2)}</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {order && (
          <Button onClick={() => navigate(`/order/${order.id}`)} className="w-full rounded-xl">
            Traccia il tuo ordine
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-xl">
          Torna al menu
        </Button>
      </div>
    </div>
  );
}