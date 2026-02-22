import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UsersList } from "@/components/settings/users-list";
import { Role } from "@prisma/client";

export const metadata = { title: "Team — Net Zero Tracker" };

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  const users = await db.user.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage who has access to your organisation&apos;s Net Zero Tracker.
        </p>
      </div>
      <UsersList initialUsers={users} currentUserId={session.user.id!} />
    </div>
  );
}
