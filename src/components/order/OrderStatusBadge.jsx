import React from 'react';
import { Clock, CheckCircle, ChefHat, Package, Truck, MapPin, XCircle } from 'lucide-react';

const statusConfig = {
  pending:   { label: 'In attesa',       icon: Clock,        cls: 'bg-amber-900/40 text-amber-400 border-amber-800' },
  accepted:  { label: 'Accettato',        icon: CheckCircle,  cls: 'bg-blue-900/40 text-blue-400 border-blue-800' },
  preparing: { label: 'In preparazione', icon: ChefHat,       cls: 'bg-purple-900/40 text-purple-400 border-purple-800' },
  ready:     { label: 'Pronto',           icon: Package,      cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-800' },
  picked_up: { label: 'Ritirato',         icon: Truck,        cls: 'bg-sky-900/40 text-sky-400 border-sky-800' },
  delivering:{ label: 'In consegna',      icon: Truck,        cls: 'bg-primary/20 text-primary border-primary/40' },
  delivered: { label: 'Consegnato',       icon: MapPin,       cls: 'bg-green-900/40 text-green-400 border-green-800' },
  cancelled: { label: 'Annullato',        icon: XCircle,      cls: 'bg-red-900/40 text-red-400 border-red-800' },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm border ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}