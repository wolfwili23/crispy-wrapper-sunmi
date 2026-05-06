import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const SAMPLE_ORDER = {
  id: 'TEST000001',
  created_date: new Date().toISOString(),
  customer_name: 'Mario Rossi',
  customer_phone: '+39 333 1234567',
  delivery_address: 'Via Roma 1, 43121 Parma (PR)',
  items: [
    { name: 'Chicken Burger', quantity: 2, base_price: 9.50, extras: [{ name: 'Salsa BBQ', price: 0.50 }], removals: ['Cipolla'], required_choices: [{ group_name: 'Cottura', selected: 'Media', price: 0 }], notes: 'Senza glutine' },
    { name: 'Patatine Fritte', quantity: 1, base_price: 3.50, extras: [], removals: [], required_choices: [] },
  ],
  subtotal: 23.00, delivery_fee: 2.99, coupon_code: 'WELCOME10', coupon_discount: 2.30, total: 23.69, payment_method: 'cash',
  notes: 'Citofono rotto, chiamare',
};

export default function ReceiptPreview({ config }) {
  const order = SAMPLE_ORDER;
  const date = format(new Date(order.created_date), 'dd/MM/yyyy HH:mm', { locale: it });
  const paymentLabel = { cash: 'DA PAGARE', card: 'DA PAGARE', card_online: 'PREPAGATO', satispay: 'PREPAGATO' }[order.payment_method] || 'DA PAGARE';
  const sep = (config.accentChar || '-').repeat(32);
  const paperMm = config.paperWidth === 57 ? '57mm' : '80mm';

  const itemsHtml = (order.items || []).map(item => {
    const qty = item.quantity || 1;
    const unit = item.base_price || 0;
    const extP = (item.extras || []).reduce((s, e) => s + (e.price || 0), 0);
    const choP = (item.required_choices || []).reduce((s, c) => s + (c.price || 0), 0);
    const lineTotal = ((unit + extP + choP) * qty).toFixed(2);
    return (
      <div key={item.name} style={{ marginBottom: 6, paddingBottom: 5, borderBottom: '1px dashed #ccc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13 }}>
          <span>{qty} x {item.name}</span><span>€{lineTotal}</span>
        </div>
        {item.required_choices?.map(c => <div key={c.group_name} style={{ fontSize: 10, color: '#555', paddingLeft: 8 }}>{c.group_name}: {c.selected}</div>)}
        {item.extras?.map(e => <div key={e.name} style={{ fontSize: 10, color: '#555', paddingLeft: 8 }}>+ {e.name}</div>)}
        {item.removals?.length > 0 && <div style={{ fontSize: 10, color: '#888', paddingLeft: 8 }}>Senza: {item.removals.join(', ')}</div>}
        {item.notes && <div style={{ fontSize: 10, color: '#888', paddingLeft: 8, fontStyle: 'italic' }}>Nota: {item.notes}</div>}
      </div>
    );
  });

  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      fontSize: 13,
      width: paperMm,
      maxWidth: '100%',
      margin: '0 auto',
      backgroundColor: '#fff',
      color: '#000',
      padding: '10px 12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      borderRadius: 4,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
        {config.showLogo && config.logoUrl && (
          <img src={config.logoUrl} alt="logo" style={{ width: 120, display: 'block', margin: '0 auto 4px' }}
            onError={e => e.target.style.display = 'none'} />
        )}
        <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>{config.restaurantName}</div>
        {config.tagline && <div style={{ fontSize: 11, color: '#555' }}>{config.tagline}</div>}
        {config.showOrderNumber && <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>#{order.id?.slice(-6)}</div>}
      </div>

      {/* Info cliente */}
      <div style={{ marginBottom: 8, fontSize: 12, lineHeight: 1.7 }}>
        {config.showDateTime && <div>{date}</div>}
        <div>Cliente: <strong>{order.customer_name}</strong></div>
        {config.showPhone && <div>Tel: {order.customer_phone}</div>}
      </div>

      {/* Badge pagamento */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ border: '2px solid #000', padding: '3px 12px', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>{paymentLabel}</span>
      </div>

      {/* Indirizzo */}
      {config.showAddress && (
        <div style={{ marginBottom: 8, fontSize: 12, borderBottom: '1px solid #aaa', paddingBottom: 6 }}>
          <strong>Consegna:</strong><br />{order.delivery_address}
        </div>
      )}

      <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 4 }}>ARTICOLI</div>
      {itemsHtml}

      {/* Totali */}
      <div style={{ borderTop: '2px solid #000', marginTop: 6, paddingTop: 6, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotale</span><span>€{order.subtotal.toFixed(2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consegna</span><span>€{order.delivery_fee.toFixed(2)}</span></div>
        {config.showCoupon && order.coupon_discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}>
            <span>Coupon {order.coupon_code}</span><span>-€{order.coupon_discount.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div style={{ borderTop: '2px solid #000', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 22 }}>
        <span>Totale</span><span>€{order.total.toFixed(2)}</span>
      </div>

      {/* Note */}
      {order.notes && <div style={{ marginTop: 6, fontSize: 11, borderTop: '1px dashed #aaa', paddingTop: 4 }}><strong>Note:</strong> {order.notes}</div>}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#555', lineHeight: 1.8 }}>
        {config.footerLine1 && <div>{config.footerLine1}</div>}
        {config.footerLine2 && <div>{config.footerLine2}</div>}
      </div>
    </div>
  );
}