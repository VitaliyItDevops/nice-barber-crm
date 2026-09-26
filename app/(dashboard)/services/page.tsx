"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Service } from "@/types/database";
import { formatEuro } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Spinner,
} from "@/components/dashboard/ui";

export default function ServicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("services")
      .select("*")
      .order("name");
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    setServices((data as Service[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(s: Service) {
    setEditingId(s.id);
    setPrice(String(Number(s.price).toFixed(2)));
    setDuration(String(s.duration_minutes));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  async function save(id: string) {
    const priceNum = Number(price);
    const durationNum = Number(duration);
    if (Number.isNaN(priceNum) || priceNum < 0 || Number.isNaN(durationNum) || durationNum <= 0) {
      setSaveError("Enter a valid price and duration");
      return;
    }
    const { error: err } = await supabase
      .from("services")
      .update({ price: priceNum, duration_minutes: durationNum })
      .eq("id", id);
    if (err) {
      setSaveError(err.message);
      return;
    }
    setEditingId(null);
    load();
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return (
    <div>
      <PageHeader title="Services" />
      {services.length === 0 ? (
        <EmptyState message="No results found" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Name (EN)</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Duration (min)</th>
                <th className="px-4 py-3 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const editing = editingId === s.id;
                return (
                  <tr key={s.id} className="border-b border-[#E5E5E5]">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-[#737373]">{s.name_en}</td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-24 rounded border border-[#E5E5E5] px-2 py-1"
                        />
                      ) : (
                        formatEuro(Number(s.price))
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-20 rounded border border-[#E5E5E5] px-2 py-1"
                        />
                      ) : (
                        s.duration_minutes
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => save(s.id)}
                            className="rounded p-1.5 text-[#4CAF50] hover:bg-[#FAFAFA]"
                            aria-label="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded p-1.5 text-[#737373] hover:bg-[#FAFAFA]"
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="rounded p-1.5 text-[#737373] hover:bg-[#FAFAFA] hover:text-[#D4A24E]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {saveError && (
            <p className="px-4 py-2 text-sm text-[#E5484D]">{saveError}</p>
          )}
        </Card>
      )}
    </div>
  );
}
