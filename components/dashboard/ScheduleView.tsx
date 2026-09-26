"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type {
  Barber,
  BarberTimeOff,
  BookingStatus,
  BookingWithRelations,
  Client,
  Service,
} from "@/types/database";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  SLOT_PX,
  SLOTS_PER_DAY,
  addDaysLocal,
  addMinutesToTime,
  formatEuro,
  formatScheduleTitle,
  formatTimeHHMM,
  minutesToTime,
  rangesOverlap,
  snapTo15,
  timeToMinutes,
  toDateInputValue,
} from "@/lib/format";
import { EmptyState, ErrorMessage, Spinner } from "@/components/dashboard/ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type NewModalState = {
  barberId: string;
  date: string;
  startTime: string;
} | null;

export function ScheduleView() {
  const supabase = useMemo(() => createClient(), []);
  const [date, setDate] = useState(() => new Date());
  const dateStr = toDateInputValue(date);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [timeOff, setTimeOff] = useState<BarberTimeOff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [newModal, setNewModal] = useState<NewModalState>(null);
  const [selected, setSelected] = useState<BookingWithRelations | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    const [bRes, bookRes, offRes, cRes, sRes] = await Promise.all([
      supabase.from("barbers").select("*").eq("active", true).order("name"),
      supabase
        .from("bookings")
        .select(
          "*, clients(id,name,phone), services(id,name,name_en,price,duration_minutes), barbers(id,name)"
        )
        .eq("booking_date", dateStr),
      supabase.from("barber_time_off").select("*").eq("date", dateStr),
      supabase.from("clients").select("*").order("name"),
      supabase.from("services").select("*").order("name"),
    ]);

    if (bRes.error || bookRes.error || offRes.error || cRes.error || sRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    setBarbers((bRes.data as Barber[]) ?? []);
    setBookings((bookRes.data as BookingWithRelations[]) ?? []);
    setTimeOff((offRes.data as BarberTimeOff[]) ?? []);
    setClients((cRes.data as Client[]) ?? []);
    setServices((sRes.data as Service[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const hours = useMemo(() => {
    const labels: number[] = [];
    for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 15) labels.push(m);
    return labels;
  }, []);

  function onGridClick(
    e: React.MouseEvent<HTMLDivElement>,
    barberId: string,
    isOff: boolean
  ) {
    if (isOff) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIndex = Math.floor(y / SLOT_PX);
    const startMin = snapTo15(DAY_START_MIN + slotIndex * 15);
    if (startMin < DAY_START_MIN || startMin >= DAY_END_MIN) return;
    setNewModal({
      barberId,
      date: dateStr,
      startTime: minutesToTime(startMin),
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDate((d) => addDaysLocal(d, -1))}
          className="rounded-lg border border-[#E5E5E5] bg-white p-2 hover:bg-[#FAFAFA]"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-[260px] text-center text-xl font-semibold text-[#1A1A1A]">
          {formatScheduleTitle(date)}
        </h1>
        <button
          type="button"
          onClick={() => setDate((d) => addDaysLocal(d, 1))}
          className="rounded-lg border border-[#E5E5E5] bg-white p-2 hover:bg-[#FAFAFA]"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDate(new Date())}
          className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-medium hover:bg-[#FAFAFA]"
        >
          Today
        </button>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMessage />}
      {!loading && !error && barbers.length === 0 && (
        <EmptyState message="No active barbers" />
      )}

      {!loading && !error && barbers.length > 0 && (
        <div className="w-full overflow-x-auto rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `64px repeat(${barbers.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 border-b border-[#E5E5E5] bg-white" />
            {barbers.map((b) => (
              <div
                key={b.id}
                className="border-b border-l border-[#E5E5E5] px-3 py-3 text-center text-sm font-semibold"
              >
                {b.name}
              </div>
            ))}

            <div className="relative sticky left-0 z-10 bg-white">
              {hours.map((m) => {
                const isHour = m % 60 === 0;
                return (
                  <div
                    key={m}
                    className={`flex h-5 items-start justify-end pr-2 text-[11px] text-[#737373] ${
                      isHour ? "border-t border-[#E5E5E5]" : "border-t border-[#F0F0F0]"
                    }`}
                    style={{ height: SLOT_PX }}
                  >
                    {isHour ? minutesToTime(m) : ""}
                  </div>
                );
              })}
            </div>

            {barbers.map((barber) => {
              const off = timeOff.find((t) => t.barber_id === barber.id);
              const columnBookings = bookings.filter(
                (b) => b.barber_id === barber.id
              );
              return (
                <div
                  key={barber.id}
                  className="relative border-l border-[#E5E5E5]"
                  style={{ height: SLOTS_PER_DAY * SLOT_PX }}
                  onClick={(e) => onGridClick(e, barber.id, !!off)}
                >
                  {hours.map((m) => (
                    <div
                      key={m}
                      className={
                        m % 60 === 0
                          ? "border-t border-[#E5E5E5]"
                          : "border-t border-[#F0F0F0]"
                      }
                      style={{ height: SLOT_PX }}
                    />
                  ))}

                  {off && (
                    <div
                      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F5F5F5]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #F5F5F5, #F5F5F5 8px, #EEEEEE 8px, #EEEEEE 16px)",
                      }}
                    >
                      <span className="text-sm font-semibold text-[#737373]">
                        Off
                      </span>
                      {off.reason && (
                        <span className="mt-1 max-w-[200px] px-2 text-center text-xs text-[#737373]">
                          {off.reason}
                        </span>
                      )}
                    </div>
                  )}

                  {!off &&
                    columnBookings.map((booking) => {
                      const start = timeToMinutes(booking.start_time);
                      const end = timeToMinutes(booking.end_time);
                      const top = ((start - DAY_START_MIN) / 15) * SLOT_PX;
                      const height = Math.max(
                        ((end - start) / 15) * SLOT_PX,
                        SLOT_PX
                      );
                      const bg = STATUS_COLORS[booking.status];
                      const cancelled = booking.status === "cancelled";
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(booking);
                          }}
                          className="absolute left-1 right-1 z-[5] overflow-hidden rounded-md px-2 py-1 text-left text-white shadow-sm"
                          style={{
                            top,
                            height,
                            backgroundColor: bg,
                            textDecoration: cancelled ? "line-through" : undefined,
                            opacity: cancelled ? 0.85 : 1,
                          }}
                        >
                          <div className="truncate text-[13px] font-bold leading-tight">
                            {booking.clients?.name ?? "Client"}
                          </div>
                          <div className="truncate text-[12px] leading-tight opacity-95">
                            {booking.services?.name ?? "Service"}
                          </div>
                          <div className="truncate text-[11px] leading-tight opacity-80">
                            {formatTimeHHMM(booking.start_time)}–
                            {formatTimeHHMM(booking.end_time)}
                          </div>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>

          {bookings.length === 0 && (
            <EmptyState message="No bookings for this day" />
          )}
        </div>
      )}

      {newModal && (
        <NewBookingModal
          initial={newModal}
          barbers={barbers}
          clients={clients}
          services={services}
          onClose={() => setNewModal(null)}
          onCreated={() => {
            setNewModal(null);
            load();
          }}
        />
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[#FAFAFA]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function NewBookingModal({
  initial,
  barbers,
  clients,
  services,
  onClose,
  onCreated,
}: {
  initial: NonNullable<NewModalState>;
  barbers: Barber[];
  clients: Client[];
  services: Service[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [clientId, setClientId] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(initial.barberId);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [clientQuery, setClientQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const endTime = service
    ? addMinutesToTime(startTime, service.duration_minutes)
    : startTime;

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientQuery.toLowerCase())
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let resolvedClientId = clientId;
    if (addingClient) {
      if (!newName.trim() || !newPhone.trim()) {
        setError("Enter new client name and phone");
        return;
      }
      const { data, error: cErr } = await supabase
        .from("clients")
        .insert({ name: newName.trim(), phone: newPhone.trim() })
        .select("id")
        .single();
      if (cErr || !data) {
        setError("Failed to create client");
        return;
      }
      resolvedClientId = data.id;
    }

    if (!resolvedClientId || !serviceId) {
      setError("Select a client and service");
      return;
    }

    const { data: dayBookings } = await supabase
      .from("bookings")
      .select("start_time,end_time,status")
      .eq("barber_id", barberId)
      .eq("booking_date", date)
      .neq("status", "cancelled");
    const clash = (dayBookings ?? []).some((b) =>
      rangesOverlap(startTime, endTime, b.start_time, b.end_time)
    );
    if (clash) {
      setError("This time slot overlaps with an existing booking");
      return;
    }

    if (timeToMinutes(endTime) > DAY_END_MIN) {
      setError("Booking ends after business hours (19:00)");
      return;
    }

    setSaving(true);
    const { error: bErr } = await supabase.from("bookings").insert({
      client_id: resolvedClientId,
      barber_id: barberId,
      service_id: serviceId,
      booking_date: date,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      status: "confirmed",
    });
    setSaving(false);
    if (bErr) {
      setError(bErr.message || "Failed to create booking");
      return;
    }
    onCreated();
  }

  return (
    <ModalShell title="New Booking" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Client</label>
          {!addingClient ? (
            <>
              <input
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Search clients…"
                className="mb-2 w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
              />
              <select
                required={!addingClient}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
              >
                <option value="">Select client</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-2 text-sm font-medium text-[#D4A24E]"
                onClick={() => setAddingClient(true)}
              >
                + Add new client
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+4219XXXXXXXX"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="text-sm text-[#737373]"
                onClick={() => setAddingClient(false)}
              >
                Cancel — use existing
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Service</label>
          <select
            required
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatEuro(Number(s.price))} · {s.duration_minutes} min
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Barber</label>
          <select
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Start time</label>
            <input
              type="time"
              step={900}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">End time</label>
          <input
            type="time"
            readOnly
            value={endTime}
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-sm text-[#737373]"
          />
        </div>

        {error && <p className="text-sm text-[#E5484D]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#D4A24E] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create booking"}
        </button>
      </form>
    </ModalShell>
  );
}

function BookingDetailModal({
  booking,
  onClose,
  onUpdated,
}: {
  booking: BookingWithRelations;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [reschedule, setReschedule] = useState(false);
  const [date, setDate] = useState(booking.booking_date);
  const [startTime, setStartTime] = useState(formatTimeHHMM(booking.start_time));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const duration =
    booking.services?.duration_minutes ??
    timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time);
  const endTime = addMinutesToTime(startTime, duration);

  async function saveStatus() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", booking.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onUpdated();
  }

  async function saveReschedule() {
    setError(null);
    const { data: dayBookings } = await supabase
      .from("bookings")
      .select("id,start_time,end_time,status")
      .eq("barber_id", booking.barber_id)
      .eq("booking_date", date)
      .neq("status", "cancelled");
    if (
      (dayBookings ?? []).some(
        (b) =>
          b.id !== booking.id &&
          rangesOverlap(startTime, endTime, b.start_time, b.end_time)
      )
    ) {
      setError("This time slot overlaps with an existing booking");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("bookings")
      .update({
        booking_date: date,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        rescheduled_count: (booking.rescheduled_count ?? 0) + 1,
      })
      .eq("id", booking.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onUpdated();
  }

  return (
    <ModalShell title="Booking details" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-[#737373]">Client</div>
          <div className="font-semibold">
            {booking.clients?.name} · {booking.clients?.phone}
          </div>
        </div>
        <div>
          <div className="text-[#737373]">Service</div>
          <div className="font-semibold">
            {booking.services?.name} —{" "}
            {formatEuro(Number(booking.services?.price ?? 0))}
          </div>
        </div>
        <div>
          <div className="text-[#737373]">Time</div>
          <div className="font-semibold">
            {booking.booking_date} · {formatTimeHHMM(booking.start_time)}–
            {formatTimeHHMM(booking.end_time)}
          </div>
        </div>
        <div>
          <div className="text-[#737373]">Barber</div>
          <div className="font-semibold">{booking.barbers?.name}</div>
        </div>
        {(booking.rescheduled_count ?? 0) > 0 && (
          <p className="text-[#D4A24E]">
            Rescheduled {booking.rescheduled_count} times
          </p>
        )}

        <div>
          <label className="mb-1 block font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BookingStatus)}
            className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2"
          >
            {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveStatus}
            disabled={saving || status === booking.status}
            className="mt-2 rounded-lg bg-[#D4A24E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Update status
          </button>
        </div>

        {!reschedule ? (
          <button
            type="button"
            onClick={() => setReschedule(true)}
            className="rounded-lg border border-[#E5E5E5] px-4 py-2 text-sm font-medium"
          >
            Reschedule
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-[#E5E5E5] p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] px-3 py-2"
              />
              <input
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] px-3 py-2"
              />
            </div>
            <p className="text-xs text-[#737373]">Ends at {endTime}</p>
            <button
              type="button"
              onClick={saveReschedule}
              disabled={saving}
              className="rounded-lg bg-[#D4A24E] px-4 py-2 text-sm font-semibold text-white"
            >
              Save new time
            </button>
          </div>
        )}

        {error && <p className="text-[#E5484D]">{error}</p>}
      </div>
    </ModalShell>
  );
}
