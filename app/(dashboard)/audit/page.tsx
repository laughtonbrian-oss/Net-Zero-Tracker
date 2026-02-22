import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { AuditLogView } from "@/components/audit/audit-log-view";

export const metadata = { title: "Audit Log — Net Zero Pathfinder" };

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  const logs = await db.auditLog.findMany({
    where: { companyId: session.user.companyId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All data changes made by your team, in reverse chronological order.
        </p>
      </div>
      <AuditLogView logs={logs} />
    </div>
  );
}
