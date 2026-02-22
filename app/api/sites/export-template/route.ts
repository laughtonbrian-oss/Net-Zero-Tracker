import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export async function GET() {
  try {
    await getTenantContext();
    const { utils, write } = await import("xlsx");

    const headers = [
      "name*",
      "address",
      "city",
      "region",
      "country",
      "latitude",
      "longitude",
      "siteType",
      "grossFloorAreaM2",
      "yearBuilt",
      "siteManager",
      "notes",
    ];

    const notes = [
      "Required. Site name.",
      "Street address",
      "City",
      "State / Province / Region",
      "Country",
      "Decimal degrees (-90 to 90)",
      "Decimal degrees (-180 to 180)",
      "office | warehouse | manufacturing | retail | data_centre | other",
      "Gross floor area in square metres (number)",
      "Year built (e.g. 2005)",
      "Site manager or owner name",
      "Free text notes",
    ];

    const ws = utils.aoa_to_sheet([headers, notes]);

    // Style the header row (bold)
    for (let c = 0; c < headers.length; c++) {
      const cell = utils.encode_cell({ r: 0, c });
      if (ws[cell]) ws[cell].s = { font: { bold: true } };
    }

    // Set column widths
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sites");

    const buf = write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="site_import_template.xlsx"',
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
