export const config = {
  runtime: "edge",
};

export default async function handler(request, env, ctx) {
  // 严格按换行符拆分多行长凭证，并过滤掉空行
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(/\r?\n/).map((k) => k.trim()).filter(Boolean);

  if (keyList.length === 0) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY in environment variables" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 实现多 Key 随机轮询负载均衡
  const apiKey = keyList[Math.floor(Math.random() * keyList.length)];
  const incomingUrl = new URL(request.url);

  // 完美对接 Google 的 OpenAI 兼容端点
  const targetUrl = new URL("https://generativelanguage.googleapis.com" + incomingUrl.pathname + incomingUrl.search);

  const newHeaders = new Headers(request.headers);
  // 携带选中的那一行长凭证进行 Bearer 鉴权
  newHeaders.set("Authorization", `Bearer ${apiKey}`);
  newHeaders.delete("x-goog-api-key");
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
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    return newResponse;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
