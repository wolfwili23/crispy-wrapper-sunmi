import React, { useEffect, useRef } from 'react';

const RESTAURANT_LAT = 44.8036624;
const RESTAURANT_LNG = 10.3263117;

export default function DeliveryMap({ customerCoords }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const customerMarkerRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Restaurant marker
    const restaurantIcon = L.divIcon({
      className: '',
      html: `<div style="background:#e03a1e;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:16px;">🍕</span>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    L.marker([RESTAURANT_LAT, RESTAURANT_LNG], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup('<b>Crispy Parma</b><br>Via Giosuè Carducci 30a, Parma', { closeButton: false });

    map.setView([RESTAURANT_LAT, RESTAURANT_LNG], 13);
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    // Remove old customer marker
    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }

    if (!customerCoords) return;

    const customerIcon = L.divIcon({
      className: '',
      html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;animation:pulse 1.5s ease-in-out 3;">🏠</div>
        <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([customerCoords.lat, customerCoords.lng], { icon: customerIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('📍 Il tuo indirizzo', { closeButton: false });

    customerMarkerRef.current = marker;

    // Fit bounds to include both markers
    const bounds = L.latLngBounds(
      [RESTAURANT_LAT, RESTAURANT_LNG],
      [customerCoords.lat, customerCoords.lng]
    );
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [customerCoords]);

  return (
    <div
      ref={mapRef}
      style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}
    />
  );
}