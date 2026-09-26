"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { BookingStatus, BookingWithRelations, Client } from "@/types/database";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { calculateAvgInterval, calculateLTV } from "@/lib/analytics";
import {
  formatDateDDMMYYYY,
  formatEuro,
  toDateInputValue,
} from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from "@/components/dashboard/ui";
import { ChevronDown, ChevronUp } from "lucide-react";

type ClientRow = {
  client: Client;
  visits: number;
  ltv: number;
  avgInterval: number | null;
  lastVisit: string | null;
  followUpDue: boolean;
  history: BookingWithRelations[];
};

type SortKey = "ltv" | "lastVisit" | "name" | "visits";

export default function ClientsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      const [cRes, bRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase
          .from("bookings")
          .select(
            "*, clients(id,name,phone), services(id,name,name_en,price,duration_minutes), barbers(id,name)"
          ),
      ]);
      if (cRes.error || bRes.error) {
        setError(true);
        setLoading(false);
        return;
      }
      const clients = (cRes.data as Client[]) ?? [];
      const bookings = (bRes.data as BookingWithRelations[]) ?? [];
      const today = toDateInputValue(new Date());

      const built: ClientRow[] = clients.map((client) => {
        const history = bookings
          .filter((b) => b.client_id === client.id)
          .sort((a, b) =>
            a.booking_date === b.booking_date
              ? b.start_time.localeCompare(a.start_time)
              : b.booking_date.localeCompare(a.booking_date)
          );
        const priced = history.map((b) => ({
          status: b.status,
          booking_date: b.booking_date,
          price: Number(b.services?.price ?? 0),
        }));
        const visits = priced.filter((b) => b.status === "completed").length;
        const ltv = calculateLTV(priced);
        const avgInterval = calculateAvgInterval(priced);
        const completedDates = priced
          .filter((b) => b.status === "completed")
          .map((b) => b.booking_date)
          .sort();
        const lastVisit = completedDates.length
          ? completedDates[completedDates.length - 1]
          : null;

        let followUpDue = false;
        if (lastVisit && avgInterval != null) {
          const last = new Date(lastVisit + "T00:00:00");
          const now = new Date(today + "T00:00:00");
          const days =
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
          followUpDue = days > avgInterval;
        }

        return {
          client,
          visits,
          ltv,
          avgInterval,
          lastVisit,
          followUpDue,
          history,
        };
      });

      setRows(built);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = r.client.name.toLowerCase().includes(q);
    const phoneTail = r.client.phone.replace(/\D/g, "").slice(-4);
    const phoneMatch = phoneTail.includes(q.replace(/\D/g, "")) || r.client.phone.includes(q);
    return nameMatch || (q.replace(/\D/g, "").length > 0 && phoneMatch);
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return a.client.name.localeCompare(b.client.name) * dir;
    if (sortKey === "ltv") return (a.ltv - b.ltv) * dir;
    if (sortKey === "visits") return (a.visits - b.visits) * dir;
    const aL = a.lastVisit ?? "";
    const bL = b.lastVisit ?? "";
    return aL.localeCompare(bL) * dir;
  });

  return (
    <div>
      <PageHeader title="Clients" />
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or last 4 digits of phone"
          className="w-full max-w-md rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D4A24E]"
        />
      </div>

      {loading && <Spinner />}
      {error && <ErrorMessage />}
      {!loading && !error && sorted.length === 0 && (
        <EmptyState message="No results found" />
      )}

      {!loading && !error && sorted.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
                <tr>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("name")}>
                    Name <SortIcon active={sortKey === "name"} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("visits")}>
                    Total Visits <SortIcon active={sortKey === "visits"} dir={sortDir} />
                  </th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("ltv")}>
                    Lifetime Value <SortIcon active={sortKey === "ltv"} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 font-medium">Avg. Interval (days)</th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("lastVisit")}>
                    Last Visit <SortIcon active={sortKey === "lastVisit"} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <Fragment key={row.client.id}>
                    <tr
                      onClick={() =>
                        setExpanded((id) =>
                          id === row.client.id ? null : row.client.id
                        )
                      }
                      className={`cursor-pointer border-b border-[#E5E5E5] hover:bg-[#FAFAFA] ${
                        row.followUpDue ? "bg-[#FFF8ED]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{row.client.name}</td>
                      <td className="px-4 py-3 text-[#737373]">{row.client.phone}</td>
                      <td className="px-4 py-3">{row.visits}</td>
                      <td className="px-4 py-3">{formatEuro(row.ltv)}</td>
                      <td className="px-4 py-3">
                        {row.avgInterval == null ? "—" : row.avgInterval}
                      </td>
                      <td className="px-4 py-3">
                        {row.lastVisit ? formatDateDDMMYYYY(row.lastVisit) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.followUpDue && (
                          <span className="rounded-full bg-[#FFF8ED] px-2.5 py-1 text-xs font-medium text-[#D4A24E] ring-1 ring-[#D4A24E]/40">
                            Follow-up due
                          </span>
                        )}
                      </td>
                    </tr>
                    {expanded === row.client.id && (
                      <tr className="bg-[#FAFAFA]">
                        <td colSpan={7} className="px-4 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#737373]">
                            Booking history
                          </p>
                          {row.history.length === 0 ? (
                            <EmptyState message="No bookings" />
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-[#737373]">
                                  <th className="py-1 text-left font-medium">Date</th>
                                  <th className="py-1 text-left font-medium">Service</th>
                                  <th className="py-1 text-left font-medium">Barber</th>
                                  <th className="py-1 text-left font-medium">Status</th>
                                  <th className="py-1 text-left font-medium">Rescheduled</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.history.map((b) => (
                                  <tr key={b.id} className="border-t border-[#E5E5E5]">
                                    <td className="py-2">{formatDateDDMMYYYY(b.booking_date)}</td>
                                    <td className="py-2">{b.services?.name}</td>
                                    <td className="py-2">{b.barbers?.name}</td>
                                    <td className="py-2">
                                      <StatusBadge status={b.status} />
                                    </td>
                                    <td className="py-2">{b.rescheduled_count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return dir === "asc" ? (
    <ChevronUp className="inline h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="inline h-3.5 w-3.5" />
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[status] }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
