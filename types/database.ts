export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export type Barber = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  name_en: string | null;
  price: number;
  duration_minutes: number;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

export type Booking = {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  rescheduled_count: number;
  created_at: string;
};

export type BarberTimeOff = {
  id: string;
  barber_id: string;
  date: string;
  reason: string | null;
};

export type BookingWithRelations = Booking & {
  clients: Pick<Client, "id" | "name" | "phone"> | null;
  services: Pick<Service, "id" | "name" | "name_en" | "price" | "duration_minutes"> | null;
  barbers: Pick<Barber, "id" | "name"> | null;
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "#D4A24E",
  completed: "#4CAF50",
  cancelled: "#9E9E9E",
  no_show: "#E5484D",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
