import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import type { Config } from "@netlify/functions";

type RecordData = {
  subscription: any;
  timezone: string;
  schedule: Record<string, Array<{ phase?: string; subject?: string; time?: string; free?: boolean }>>;
  exams: Array<{ id?: string; subject?: string; date?: string; time?: string }>;
  sent?: Record<string, string>;
  updatedAt?: string;
};

const DAYS = ["Axad", "Isniin", "Talaado", "Arbaco", "Khamiis", "Jimce", "Sabti"];

function localClock(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const hm = `${p.hour}:${p.minute}`;
  const weekday = DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return { date, hm, weekday };
}

function daysBetween(today: string, target: string) {
  const a = Date.parse(`${today}T00:00:00Z`), b = Date.parse(`${target}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : 99999;
}

function dueWithinWindow(now: string, due: string) {
  const toMinutes = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
  const diff = toMinutes(now) - toMinutes(due);
  return diff >= 0 && diff <= 4;
}

export default async () => {
  const publicKey = Netlify.env.get("VAPID_PUBLIC_KEY"), privateKey = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) throw new Error("VAPID keys are missing");
  webpush.setVapidDetails("mailto:abdiqaadir259@gmail.com", publicKey, privateKey);
  const store = getStore({ name: "push-reminders", consistency: "strong" });
  const { blobs } = await store.list({ prefix: "subscription-" });

  await Promise.all(blobs.map(async ({ key }) => {
    const record = await store.get(key, { type: "json" }) as RecordData | null;
    if (!record?.subscription?.endpoint) return;
    const { date, hm, weekday } = localClock(record.timezone || "UTC");
    const sent = record.sent || {};
    const notices: Array<{ key: string; title: string; body: string; tag: string }> = [];

    for (const row of record.schedule?.[weekday] || []) {
      const time = row.time || "16:00";
      const noticeKey = `${date}-study-${row.phase || row.subject}-${time}`;
      if (!row.free && dueWithinWindow(hm, time) && !sent[noticeKey]) {
        notices.push({ key: noticeKey, title: "Waqtigii waxbarashada", body: `Waxaa la joogaa xilligii aad akhrin lahayd ${row.subject || "maadada jadwalkaaga ku qoran"}, hadda bilow.`, tag: noticeKey });
      }
    }
    for (const exam of record.exams || []) {
      const days = daysBetween(date, exam.date || "");
      const reminderTime = days === 0 ? (exam.time || "08:00") : "08:00";
      const noticeKey = `${date}-exam-${exam.id || exam.subject}-${days}`;
      if ([7, 3, 1, 0].includes(days) && dueWithinWindow(hm, reminderTime) && !sent[noticeKey]) {
        notices.push({ key: noticeKey, title: days === 0 ? "Waqtigii imtixaanka" : `Imtixaan ${days} maalmood kadib`, body: days === 0 ? `${exam.subject || "Imtixaanka"}: waqtigii imtixaanka ayaa la gaaray.` : `${exam.subject || "Imtixaanka"}, diyaar-garowgaaga hubi.`, tag: noticeKey });
      }
    }

    try {
      for (const notice of notices) {
        await webpush.sendNotification(record.subscription, JSON.stringify({ ...notice, url: "/" }));
        sent[notice.key] = new Date().toISOString();
      }
      const cutoff = Date.now() - 35 * 86400000;
      for (const [k, v] of Object.entries(sent)) if (Date.parse(v) < cutoff) delete sent[k];
      if (notices.length) await store.setJSON(key, { ...record, sent });
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await store.delete(key);
      else console.error("Push failed", key, error?.statusCode || error?.message);
    }
  }));
};

export const config: Config = { schedule: "* * * * *" };
