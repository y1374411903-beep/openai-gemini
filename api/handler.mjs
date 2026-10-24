import worker from "../src/worker.mjs";

export const config = {
  runtime: "edge",
  regions: [
    "arn1",
    "bom1",
    "cdg1",
    "cle1",
    "cpt1",
    "dub1",
    "fra1",
    "gru1",
    "hnd1",
    "iad1",
    "icn1",
    "kix1",
    "lhr1",
    "pdx1",
    "sfo1",
    "sin1",
    "syd1",
  ],
};

export default async function handler(request, env, ctx) {
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean);

  if (keyList.length === 0) {
    return worker.fetch(request, env, ctx);
  }

  const shuffledKeys = [...keyList].sort(() => Math.random() - 0.5);

  let bodyBuffer = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyBuffer = await request.arrayBuffer();
  }

  let lastResponse = null;

  for (const key of shuffledKeys) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set("Authorization", `Bearer ${key}`);

    const newRequest = new Request(request.url, {
      method: request.method,
      headers: newHeaders,
      body: bodyBuffer,
      redirect: request.redirect,
    });

    try {
      const response = await worker.fetch(newRequest, env, ctx);

      if (response.status !== 429 && response.status !== 503) {
        return response;
      }

      lastResponse = response;
    } catch (e) {
    }
  }

  return (
    lastResponse ||
    new Response(JSON.stringify({ error: "All GEMINI_API_KEYs quota exceeded." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  );
}
