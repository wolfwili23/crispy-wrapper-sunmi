import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { Loader2, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PaymentForm({ total, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    if (error) {
      setErrorMsg(error.message);
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}
      {ready && (
        <Button
          type="submit"
          disabled={!stripe || paying}
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          {paying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Paga €{total.toFixed(2)}
            </span>
          )}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Pagamento sicuro con Stripe
      </p>
    </form>
  );
}

export default function StripeCheckoutPage() {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [total, setTotal] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('order_id');
    const t = parseFloat(params.get('total'));

    if (!oid || !t) { navigate('/cart'); return; }

    setOrderId(oid);
    setTotal(t);
    clearCart();

    const init = async () => {
      try {
        const configRes = await base44.functions.invoke('getStripeConfig', {});
        const publishableKey = configRes.data?.publishableKey;
        if (!publishableKey) throw new Error('Chiave Stripe non trovata');

        setStripePromise(loadStripe(publishableKey));

        const piRes = await base44.functions.invoke('createStripePaymentIntent', {
          order_id: oid,
          total: t,
        });

        if (!piRes.data?.clientSecret) throw new Error(piRes.data?.error || 'Errore creazione pagamento');
        setClientSecret(piRes.data.clientSecret);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const returnUrl = orderId
    ? `${window.location.origin}/payment-success?order_id=${orderId}`
    : `${window.location.origin}/`;

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-destructive font-semibold">Errore: {error}</p>
        <button onClick={() => navigate(-1)} className="text-primary underline text-sm">Torna indietro</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Torna al checkout</span>
      </button>

      <h1 className="text-2xl font-bold mb-1">Pagamento</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Totale: <strong className="text-primary">€{total.toFixed(2)}</strong>
      </p>

      {loading || !clientSecret || !stripePromise ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Inizializzazione pagamento...</p>
        </div>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#e03010',
                colorBackground: '#1a1a1a',
                colorText: '#f5f5f5',
                colorDanger: '#ef4444',
                borderRadius: '12px',
                fontFamily: 'Barlow, sans-serif',
              },
            },
          }}
        >
          <PaymentForm total={total} returnUrl={returnUrl} />
        </Elements>
      )}
    </div>
  );
}