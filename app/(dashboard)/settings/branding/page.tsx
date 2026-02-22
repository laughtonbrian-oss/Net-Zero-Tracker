import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BrandingView } from "@/components/settings/branding-view";

export const metadata = { title: "Branding — Net Zero Pathfinder" };

export default async function BrandingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true, logo: true },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Branding</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Customise your company logo for reports and the sidebar.
        </p>
      </div>
      <BrandingView companyName={company?.name ?? ""} initialLogo={company?.logo ?? null} />
    </div>
  );
}
