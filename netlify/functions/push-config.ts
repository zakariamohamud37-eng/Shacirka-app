import type { Config } from "@netlify/functions";

export default async () => {
  const publicKey = Netlify.env.get("VAPID_PUBLIC_KEY");
  if (!publicKey) return Response.json({ error: "Push is not configured" }, { status: 503 });
  return Response.json({ publicKey }, { headers: { "cache-control": "public, max-age=3600" } });
};

export const config: Config = { path: "/api/push-config", method: "GET" };
