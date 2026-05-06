import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { MapPin, Navigation, Phone, Package, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [available, setAvailable] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setAvailable(!!u.driver_available);
    });
  }, []);

  const { data: fetchedOrders = [] } = useQuery({
    queryKey: ['driverOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ driver_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  // Also load unassigned ready orders
  const { data: readyOrders = [] } = useQuery({
    queryKey: ['readyOrders'],
    queryFn: () => base44.entities.Order.filter({ status: 'ready' }, '-created_date', 20),
  });

  useEffect(() => {
    setOrders(fetchedOrders);
  }, [fetchedOrders]);

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.data?.driver_email === user?.email) {
        setOrders(prev => {
          const exists = prev.find(o => o.id === event.id);
          if (exists) return prev.map(o => o.id === event.id ? event.data : o);
          return [event.data, ...prev];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
    });
    return unsub;
  }, [user?.email]);

  const toggleAvailability = async (val) => {
    setAvailable(val);
    await base44.auth.updateMe({ driver_available: val });
    toast.success(val ? 'Sei online!' : 'Sei offline');
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onMutate: async ({ id, data }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['driverOrders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverOrders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
    },
  });

  const acceptDelivery = (order) => {
    updateMutation.mutate({
      id: order.id,
      data: {
        driver_email: user.email,
        driver_name: user.full_name,
        status: 'picked_up',
        driver_lat: 41.9028,
        driver_lng: 12.4964,
      }
    });
    toast.success('Consegna accettata!');
  };

  const updateDeliveryStatus = (orderId, status) => {
    updateMutation.mutate({ id: orderId, data: { status } });
    const labels = { delivering: 'In consegna', delivered: 'Consegnato' };
    toast.success(`Stato: ${labels[status] || status}`);
  };

  // Real GPS tracking
  useEffect(() => {
    if (!available) return;
    const activeOrder = orders.find(o => ['picked_up', 'delivering'].includes(o.status));
    if (!activeOrder) return;

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateMutation.mutate({
          id: activeOrder.id,
          data: { driver_lat: pos.coords.latitude, driver_lng: pos.coords.longitude }
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [available, orders]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const availableForPickup = readyOrders.filter(o => !o.driver_email);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Availability toggle */}
      <div className="bg-card rounded-2xl p-5 border border-border mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{user?.full_name || 'Driver'}</h2>
            <p className="text-sm text-muted-foreground">{available ? '🟢 Sei online' : '🔴 Sei offline'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Disponibile</Label>
            <Switch checked={available} onCheckedChange={toggleAvailability} />
          </div>
        </div>
      </div>

      {/* Available for pickup */}
      {available && availableForPickup.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Ordini pronti per il ritiro
          </h3>
          <div className="space-y-3">
            {availableForPickup.map(order => (
              <div key={order.id} className="bg-card rounded-2xl p-4 border-2 border-primary/20 border-dashed">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">#{order.id?.slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">{order.items?.length} articoli · €{order.total?.toFixed(2)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary mb-3 underline underline-offset-2"
                >
                  <MapPin className="w-3 h-3" />{order.delivery_address} — Apri in Maps
                </a>
                <Button onClick={() => acceptDelivery(order)} className="w-full rounded-xl gap-2">
                  <Navigation className="w-4 h-4" />
                  Accetta consegna
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active deliveries */}
      <h3 className="font-semibold mb-3">Le mie consegne</h3>
      {activeOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nessuna consegna attiva</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeOrders.map(order => (
            <div key={order.id} className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-sm">#{order.id?.slice(-6)} — {order.customer_name}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <span className="font-bold text-primary">€{order.total?.toFixed(2)}</span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary mb-3 underline underline-offset-2"
              >
                <MapPin className="w-3 h-3" />{order.delivery_address} — Naviga con Maps
              </a>
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-xs text-primary mb-3">
                  <Phone className="w-3 h-3" />{order.customer_phone}
                </a>
              )}
              <div className="flex gap-2">
                {order.status === 'picked_up' && (
                  <Button onClick={() => updateDeliveryStatus(order.id, 'delivering')} className="flex-1 rounded-xl gap-2" size="sm">
                    <Navigation className="w-4 h-4" />In consegna
                  </Button>
                )}
                {order.status === 'delivering' && (
                  <Button onClick={() => updateDeliveryStatus(order.id, 'delivered')} className="flex-1 rounded-xl gap-2 bg-accent hover:bg-accent/90" size="sm">
                    <CheckCircle className="w-4 h-4" />Consegnato
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}