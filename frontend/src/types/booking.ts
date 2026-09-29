export interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
}

export interface Master {
  id: string;
  name: string;
  role: string;
  photo: string;
  serviceIds: string[];
}

export type SlotStatus = 'available' | 'busy' | 'tooshort';

export interface TimeSlot {
  time: string;
  status: SlotStatus;
}

export interface BookingSelection {
  serviceId: string | null;
  masterId: string | null;
  date: string | null;
  time: string | null;
}
