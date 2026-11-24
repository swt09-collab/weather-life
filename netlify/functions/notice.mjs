// 공지 내용·속도를 서버(Netlify Blobs)에 저장하고 읽어 주는 함수
// 주소: /.netlify/functions/notice
//   GET  ?key=학교이름        → { found, notice, speed, updatedAt }
//   POST { key, notice, speed, pin } → { ok, updatedAt }
// 저장 암호를 쓰려면 Netlify 사이트 설정 > Environment variables 에 NOTICE_PIN 을 등록하세요 (없으면 누구나 저장 가능).
import { getStore } from "@netlify/blobs";

const SPEEDS = ["slow", "normal", "fast", "veryfast"];
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const keyOf = (k) => "school-" + encodeURIComponent(String(k || "default").trim().slice(0, 60));

export default async (req) => {
  const store = getStore("notice");

  if (req.method === "GET") {
    const url = new URL(req.url);
    const rec = await store.get(keyOf(url.searchParams.get("key")), { type: "json" });
    return json(rec ? { found: true, ...rec } : { found: false });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
    const pin = process.env.NOTICE_PIN;
    if (pin && String(body.pin || "") !== pin) return json({ ok: false, error: "bad pin" }, 401);
    const notice = String(body.notice ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    const speed = SPEEDS.includes(body.speed) ? body.speed : "normal";
    const updatedAt = Date.now();
    await store.setJSON(keyOf(body.key), { notice, speed, updatedAt });
    return json({ ok: true, updatedAt });
  }

  return json({ ok: false, error: "method not allowed" }, 405);
};
