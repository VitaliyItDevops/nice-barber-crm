"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase";
import type { Barber, BookingWithRelations, Client, Service } from "@/types/database";
import {
  calculateLTV,
  calculateNoShowRate,
  calculateRevenuePerHour,
} from "@/lib/analytics";
import {
  addDaysLocal,
  formatDateDDMM,
  formatEuro,
  formatEuroGrouped,
  parseLocalDate,
  toDateInputValue,
} from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from "@/components/dashboard/ui";

type Row = BookingWithRelations & { price: number; duration_minutes: number };
type Preset = "today" | "week" | "month" | "year" | "custom";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = parseLocalDate(start).getTime();
  const b = parseLocalDate(end).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1);
}

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [preset, setPreset] = useState<Preset>("month");
  const [rangeStart, setRangeStart] = useState(() =>
    toDateInputValue(startOfMonth(new Date()))
  );
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(new Date()));

  function applyPreset(next: Preset) {
    setPreset(next);
    const t = new Date();
    if (next === "today") {
      const d = toDateInputValue(t);
      setRangeStart(d);
      setRangeEnd(d);
    } else if (next === "week") {
      setRangeStart(toDateInputValue(startOfWeek(t)));
      setRangeEnd(toDateInputValue(t));
    } else if (next === "month") {
      setRangeStart(toDateInputValue(startOfMonth(t)));
      setRangeEnd(toDateInputValue(t));
    } else if (next === "year") {
      setRangeStart(toDateInputValue(startOfYear(t)));
      setRangeEnd(toDateInputValue(t));
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      const [bRes, bookRes, sRes, cRes] = await Promise.all([
        supabase.from("barbers").select("*").order("name"),
        supabase
          .from("bookings")
          .select(
            "*, clients(id,name,phone), services(id,name,name_en,price,duration_minutes), barbers(id,name)"
          ),
        supabase.from("services").select("*"),
        supabase.from("clients").select("*"),
      ]);
      if (bRes.error || bookRes.error || sRes.error || cRes.error) {
        setError(true);
        setLoading(false);
        return;
      }
      const bookings = ((bookRes.data as BookingWithRelations[]) ?? []).map((b) => ({
        ...b,
        price: Number(b.services?.price ?? 0),
        duration_minutes: Number(b.services?.duration_minutes ?? 0),
      }));
      setRows(bookings);
      setBarbers((bRes.data as Barber[]) ?? []);
      setServices((sRes.data as Service[]) ?? []);
      setClients((cRes.data as Client[]) ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

  const filtered = useMemo(
    () => rows.filter((b) => b.booking_date >= start && b.booking_date <= end),
    [rows, start, end]
  );

  const dayCount = daysBetweenInclusive(start, end);

  const revenue = filtered
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + b.price, 0);

  const noShowRate = calculateNoShowRate(filtered);

  const nonCancelled = filtered.filter((b) => b.status !== "cancelled").length;
  const avgPerDay = nonCancelled / dayCount;

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    let cursor = parseLocalDate(start);
    const last = parseLocalDate(end);
    while (cursor.getTime() <= last.getTime()) {
      map.set(toDateInputValue(cursor), 0);
      cursor = addDaysLocal(cursor, 1);
    }
    filtered
      .filter((b) => b.status === "completed")
      .forEach((b) => {
        if (map.has(b.booking_date)) {
          map.set(b.booking_date, (map.get(b.booking_date) ?? 0) + b.price);
        }
      });
    return Array.from(map.entries()).map(([date, rev]) => ({
      date,
      label: formatDateDDMM(date),
      revenue: Number(rev.toFixed(2)),
    }));
  }, [filtered, start, end]);

  const noShowByBarber = barbers.map((barber) => {
    const subset = filtered.filter((b) => b.barber_id === barber.id);
    const rate = calculateNoShowRate(subset);
    return { name: barber.name, rate: Number((rate * 100).toFixed(1)) };
  });

  function bucket(time: string): "Morning" | "Afternoon" | "Evening" {
    const h = Number(time.slice(0, 2));
    if (h < 13) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  }

  const noShowByTime = (["Morning", "Afternoon", "Evening"] as const).map(
    (name) => {
      const subset = filtered.filter((b) => bucket(b.start_time) === name);
      const rate = calculateNoShowRate(subset);
      return { name, rate: Number((rate * 100).toFixed(1)) };
    }
  );

  const revPerHourService = [...services]
    .map((s) => {
      const completed = filtered.filter(
        (b) => b.service_id === s.id && b.status === "completed"
      );
      if (completed.length === 0) {
        return {
          name: s.name,
          value: Number(
            calculateRevenuePerHour(Number(s.price), s.duration_minutes).toFixed(2)
          ),
        };
      }
      const revenueSum = completed.reduce((sum, b) => sum + b.price, 0);
      const hours = completed.reduce((sum, b) => sum + b.duration_minutes, 0) / 60;
      return {
        name: s.name,
        value: hours > 0 ? Number((revenueSum / hours).toFixed(2)) : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  const revPerHourBarber = barbers
    .map((barber) => {
      const completed = filtered.filter(
        (b) => b.barber_id === barber.id && b.status === "completed"
      );
      const revenueSum = completed.reduce((s, b) => s + b.price, 0);
      const hours =
        completed.reduce((s, b) => s + b.duration_minutes, 0) / 60;
      const value = hours > 0 ? revenueSum / hours : 0;
      return {
        name: barber.name,
        value: Number(value.toFixed(2)),
      };
    })
    .sort((a, b) => b.value - a.value);

  const topClients = clients
    .map((client) => {
      const history = filtered.filter((b) => b.client_id === client.id);
      const ltv = calculateLTV(
        history.map((b) => ({ status: b.status, price: b.price }))
      );
      const visits = history.filter((b) => b.status === "completed").length;
      return { id: client.id, name: client.name, ltv, visits };
    })
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, 10);

  const chartInterval = dayCount > 40 ? Math.floor(dayCount / 12) : dayCount > 14 ? 2 : 0;

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  const presets: { id: Preset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div>
      <PageHeader title="Analytics" />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                preset === p.id
                  ? "bg-[#D4A24E] text-white"
                  : "border border-[#E5E5E5] bg-white text-[#1A1A1A] hover:bg-[#FAFAFA]"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="text-xs text-[#737373]">From</label>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => {
                setPreset("custom");
                setRangeStart(e.target.value);
              }}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-sm"
            />
            <label className="text-xs text-[#737373]">To</label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => {
                setPreset("custom");
                setRangeEnd(e.target.value);
              }}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-[#737373]">Revenue (selected range)</p>
          <p className="mt-2 text-2xl font-semibold">{formatEuroGrouped(revenue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#737373]">No-show rate (selected range)</p>
          <p className="mt-2 text-2xl font-semibold">
            {(noShowRate * 100).toFixed(1)}%
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#737373]">Avg. bookings/day</p>
          <p className="mt-2 text-2xl font-semibold">{avgPerDay.toFixed(1)}</p>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Daily revenue</h2>
          <div className="h-64">
            {dailyRevenue.length === 0 ? (
              <EmptyState message="No results found" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={chartInterval}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatEuro(Number(v ?? 0))} />
                  <Bar dataKey="revenue" fill="#D4A24E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">No-show % by barber</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noShowByBarber}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => `${Number(v ?? 0)}%`} />
                  <Bar dataKey="rate" fill="#E5484D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">No-show % by time of day</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noShowByTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => `${Number(v ?? 0)}%`} />
                  <Bar dataKey="rate" fill="#E5484D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Revenue / hour by service</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revPerHourService} layout="vertical" margin={{ left: 24, right: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${formatEuro(Number(v ?? 0))}/hr`} />
                  <Bar dataKey="value" fill="#D4A24E" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v) => `${formatEuro(Number(v ?? 0))}/hr`}
                      style={{ fontSize: 10, fill: "#737373" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Revenue / hour by barber</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revPerHourBarber} layout="vertical" margin={{ left: 8, right: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${formatEuro(Number(v ?? 0))}/hr`} />
                  <Bar dataKey="value" fill="#4CAF50" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v) => `${formatEuro(Number(v ?? 0))}/hr`}
                      style={{ fontSize: 10, fill: "#737373" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-[#E5E5E5] px-5 py-4">
            <h2 className="text-sm font-semibold">Top clients by Lifetime Value</h2>
          </div>
          {topClients.every((c) => c.ltv === 0) && topClients.every((c) => c.visits === 0) ? (
            <EmptyState message="No results found" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] text-[#737373]">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Rank</th>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">LTV</th>
                  <th className="px-5 py-3 text-left font-medium">Visits</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.id} className="border-t border-[#E5E5E5]">
                    <td className="px-5 py-3">{i + 1}</td>
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3">{formatEuro(c.ltv)}</td>
                    <td className="px-5 py-3">{c.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
