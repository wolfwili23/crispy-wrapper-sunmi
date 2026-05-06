import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_SCHEDULE = [
  { day: 1, label: 'Lunedì',    open: '12:00', close: '22:30', enabled: true },
  { day: 2, label: 'Martedì',   open: '12:00', close: '22:30', enabled: true },
  { day: 3, label: 'Mercoledì', open: '12:00', close: '22:30', enabled: true },
  { day: 4, label: 'Giovedì',   open: '12:00', close: '22:30', enabled: true },
  { day: 5, label: 'Venerdì',   open: '12:00', close: '23:00', enabled: true },
  { day: 6, label: 'Sabato',    open: '12:00', close: '23:00', enabled: true },
  { day: 0, label: 'Domenica',  open: '12:00', close: '22:30', enabled: false },
];

function isWithinSchedule(schedule) {
  const now = new Date();
  const day = now.getDay(); // 0=dom
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const slot = schedule?.find(s => s.day === day);
  if (!slot || !slot.enabled) return false;
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  return hhmm >= oh * 60 + om && hhmm < ch * 60 + cm;
}

export function useStoreStatus() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['storeStatus'],
    queryFn: async () => {
      const results = await base44.entities.AppConfig.filter({ key: 'store_status' });
      if (results.length > 0) return results[0];
      return null;
    },
    refetchInterval: 60_000, // ricontrolla ogni minuto
  });

  const value = config?.value || {};
  const schedule = value.schedule || DEFAULT_SCHEDULE;
  const manualOverride = value.manual_override; // 'open' | 'closed' | null

  const scheduledOpen = isWithinSchedule(schedule);
  const isOpen = manualOverride === 'open' ? true
    : manualOverride === 'closed' ? false
    : scheduledOpen;

  const { mutateAsync: setManualOverride, isPending: isSaving } = useMutation({
    mutationFn: async (override) => {
      const newValue = { ...value, manual_override: override };
      if (config?.id) {
        return base44.entities.AppConfig.update(config.id, { value: newValue });
      } else {
        return base44.entities.AppConfig.create({ key: 'store_status', value: newValue });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storeStatus'] }),
  });

  const { mutateAsync: saveSchedule, isPending: isSavingSchedule } = useMutation({
    mutationFn: async (newSchedule) => {
      const newValue = { ...value, schedule: newSchedule };
      if (config?.id) {
        return base44.entities.AppConfig.update(config.id, { value: newValue });
      } else {
        return base44.entities.AppConfig.create({ key: 'store_status', value: newValue });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storeStatus'] }),
  });

  return {
    isOpen,
    scheduledOpen,
    manualOverride,
    schedule,
    isLoading,
    isSaving,
    isSavingSchedule,
    setManualOverride,
    saveSchedule,
  };
}