import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function CouponInput({ userEmail, cartTotal, onApply, appliedCoupon }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCoupons, setUserCoupons] = useState([]);
  const [showUserCoupons, setShowUserCoupons] = useState(false);
  const [loadingUserCoupons, setLoadingUserCoupons] = useState(false);

  const loadUserCoupons = async () => {
    if (showUserCoupons) { setShowUserCoupons(false); return; }
    setLoadingUserCoupons(true);
    const coupons = await base44.entities.Coupon.filter({
      assigned_to_email: userEmail,
      active: true,
    });
    setUserCoupons(coupons);
    setShowUserCoupons(true);
    setLoadingUserCoupons(false);
  };

  const validateAndApply = async (inputCode) => {
    const trimmed = (inputCode || code).trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);

    const results = await base44.entities.Coupon.filter({ code: trimmed, active: true });
    const coupon = results[0];

    if (!coupon) {
      toast.error('Coupon non valido o scaduto');
      setLoading(false);
      return;
    }

    // Check assigned
    if (coupon.assigned_to_email && coupon.assigned_to_email !== userEmail) {
      toast.error('Questo coupon non è disponibile per il tuo account');
      setLoading(false);
      return;
    }

    // Check per-customer limit
    if (coupon.max_uses_per_customer > 0 && coupon.used_by_emails?.includes(userEmail)) {
      toast.error('Hai già utilizzato questo coupon');
      setLoading(false);
      return;
    }

    // Check max uses
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      toast.error('Questo coupon ha raggiunto il limite di utilizzi');
      setLoading(false);
      return;
    }

    // Check min order
    if (coupon.min_order && cartTotal < coupon.min_order) {
      toast.error(`Ordine minimo €${coupon.min_order.toFixed(2)} per usare questo coupon`);
      setLoading(false);
      return;
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      toast.error('Questo coupon è scaduto');
      setLoading(false);
      return;
    }

    const discount = coupon.discount_type === 'percentage'
      ? (cartTotal * coupon.discount_value) / 100
      : coupon.discount_value;

    toast.success(`Coupon applicato! -€${discount.toFixed(2)}`);
    onApply(coupon, discount);
    setCode('');
    setShowUserCoupons(false);
    setLoading(false);
  };

  const handleRemove = () => {
    onApply(null, 0);
    toast.info('Coupon rimosso');
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-sm font-semibold text-green-400">{appliedCoupon.code}</p>
            <p className="text-xs text-muted-foreground">{appliedCoupon.description || 'Sconto applicato'}</p>
          </div>
        </div>
        <button onClick={handleRemove} className="p-1 hover:bg-destructive/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Codice coupon"
          className="rounded-xl font-mono tracking-widest"
          onKeyDown={e => e.key === 'Enter' && validateAndApply()}
        />
        <Button
          type="button"
          onClick={() => validateAndApply()}
          disabled={loading || !code.trim()}
          className="rounded-xl shrink-0"
          variant="outline"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Applica'}
        </Button>
      </div>

      <button
        type="button"
        onClick={loadUserCoupons}
        disabled={loadingUserCoupons}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        {loadingUserCoupons ? <Loader2 className="w-3 h-3 animate-spin" /> : showUserCoupons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        I miei coupon
      </button>

      {showUserCoupons && (
        <div className="space-y-1.5">
          {userCoupons.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">Nessun coupon disponibile</p>
          ) : (
            userCoupons.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => validateAndApply(c.code)}
                className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted rounded-xl px-3 py-2 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-mono font-semibold text-primary">{c.code}</p>
                  <p className="text-xs text-muted-foreground">{c.description || (c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-€${c.discount_value}`)}</p>
                </div>
                <span className="text-xs font-bold text-green-400">
                  {c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-€${c.discount_value}`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}