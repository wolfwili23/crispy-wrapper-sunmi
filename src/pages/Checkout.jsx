import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Banknote, MapPin, Loader2, Navigation, Tag, Star, Globe, Store, Clock } from 'lucide-react';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/checkout/AddressAutocomplete';
import DeliveryMap from '@/components/checkout/DeliveryMap';
import CouponInput from '@/components/checkout/CouponInput';
import { useStoreStatus } from '@/hooks/useStoreStatus';

const RESTAURANT_LAT = 44.8036624;
const RESTAURANT_LNG = 10.3263117;
const RESTAURANT_ADDRESS = 'Via Giosuè Carducci, 30a, 43121 Parma PR';
const RESTAURANT_MAPS_URL = 'https://maps.app.goo.gl/L98zLm3xW7WjGoe76';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DELIVERY_KM = 7;
const SERVICE_FEE = 1.50;

function calcDeliveryFee(km) {
  if (km > MAX_DELIVERY_KM) return null;
  // Scala proporzionalmente da €2.00 (0 km) a €4.00 (7 km)
  const fee = 2 + (km / MAX_DELIVERY_KM) * 2;
  return Math.round(fee * 100) / 100;
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { isOpen: storeIsOpen } = useStoreStatus();
  const [loading, setLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [deliveryCity, setDeliveryCity] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [fidelityPoints, setFidelityPoints] = useState(0);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    payment_method: 'card_online',
    delivery_type: 'delivery', // 'delivery' | 'pickup'
  });

  const isPickup = form.delivery_type === 'pickup';
  const outOfArea = !isPickup && distanceKm !== null && deliveryFee === null;
  const noAddress = !isPickup && distanceKm === null;
  const effectiveDeliveryFee = isPickup ? 0 : (deliveryFee ?? 0);
  const total = Math.max(0, subtotal + effectiveDeliveryFee + SERVICE_FEE - couponDiscount);

  // Only redirect to cart on initial mount if empty (not during navigation)
  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, []); // eslint-disable-line

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user.email);
      setForm(prev => ({
        ...prev,
        name: user.full_name || '',
        phone: user.phone || '',
        address: user.address || '',
      }));
      const cards = await base44.entities.FidelityCard.filter({ customer_email: user.email });
      if (cards.length > 0) setFidelityPoints(cards[0].points || 0);
    };
    loadUser();
  }, []);

  const handleAddressSelect = (address, coords, city) => {
    setDeliveryCoords(coords);
    setDeliveryCity(city || null);
    const km = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
    setDistanceKm(km);
    setDeliveryFee(km > MAX_DELIVERY_KM ? null : calcDeliveryFee(km));
    setForm(prev => ({ ...prev, address }));
  };

  const handleSubmit = async () => {
    if (!storeIsOpen) {
      toast.error('Il negozio è attualmente chiuso. Torna più tardi!');
      return;
    }
    if (!form.name || !form.phone) {
      toast.error('Inserisci nome e telefono');
      return;
    }
    if (!isPickup && noAddress) {
      toast.error('Inserisci un indirizzo di consegna valido');
      return;
    }
    if (!isPickup && outOfArea) {
      toast.error('Spiacente, l\'indirizzo si trova fuori dalla nostra zona di consegna');
      return;
    }

    setLoading(true);
    const user = await base44.auth.me();

    if (appliedCoupon) {
      const usedBy = appliedCoupon.used_by_emails || [];
      await base44.entities.Coupon.update(appliedCoupon.id, {
        uses_count: (appliedCoupon.uses_count || 0) + 1,
        used_by_emails: [...usedBy, user.email],
      });
    }

    const pointsEarned = Math.floor(total);
    const existingCards = await base44.entities.FidelityCard.filter({ customer_email: user.email });
    if (existingCards.length > 0) {
      await base44.entities.FidelityCard.update(existingCards[0].id, {
        points: (existingCards[0].points || 0) + pointsEarned,
        total_spent: (existingCards[0].total_spent || 0) + total,
        total_orders: (existingCards[0].total_orders || 0) + 1,
      });
    } else {
      await base44.entities.FidelityCard.create({
        customer_email: user.email,
        customer_name: form.name,
        points: pointsEarned,
        total_spent: total,
        total_orders: 1,
      });
    }

    const deliveryAddress = isPickup ? RESTAURANT_ADDRESS : form.address;
    const isOnlinePayment = form.payment_method === 'card_online';

    const order = await base44.entities.Order.create({
      customer_email: user.email,
      customer_name: form.name,
      customer_phone: form.phone,
      delivery_address: deliveryAddress,
      delivery_lat: isPickup ? RESTAURANT_LAT : (deliveryCoords?.lat || RESTAURANT_LAT),
      delivery_lng: isPickup ? RESTAURANT_LNG : (deliveryCoords?.lng || RESTAURANT_LNG),
      items: items.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        base_price: item.base_price,
        quantity: item.quantity,
        removals: item.removals,
        extras: item.extras,
        required_choices: item.required_choices,
        item_total: item.item_total,
        notes: item.notes,
      })),
      subtotal,
      delivery_fee: isPickup ? 0 : deliveryFee,
      coupon_code: appliedCoupon?.code || null,
      coupon_discount: couponDiscount || 0,
      tip_amount: 0,
      total,
      status: isOnlinePayment ? 'pending_payment' : 'pending',
      payment_method: form.payment_method,
      notes: form.notes,
    });

    await base44.auth.updateMe({ phone: form.phone, address: isPickup ? user.address : form.address });

    setLoading(false);

    if (isOnlinePayment) {
      const description = `Ordine #${order.id.slice(-6)} - ${form.name}`;
      // Clear cart AFTER navigation to avoid triggering the empty-cart redirect
      navigate(`/stripe-checkout?order_id=${order.id}&total=${total}&description=${encodeURIComponent(description)}`);
      clearCart();
      return;
    }

    clearCart();
    toast.success('Ordine inviato!');
    navigate(`/order/${order.id}`);
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="space-y-6">

        {/* Negozio chiuso warning */}
        {!storeIsOpen && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/40 rounded-2xl px-5 py-4">
            <Clock className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-bold text-destructive text-sm">Negozio attualmente chiuso</p>
              <p className="text-xs text-muted-foreground mt-0.5">Non è possibile inviare ordini in questo momento. Torna negli orari di apertura.</p>
            </div>
          </div>
        )}

        {/* Tipo di consegna */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-semibold mb-3">Come vuoi ricevere l'ordine?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => update('delivery_type', 'delivery')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                form.delivery_type === 'delivery' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
              }`}
            >
              <MapPin className="w-6 h-6" />
              <span className="font-semibold text-sm">Consegna a casa</span>
              <span className="text-xs text-muted-foreground">Ricevi al tuo indirizzo</span>
            </button>
            <button
              onClick={() => update('delivery_type', 'pickup')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                form.delivery_type === 'pickup' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
              }`}
            >
              <Store className="w-6 h-6" />
              <span className="font-semibold text-sm">Ritiro al locale</span>
              <span className="text-xs text-muted-foreground">Gratis — nessun costo</span>
            </button>
          </div>
          {isPickup && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium">📍 {RESTAURANT_ADDRESS}</p>
              <a
                href={RESTAURANT_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline mt-0.5 inline-block"
              >
                Apri su Google Maps →
              </a>
              <p className="text-xs text-muted-foreground mt-0.5">Presenta l'ordine alla cassa quando è pronto</p>
            </div>
          )}
        </div>

        {/* Info cliente */}
        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{isPickup ? 'I tuoi dati' : 'Indirizzo di consegna'}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Il tuo nome" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefono *</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+39 333 1234567" className="mt-1 rounded-xl" />
            </div>
            {!isPickup && (
              <div>
                <Label className="text-xs text-muted-foreground">Indirizzo *</Label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(val) => update('address', val)}
                  onSelect={handleAddressSelect}
                  placeholder="Via Roma 1, Parma"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  ℹ️ Inserisci indirizzo completo con <span className="font-semibold text-foreground">numero civico e CAP</span>
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Note {isPickup ? 'per l\'ordine' : 'per il corriere'}</Label>
              <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder={isPickup ? 'Allergie, preferenze...' : 'Citofono, piano, ecc.'} className="mt-1 rounded-xl resize-none" rows={2} />
            </div>
          </div>

          {!isPickup && deliveryCoords && (
            <div className="mt-4">
              <DeliveryMap customerCoords={deliveryCoords} />
            </div>
          )}

          {!isPickup && distanceKm !== null && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm bg-muted/50 rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="w-4 h-4" />
                  Distanza
                </span>
                <span className="font-semibold">{distanceKm.toFixed(2)} km</span>
              </div>
              {outOfArea ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-sm text-destructive font-bold">⚠️ Fuori zona di consegna</p>
                  <p className="text-xs text-destructive/80">
                    Spiacente, l'indirizzo si trova fuori dalla nostra zona di consegna ({distanceKm.toFixed(1)} km — max {MAX_DELIVERY_KM} km).
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">Costo di consegna</span>
                  <span className="text-sm font-semibold text-primary">€{deliveryFee?.toFixed(2) ?? '—'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagamento */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-semibold mb-1">Metodo di pagamento</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {isPickup ? 'Paga online ora o in cassa al ritiro' : 'Il driver ha un POS — paghi alla consegna'}
          </p>
          <RadioGroup value={form.payment_method} onValueChange={v => update('payment_method', v)} className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${form.payment_method === 'card_online' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <RadioGroupItem value="card_online" id="pay-card-online" />
              <Label htmlFor="pay-card-online" className="flex items-center gap-2 cursor-pointer flex-1">
                <Globe className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Carta di credito online</p>
                  <p className="text-[10px] text-muted-foreground">Pagamento sicuro con Stripe</p>
                </div>
              </Label>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${form.payment_method === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <RadioGroupItem value="cash" id="pay-cash" />
              <Label htmlFor="pay-cash" className="flex items-center gap-2 cursor-pointer flex-1">
                <Banknote className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">{isPickup ? 'Paga in cassa' : 'Contanti'}</p>
                  <p className="text-[10px] text-muted-foreground">{isPickup ? 'Paghi al ritiro al locale' : 'Prepara l\'importo esatto'}</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Coupon */}
        <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Coupon sconto</h2>
          </div>
          <CouponInput
            userEmail={userEmail}
            cartTotal={subtotal}
            onApply={(coupon, discount) => { setAppliedCoupon(coupon); setCouponDiscount(discount); }}
            appliedCoupon={appliedCoupon}
          />
          {fidelityPoints > 0 && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-2.5 mt-1">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent font-semibold">Hai {fidelityPoints} punti fidelity 🎉</span>
            </div>
          )}
        </div>

        {/* Riepilogo */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-semibold mb-3">Riepilogo ordine</h2>
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={item.cartId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                <span className="font-medium">€{(item.item_total * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotale</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                {isPickup ? 'Consegna' : `Consegna${distanceKm ? ` (${distanceKm.toFixed(2)} km)` : ''}`}
              </span>
              <span>
                {isPickup ? <span className="text-green-400 font-semibold">Gratis</span>
                  : deliveryFee !== null ? `€${deliveryFee.toFixed(2)}`
                  : noAddress ? '—' : outOfArea ? '⚠️ Fuori area' : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo di Servizio</span>
              <span>€{SERVICE_FEE.toFixed(2)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm items-center text-green-400">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {appliedCoupon?.code}</span>
                <span className="font-semibold">-€{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Totale</span>
              <span className="text-primary">€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !storeIsOpen || (!isPickup && (outOfArea || noAddress))}
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 mb-8"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Conferma Ordine — €${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}