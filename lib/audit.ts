import { db } from "@/lib/db";

type AuditAction = "created" | "updated" | "deleted";

export async function writeAuditLog({
  companyId,
  userId,
  entityType,
  entityId,
  action,
  before,
  after,
}: {
  companyId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      companyId,
      userId,
      entityType,
      entityId,
      action,
      changes: JSON.stringify({ before: before ?? null, after: after ?? null }),
    },
  });
}
