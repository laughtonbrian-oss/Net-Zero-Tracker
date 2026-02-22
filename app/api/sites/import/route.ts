import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { requireEdit } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const VALID_SITE_TYPES = ["office", "warehouse", "manufacturing", "retail", "data_centre", "other"];

type RowError = { row: number; errors: string[] };
type ParsedRow = {
  name: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  siteType?: string;
  grossFloorAreaM2?: number;
  yearBuilt?: number;
  siteManager?: string;
  notes?: string;
};

function str(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  return String(v).trim() || undefined;
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireEdit(ctx);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Limit upload size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large — maximum 5 MB" }, { status: 413 });
    }
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only .xlsx and .xls files are accepted" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { read, utils } = await import("xlsx");
    const wb = read(arrayBuffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    // Skip the notes row (row index 0 in the JSON = second row in sheet = notes row)
    // We detect it by checking if the "name*" column value looks like a description
    const dataRows = rows.filter((r) => {
      const nameVal = String(r["name*"] ?? "").toLowerCase();
      return nameVal !== "required. site name." && nameVal !== "";
    });

    const errors: RowError[] = [];
    const valid: ParsedRow[] = [];

    dataRows.forEach((row, i) => {
      const rowNum = i + 3; // 1=header, 2=notes, 3+=data
      const rowErrors: string[] = [];

      const name = str(row["name*"]);
      if (!name) rowErrors.push("name is required");

      const lat = num(row["latitude"]);
      if (lat !== undefined && (lat < -90 || lat > 90)) rowErrors.push("latitude must be between -90 and 90");

      const lng = num(row["longitude"]);
      if (lng !== undefined && (lng < -180 || lng > 180)) rowErrors.push("longitude must be between -180 and 180");

      const siteType = str(row["siteType"]);
      if (siteType && !VALID_SITE_TYPES.includes(siteType)) {
        rowErrors.push(`siteType "${siteType}" not recognised — use: ${VALID_SITE_TYPES.join(", ")}`);
      }

      const yearBuilt = num(row["yearBuilt"]);
      if (yearBuilt !== undefined && (yearBuilt < 1800 || yearBuilt > 2100)) {
        rowErrors.push("yearBuilt must be between 1800 and 2100");
      }

      const gfa = num(row["grossFloorAreaM2"]);
      if (gfa !== undefined && gfa <= 0) rowErrors.push("grossFloorAreaM2 must be positive");

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors });
      } else {
        valid.push({
          name: name!,
          address: str(row["address"]),
          city: str(row["city"]),
          region: str(row["region"]),
          country: str(row["country"]),
          latitude: lat,
          longitude: lng,
          siteType: siteType,
          grossFloorAreaM2: gfa,
          yearBuilt: yearBuilt ? Math.round(yearBuilt) : undefined,
          siteManager: str(row["siteManager"]),
          notes: str(row["notes"]),
        });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    // Import all valid rows
    const created = await Promise.all(
      valid.map((data) =>
        db.site.create({ data: { companyId: ctx.companyId, ...data } })
      )
    );

    // Audit log for the batch
    await writeAuditLog({
      companyId: ctx.companyId, userId: ctx.userId,
      entityType: "site", entityId: "bulk-import",
      action: "created", before: null,
      after: { count: created.length, names: created.map((s) => s.name) },
    });

    return NextResponse.json({ data: created, count: created.length }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
