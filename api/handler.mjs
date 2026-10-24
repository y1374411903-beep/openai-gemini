export const config = {
  runtime: "edge",
};

export default async function handler(request, env, ctx) {
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(/\r?\n/).map((k) => k.trim()).filter(Boolean);

  if (keyList.length === 0) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 多行长凭证随机轮询
  const apiKey = keyList[Math.floor(Math.random() * keyList.length)];
  const incomingUrl = new URL(request.url);

  // 完美处理路径：无论 OpenWrite 怎么拼（带不带 /v1），都能正确映射到 Google 的标准接口
  let pathname = incomingUrl.pathname;
  if (pathname.startsWith("/v1")) {
    pathname = pathname.replace("/v1", "");
  }
  
  const targetUrl = new URL("https://generativelanguage.googleapis.com" + pathname + incomingUrl.search);

  const newHeaders = new Headers(request.headers);
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
