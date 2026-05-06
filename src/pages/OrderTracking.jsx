import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, MapPin } from 'lucide-react';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🛵</div>',
  iconAnchor: [14, 14],
});

// Sub-component to move marker smoothly without remounting map
function LiveDriverMarker({ lat, lng }) {
  const markerRef = useRef(null);
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);
  return <Marker ref={markerRef} position={[lat, lng]} icon={driverIcon}><Popup>🛵 Driver in arrivo</Popup></Marker>;
}

const statusSteps = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered'];

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => base44.entities.Order.filter({ id }),
    select: data => data[0],
  });

  useEffect(() => {
    if (fetchedOrder) setOrder(fetchedOrder);
  }, [fetchedOrder]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.id === id) {
        setOrder(event.data);
      }
    });
    return unsub;
  }, [id]);

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);
  const isDelivering = ['picked_up', 'delivering'].includes(order.status);
  const deliveryLat = order.delivery_lat || 44.8015;
  const deliveryLng = order.delivery_lng || 10.3279;
  const driverLat = order.driver_lat || deliveryLat + 0.005;
  const driverLng = order.driver_lng || deliveryLng + 0.003;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Ordine #{order.id?.slice(-6)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Map — live driver tracking */}
      {isDelivering && (
        <div className="mx-4 rounded-2xl overflow-hidden border border-border shadow-sm mb-4">
          <div className="bg-primary/10 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Driver in tempo reale</span>
          </div>
          <div className="h-64">
            <MapContainer center={[driverLat, driverLng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[deliveryLat, deliveryLng]}>
                <Popup>📍 Il tuo indirizzo</Popup>
              </Marker>
              <LiveDriverMarker lat={driverLat} lng={driverLng} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="px-6 py-4">
        <div className="space-y-4">
          {statusSteps.filter(s => s !== 'cancelled').map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={step} className="flex items-center gap-4">
                <div className="relative flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.2 : 1,
                      backgroundColor: isCompleted ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    }}
                    className="w-4 h-4 rounded-full"
                  />
                  {i < statusSteps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step === 'pending' && '📩 Ordine inviato'}
                  {step === 'accepted' && '✅ Ordine accettato'}
                  {step === 'preparing' && '👨‍🍳 In preparazione'}
                  {step === 'ready' && '📦 Pronto per il ritiro'}
                  {step === 'picked_up' && '🛵 Ritirato dal driver'}
                  {step === 'delivering' && '🚗 In consegna'}
                  {step === 'delivered' && '🎉 Consegnato!'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver info */}
      {order.driver_name && (
        <div className="mx-4 bg-card rounded-2xl p-4 border border-border flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">🛵</div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{order.driver_name}</p>
            <p className="text-xs text-muted-foreground">Il tuo driver</p>
          </div>
          <a href={`tel:${order.driver_phone || ''}`} className="p-3 rounded-full bg-accent text-accent-foreground">
            <Phone className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Order items */}
      <div className="mx-4 mb-8 bg-card rounded-2xl p-4 border border-border">
        <h3 className="font-semibold mb-3 text-sm">Il tuo ordine</h3>
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between py-2 text-sm border-b border-border last:border-0">
            <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
            <span className="font-medium">€{(item.item_total * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 font-bold">
          <span>Totale</span>
          <span className="text-primary">€{order.total?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}