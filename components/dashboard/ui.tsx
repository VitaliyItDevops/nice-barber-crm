export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-[#737373]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E5E5] border-t-[#D4A24E]" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorMessage({
  message = "Failed to load data. Please refresh.",
}: {
  message?: string;
}) {
  return (
    <p className="py-8 text-center text-sm text-[#E5484D]">{message}</p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-[#737373]">{message}</p>
  );
}

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-[#1A1A1A]">{title}</h1>
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#E5E5E5] bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
