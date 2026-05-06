import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerOrders() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u.email));
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['myOrders', userEmail],
    queryFn: () => base44.entities.Order.filter({ customer_email: userEmail }, '-created_date', 50),
    enabled: !!userEmail,
  });

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">I miei ordini</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">I miei ordini</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nessun ordine ancora</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/order/${order.id}`}
                className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                  🍽️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">Ordine #{order.id?.slice(-6)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.created_date && format(new Date(order.created_date), "d MMM yyyy, HH:mm", { locale: it })}
                    {' · '}€{order.total?.toFixed(2)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}