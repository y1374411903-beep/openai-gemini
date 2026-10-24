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

  // 多 Key 随机轮询防限流
  const apiKey = keyList[Math.floor(Math.random() * keyList.length)];

  const incomingUrl = new URL(request.url);
  
  // 完美对接 Google 的 OpenAI 兼容端点，保留所有子路径（如 /v1/chat/completions 等）
  let targetPath = incomingUrl.pathname;
  const targetUrl = new URL("https://generativelanguage.googleapis.com/v1beta/openai" + targetPath + incomingUrl.search);

  const newHeaders = new Headers(request.headers);
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
