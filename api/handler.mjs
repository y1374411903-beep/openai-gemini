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

  let pathname = incomingUrl.pathname;

  // 智能纠错：如果 OpenWrite 把路径变成了中文或乱码（如 /v1/聊天/完成），强制修正为标准聊天接口
  if (pathname.includes("聊天") || pathname.includes("完成") || pathname.includes("chat")) {
    pathname = "/v1/chat/completions";
  } else if (pathname.includes("models") || pathname.includes("模型")) {
    pathname = "/v1/models";
  }

  // 去除多余的重复 /v1 前缀
  pathname = pathname.replace(/\/v1\/v1/g, "/v1");

  // 完美对接到 Google Gemini 的 OpenAI 兼容端点
  const targetUrl = new URL("https://generativelanguage.googleapis.com/v1beta/openai" + pathname.replace("/v1", "") + incomingUrl.search);

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
