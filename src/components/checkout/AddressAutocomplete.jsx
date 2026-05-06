import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { 'Accept-Language': 'it' } }
          );
          const data = await res.json();
          const address = data.display_name;
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          setQuery(address);
          onChange(address);
          onSelect(address, { lat, lng }, city);
        } catch {
          // silently fail
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Sync external value
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Parma')}&limit=5&addressdetails=1&countrycodes=it`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'it' } });
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item) => {
    const address = item.display_name;
    const coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    const city = item.address?.city || item.address?.town || item.address?.village || item.address?.county || '';
    setQuery(address);
    setSuggestions([]);
    setOpen(false);
    onChange(address);
    onSelect(address, coords, city);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleGeolocate}
        disabled={locating}
        className="mb-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/40 bg-primary/5 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 font-medium"
      >
        {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        {locating ? 'Rilevamento posizione...' : '📍 Usa la mia posizione attuale'}
      </button>
      <div className="relative">
        <Input
          value={query}
          onChange={handleChange}
          placeholder={placeholder || 'Via Roma 1, Parma'}
          className="mt-1 rounded-xl pr-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm leading-snug line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}