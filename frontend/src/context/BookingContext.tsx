import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BookingSelection } from '@/types/booking';

interface BookingContextValue extends BookingSelection {
  setServiceId: (id: string | null) => void;
  setMasterId: (id: string | null) => void;
  setDate: (date: string | null) => void;
  setTime: (time: string | null) => void;
  reset: () => void;
  isComplete: boolean;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const reset = () => {
    setServiceId(null);
    setMasterId(null);
    setDate(null);
    setTime(null);
  };

  const isComplete = Boolean(serviceId && masterId && date && time);

  const value = useMemo(
    () => ({
      serviceId,
      masterId,
      date,
      time,
      setServiceId,
      setMasterId,
      setDate,
      setTime,
      reset,
      isComplete,
    }),
    [serviceId, masterId, date, time, isComplete]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within a BookingProvider');
  return ctx;
}
