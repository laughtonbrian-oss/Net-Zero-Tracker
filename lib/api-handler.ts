import { NextResponse } from "next/server";

/**
 * Wraps an API route handler to eliminate repeated try/catch boilerplate.
 *
 * Every route in this app follows the same pattern:
 *   try { ... } catch (err) {
 *     if (err instanceof Response) return err;   // from getTenantContext / requireEdit
 *     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
 *   }
 *
 * This wrapper handles that uniformly so route handlers only contain business logic.
 */
export function apiHandler(
  handler: (req: Request) => Promise<NextResponse | Response>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error(`[${req.method} ${new URL(req.url).pathname}]`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
