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

  // 随机轮询多 Key
  const apiKey = keyList[Math.floor(Math.random() * keyList.length)];

  const incomingUrl = new URL(request.url);
  
  // 目标指向 Google 官方 Gemini 地址，并保留原本的路径（如 /v1/models 或 /v1/chat/completions）
  const targetUrl = new URL("https://generativelanguage.googleapis.com" + incomingUrl.pathname + incomingUrl.search);

  const newHeaders = new Headers(request.headers);
  // 同时兼容 OpenAI 格式和 Google 格式的 Key 传递
  newHeaders.set("x-goog-api-key", apiKey);
  newHeaders.set("Authorization", `Bearer ${apiKey}`);
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
