import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const store = () => getStore({ name: "push-reminders", consistency: "strong" });
const keyFor = (endpoint: string) => `subscription-${createHash("sha256").update(endpoint).digest("hex")}`;

function validTimezone(value: unknown) {
  if (typeof value !== "string" || value.length > 80) return "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return value; } catch { return "UTC"; }
}

export default async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new Response("Forbidden", { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 40000) return new Response("Too large", { status: 413 });
  if (req.method === "POST") {
    const body = await req.json().catch(() => null) as any;
    const endpoint = body?.subscription?.endpoint;
    if (typeof endpoint !== "string" || endpoint.length > 2048 || !body?.subscription?.keys) {
      return Response.json({ error: "Invalid subscription" }, { status: 400 });
    }
    let url: URL;
    try { url = new URL(endpoint); } catch { return new Response("Invalid endpoint", { status: 400 }); }
    const hosts = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns.windows.com"];
    if (url.protocol !== "https:" || url.port || url.username || url.password || !hosts.some(h => url.hostname === h || url.hostname.endsWith("." + h))) return new Response("Invalid push provider", { status: 400 });
    if (!/^[A-Za-z0-9_-]{87}$/.test(body.subscription.keys.p256dh || "") || !/^[A-Za-z0-9_-]{22}$/.test(body.subscription.keys.auth || "")) return new Response("Invalid keys", { status: 400 });
    const schedule = body.schedule && typeof body.schedule === "object" ? body.schedule : {};
    const exams = Array.isArray(body.exams) ? body.exams.slice(0, 100) : [];
    if (JSON.stringify({schedule, exams}).length > 30000 || Object.values(schedule).some(rows => !Array.isArray(rows) || rows.length > 24)) return new Response("Invalid schedule", { status: 400 });
    const previous = await store().get(keyFor(endpoint), { type: "json" }) as any;
    await store().setJSON(keyFor(endpoint), {
      subscription: body.subscription,
      timezone: validTimezone(body.timezone),
      schedule,
      exams,
      sent: previous?.sent || {},
      updatedAt: new Date().toISOString()
    });
    return Response.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const body = await req.json().catch(() => null) as any;
    if (typeof body?.endpoint !== "string") return Response.json({ error: "Invalid endpoint" }, { status: 400 });
    await store().delete(keyFor(body.endpoint));
    return Response.json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/push-register", method: ["POST", "DELETE"] };
