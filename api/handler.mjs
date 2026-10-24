export const config = {
  runtime: "edge",
};

export default async function handler(request, env, ctx) {
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);

  if (keyList.length === 0) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = keyList[Math.floor(Math.random() * keyList.length)];
  const incomingUrl = new URL(request.url);

  // 标准的官方 Gemini 转发网关
  const targetUrl = new URL("https://generativelanguage.googleapis.com" + incomingUrl.pathname + incomingUrl.search);

  const newHeaders = new Headers(request.headers);
  newHeaders.set("x-goog-api-key", apiKey);
  newHeaders.delete("Authorization");
  newHeaders.delete("Host");

  let bodyBuffer = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyBuffer = await request.arrayBuffer();
  }

  const targetRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: bodyBuffer,
    redirect: "follow",
  });

  try {
    const response = await fetch(targetRequest);
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
