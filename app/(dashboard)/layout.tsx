import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar email={user.email ?? "admin"} />
      <main className="min-h-screen pl-[220px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
