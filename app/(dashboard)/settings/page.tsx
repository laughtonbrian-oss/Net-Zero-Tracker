import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings — Net Zero Tracker" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;
  const isAdmin = session.user.role === "ADMIN";

  const company = isAdmin
    ? await db.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, slug: true, plan: true },
      })
    : null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your account and company preferences.
        </p>
      </div>
      <SettingsView company={company} user={user} isAdmin={isAdmin} />
    </div>
  );
}
