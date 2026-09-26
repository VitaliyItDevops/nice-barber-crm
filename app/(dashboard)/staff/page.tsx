"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Barber, BarberTimeOff } from "@/types/database";
import { formatDateDDMMYYYY, toDateInputValue } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from "@/components/dashboard/ui";
import { Plus, Trash2, X } from "lucide-react";

export default function StaffPage() {
  const supabase = useMemo(() => createClient(), []);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [timeOff, setTimeOff] = useState<BarberTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [formBarber, setFormBarber] = useState("");
  const [formDate, setFormDate] = useState(toDateInputValue(new Date()));
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [showAddBarber, setShowAddBarber] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [addBarberError, setAddBarberError] = useState<string | null>(null);
  const [addingBarber, setAddingBarber] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    const [bRes, tRes] = await Promise.all([
      supabase.from("barbers").select("*").order("name"),
      supabase.from("barber_time_off").select("*").order("date"),
    ]);
    if (bRes.error || tRes.error) {
      setError(true);
      setLoading(false);
      return;
    }
    const list = (bRes.data as Barber[]) ?? [];
    setBarbers(list);
    setTimeOff((tRes.data as BarberTimeOff[]) ?? []);
    if (!formBarber && list[0]) setFormBarber(list[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTimeOff = useMemo(() => {
    return timeOff.filter((t) => {
      if (filterFrom && t.date < filterFrom) return false;
      if (filterTo && t.date > filterTo) return false;
      return true;
    });
  }, [timeOff, filterFrom, filterTo]);

  async function toggleActive(barber: Barber) {
    const next = !barber.active;
    setBarbers((prev) =>
      prev.map((b) => (b.id === barber.id ? { ...b, active: next } : b))
    );
    const { error: err } = await supabase
      .from("barbers")
      .update({ active: next })
      .eq("id", barber.id);
    if (err) {
      setBarbers((prev) =>
        prev.map((b) =>
          b.id === barber.id ? { ...b, active: barber.active } : b
        )
      );
    }
  }

  async function addTimeOff(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formBarber || !formDate) {
      setFormError("Select barber and date");
      return;
    }
    const { error: err } = await supabase.from("barber_time_off").insert({
      barber_id: formBarber,
      date: formDate,
      reason: formReason.trim() || null,
    });
    if (err) {
      setFormError(err.message);
      return;
    }
    setFormReason("");
    load();
  }

  async function removeTimeOff(id: string) {
    await supabase.from("barber_time_off").delete().eq("id", id);
    load();
  }

  async function addBarber(e: FormEvent) {
    e.preventDefault();
    setAddBarberError(null);
    const name = newBarberName.trim();
    if (!name) {
      setAddBarberError("Name is required");
      return;
    }
    setAddingBarber(true);
    const { error: err } = await supabase
      .from("barbers")
      .insert({ name, active: true });
    setAddingBarber(false);
    if (err) {
      setAddBarberError(err.message);
      return;
    }
    setNewBarberName("");
    setShowAddBarber(false);
    load();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return (
    <div>
      <PageHeader title="Staff">
        <button
          type="button"
          onClick={() => setShowAddBarber(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4A24E] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add barber
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {barbers.map((barber) => (
          <Card key={barber.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{barber.name}</p>
                <p className="text-xs text-[#737373]">
                  {barber.active ? "Active" : "Inactive"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={barber.active}
                onClick={() => toggleActive(barber)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  barber.active ? "bg-[#D4A24E]" : "bg-[#E5E5E5]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    barber.active ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {barbers.length === 0 && <EmptyState message="No barbers found" />}

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold">Add time off</h2>
        <form onSubmit={addTimeOff} className="grid gap-3 md:grid-cols-4">
          <select
            value={formBarber}
            onChange={(e) => setFormBarber(e.target.value)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
          />
          <input
            value={formReason}
            onChange={(e) => setFormReason(e.target.value)}
            placeholder="Reason (optional)"
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#D4A24E] px-4 py-2 text-sm font-semibold text-white"
          >
            Add time off
          </button>
        </form>
        {formError && <p className="mt-2 text-sm text-[#E5484D]">{formError}</p>}

        <div className="mb-3 mt-6 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold">Time off</h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-[#737373]">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-sm"
            />
            <label className="text-xs text-[#737373]">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-sm"
            />
            {(filterFrom || filterTo) && (
              <button
                type="button"
                onClick={() => {
                  setFilterFrom("");
                  setFilterTo("");
                }}
                className="text-xs font-medium text-[#D4A24E]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredTimeOff.length === 0 ? (
          <EmptyState message="No results found" />
        ) : (
          <ul className="divide-y divide-[#E5E5E5]">
            {filteredTimeOff.map((t) => {
              const barber = barbers.find((b) => b.id === t.barber_id);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{barber?.name ?? "Barber"}</span>
                    <span className="text-[#737373]">
                      {" "}
                      · {formatDateDDMMYYYY(t.date)}
                    </span>
                    {t.reason && (
                      <span className="text-[#737373]"> — {t.reason}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTimeOff(t.id)}
                    className="rounded p-1.5 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#E5484D]"
                    aria-label="Remove time off"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {showAddBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
              <h2 className="text-lg font-semibold">Add barber</h2>
              <button
                type="button"
                onClick={() => setShowAddBarber(false)}
                className="rounded p-1 hover:bg-[#FAFAFA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={addBarber} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  required
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm"
                  placeholder="Barber name"
                  autoFocus
                />
              </div>
              <p className="text-xs text-[#737373]">Active by default</p>
              {addBarberError && (
                <p className="text-sm text-[#E5484D]">{addBarberError}</p>
              )}
              <button
                type="submit"
                disabled={addingBarber}
                className="w-full rounded-lg bg-[#D4A24E] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {addingBarber ? "Saving…" : "Create barber"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
