import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock } from 'lucide-react';

export default function DriverHistory() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email));
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['driverHistory', userEmail],
    queryFn: () => base44.entities.Order.filter({ driver_email: userEmail }, '-created_date', 100),
    enabled: !!userEmail,
  });

  const delivered = orders.filter(o => o.status === 'delivered');
  const totalEarnings = delivered.length * 3.50; // simulated per-delivery earnings

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Storico Consegne</h1>

      <div className="bg-card rounded-2xl p-5 border border-border mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Consegne totali</p>
            <p className="text-2xl font-bold">{delivered.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Guadagno stimato</p>
            <p className="text-2xl font-bold text-primary">€{totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nessuna consegna ancora</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">#{order.id?.slice(-6)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.created_date && format(new Date(order.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">📍 {order.delivery_address}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}