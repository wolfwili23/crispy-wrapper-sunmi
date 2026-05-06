import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Euro, Clock, TrendingUp } from 'lucide-react';
import StoreStatusWidget from '@/components/restaurant/StoreStatusWidget';

export default function Dashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  // Riepilogo Cassa e Logistica
  const cashOrders = orders.filter(o => o.payment_method === 'cash' && o.status !== 'cancelled');
  const electronicOrders = orders.filter(o => ['card', 'card_online', 'satispay'].includes(o.payment_method) && o.status !== 'cancelled');

  const cashProducts    = cashOrders.reduce((s, o) => s + (o.subtotal || 0) - (o.coupon_discount || 0), 0);
  const cashDelivery    = cashOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
  const cashTotal       = cashOrders.reduce((s, o) => s + (o.total || 0), 0);

  const elecProducts    = electronicOrders.reduce((s, o) => s + (o.subtotal || 0) - (o.coupon_discount || 0), 0);
  const elecDelivery    = electronicOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
  const elecTotal       = electronicOrders.reduce((s, o) => s + (o.total || 0), 0);

  const fmt = (n) => `€${(n || 0).toFixed(2)}`;

  const stats = [
    { title: 'Ordini oggi', value: todayOrders.length, icon: ClipboardList, color: 'text-primary bg-primary/10' },
    { title: 'Incasso oggi', value: `€${totalRevenue.toFixed(2)}`, icon: Euro, color: 'text-accent bg-accent/10' },
    { title: 'In attesa', value: pendingOrders, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { title: 'Ordini attivi', value: activeOrders, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Store Status Widget */}
      <div className="mb-6">
        <StoreStatusWidget />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.title} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.title}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Riepilogo Cassa e Logistica */}
      <div className="mb-8">
        <h2 className="font-semibold mb-4 text-lg">Riepilogo Cassa e Logistica</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-xs text-muted-foreground">Voce di Bilancio</th>
                <th className="text-right px-4 py-3 font-black uppercase tracking-widest text-xs text-amber-400">Contanti (COD)</th>
                <th className="text-right px-4 py-3 font-black uppercase tracking-widest text-xs text-blue-400">Elettronico</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 font-medium">Prodotti (Netto)</td>
                <td className="text-right px-4 py-3 font-bold">{fmt(cashProducts)}</td>
                <td className="text-right px-4 py-3 font-bold">{fmt(elecProducts)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">Consegne</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-amber-400">Trattenute dal corriere</span>
                    {' / '}
                    <span className="text-blue-400">Debito vs corriere</span>
                  </div>
                </td>
                <td className="text-right px-4 py-3">
                  <div className="font-bold">{fmt(cashDelivery)}</div>
                  <div className="text-xs text-amber-400">Trattenute</div>
                </td>
                <td className="text-right px-4 py-3">
                  <div className="font-bold">{fmt(elecDelivery)}</div>
                  <div className="text-xs text-blue-400">Da versare</div>
                </td>
              </tr>
              <tr className="bg-muted/50">
                <td className="px-4 py-3 font-black uppercase tracking-widest text-xs">Totale Lordo</td>
                <td className="text-right px-4 py-3 font-black text-base text-amber-400">{fmt(cashTotal)}</td>
                <td className="text-right px-4 py-3 font-black text-base text-blue-400">{fmt(elecTotal)}</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Totale incassato (tutti i metodi, ordini non cancellati)</span>
            <span className="font-black text-lg text-primary">{fmt(cashTotal + elecTotal)}</span>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <h2 className="font-semibold mb-4">Ultimi ordini</h2>
      <div className="space-y-3">
        {orders.slice(0, 10).map(order => (
          <div key={order.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">#{order.id?.slice(-6)} — {order.customer_name}</p>
              <p className="text-xs text-muted-foreground">{order.items?.length} articoli · €{order.total?.toFixed(2)}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {{ pending: 'In attesa', accepted: 'Accettato', preparing: 'In preparazione', ready: 'Pronto', picked_up: 'Ritirato', delivering: 'In consegna', delivered: 'Consegnato', cancelled: 'Annullato' }[order.status] || order.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}