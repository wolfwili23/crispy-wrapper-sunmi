import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MobileSelect } from '@/components/ui/mobile-select';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CheckCircle, XCircle, ChefHat, Package, Truck, Bell, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderAlarm } from '@/hooks/useOrderAlarm';
import { printUniversal } from '@/utils/universalPrint';
import { getReceiptConfig } from '@/utils/receiptConfig';

const statusActions = {
  pending: [
    { label: 'Accetta', nextStatus: 'accepted', icon: CheckCircle, variant: 'default' },
    { label: 'Rifiuta', nextStatus: 'cancelled', icon: XCircle, variant: 'destructive' },
  ],
  accepted: [{ label: 'In preparazione', nextStatus: 'preparing', icon: ChefHat, variant: 'default' }],
  preparing: [{ label: 'Pronto', nextStatus: 'ready', icon: Package, variant: 'default' }],
  ready: [{ label: 'Ritirato dal driver', nextStatus: 'picked_up', icon: Truck, variant: 'default' }],
};

export default function OrderManagement() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('active');
  const [orders, setOrders] = useState([]);
  const [printDialog, setPrintDialog] = useState({ open: false, order: null });
  const [clearingHistory, setClearingHistory] = useState(false);

  const handleClearHistory = async () => {
    if (!window.confirm('Eliminare TUTTI gli ordini dal database? Questa azione è irreversibile.')) return;
    setClearingHistory(true);
    await Promise.all(orders.map(o => base44.entities.Order.delete(o.id)));
    setOrders([]);
    setClearingHistory(false);
    toast.success(`Database ordini svuotato`);
  };

  const openPrintDialog = useCallback((order) => {
    setPrintDialog({ open: true, order });
  }, []);

  const handlePrint = async (order) => {
    // Carica sempre la config aggiornata dal DB prima di stampare
    const results = await base44.entities.AppConfig.filter({ key: 'receipt_config' });
    if (results.length > 0 && results[0].value) {
      const { saveReceiptConfig } = await import('@/utils/receiptConfig');
      saveReceiptConfig(results[0].value);
    }
    const cfg = getReceiptConfig();
    const cols = cfg.paperWidth === 57 ? 32 : 48;
    await printUniversal(order, { paperWidth: cols });
    toast.success('Scontrino inviato');
  };

  const handlePrintWithSize = async (paperWidth) => {
    const cols = paperWidth === '57mm' ? 32 : 48;
    await printUniversal(printDialog.order, { paperWidth: cols });
    setPrintDialog({ open: false, order: null });
    toast.success('Scontrino inviato');
  };

  // Suona finché ci sono ordini pending
  const hasPendingOrders = orders.some(o => o.status === 'pending');
  useOrderAlarm(hasPendingOrders);

  const { data: fetchedOrders = [], isLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  useEffect(() => {
    setOrders(fetchedOrders);
  }, [fetchedOrders]);

  // Real-time + Auto-print quando pagamento confermato
  useEffect(() => {
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create') {
        setOrders(prev => [event.data, ...prev]);
        toast.info(`🔔 Nuovo ordine da ${event.data.customer_name}!`);
      } else if (event.type === 'update') {
        setOrders(prev => prev.map(o => o.id === event.id ? event.data : o));
        
        // Auto-stampa quando pagamento confermato (pending_payment → pending/accepted)
        const oldOrder = orders.find(o => o.id === event.id);
        if (oldOrder?.status === 'pending_payment' && ['pending', 'accepted'].includes(event.data.status)) {
          toast.info('💳 Pagamento confermato - Stampa in corso...');
          handlePrint(event.data);
        }
      }
    });
    return unsub;
  }, [orders]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onMutate: async ({ id, data }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['allOrders'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allOrders'] }),
  });

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'completed') return o.status === 'delivered';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const handleStatusChange = (order, newStatus) => {
    updateMutation.mutate({ id: order.id, data: { status: newStatus } });
    const labels = { accepted: 'Accettato', preparing: 'In preparazione', ready: 'Pronto', picked_up: 'Ritirato', delivering: 'In consegna', delivered: 'Consegnato', cancelled: 'Annullato' };
    toast.success(`Stato: ${labels[newStatus] || newStatus}`);
    // Stampa scontrino quando ordine viene accettato
    if (newStatus === 'accepted') {
      handlePrint(order);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Ordini</h1>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleClearHistory}
            disabled={clearingHistory}
          >
            <Trash2 className="w-4 h-4" />
            {clearingHistory ? 'Eliminazione...' : 'Cancella storico'}
          </Button>
          <MobileSelect
            value={filter}
            onValueChange={setFilter}
            placeholder="Filtra ordini"
            className="w-40"
            options={[
              { value: 'active', label: 'Attivi' },
              { value: 'all', label: 'Tutti' },
              { value: 'completed', label: 'Completati' },
              { value: 'cancelled', label: 'Annullati' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun ordine</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="space-y-4 min-w-0">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">#{order.id?.slice(-6)}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name} · {order.created_date && format(new Date(order.created_date), "HH:mm", { locale: it })}
                    </p>
                  </div>
                  <span className="font-bold text-primary text-lg">€{order.total?.toFixed(2)}</span>
                </div>

                {/* Items */}
                <div className="bg-muted rounded-xl p-3 mb-3 space-y-1">
                  {order.items?.map((item, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      {item.removals?.length > 0 && <span className="text-xs text-muted-foreground ml-2">❌ {item.removals.join(', ')}</span>}
                      {item.extras?.length > 0 && <span className="text-xs text-primary ml-2">➕ {item.extras.map(e => e.name).join(', ')}</span>}
                      {item.notes && <span className="text-xs text-muted-foreground ml-2">📝 {item.notes}</span>}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mb-3">📍 {order.delivery_address}</p>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap items-center">
                  {statusActions[order.status]?.map(action => (
                    <Button
                      key={action.nextStatus}
                      variant={action.variant}
                      size="sm"
                      className="gap-1.5 rounded-xl"
                      onClick={() => handleStatusChange(order, action.nextStatus)}
                    >
                      <action.icon className="w-4 h-4" />
                      {action.label}
                      {action.nextStatus === 'accepted' && <Printer className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl ml-auto"
                    onClick={() => handlePrint(order)}
                  >
                    <Printer className="w-4 h-4" />
                    Ristampa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paper size dialog */}
      <Dialog open={printDialog.open} onOpenChange={(open) => !open && setPrintDialog({ open: false, order: null })}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-base">Taglia scontrino</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">Seleziona la larghezza della carta per la stampante:</p>
          <div className="flex gap-3">
            <button
              onClick={() => handlePrintWithSize('80mm')}
              className="flex-1 py-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <p className="font-black text-lg">80mm</p>
              <p className="text-xs text-muted-foreground">Standard (48 col)</p>
            </button>
            <button
              onClick={() => handlePrintWithSize('57mm')}
              className="flex-1 py-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <p className="font-black text-lg">57mm</p>
              <p className="text-xs text-muted-foreground">Compatto (32 col)</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}