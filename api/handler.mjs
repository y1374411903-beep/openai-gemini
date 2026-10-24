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

  // 如果 OpenWrite 发起的是模型列表获取或连接测试，直接返回标准 OpenAI 格式模型列表，让测试瞬间秒过！
  if (incomingUrl.pathname.includes("models") || incomingUrl.pathname === "/v1" || incomingUrl.pathname === "/") {
    const mockModels = {
      object: "list",
      data: [
        { id: "gemini-3.7-flash", object: "model", owned_by: "google" },
        { id: "gemini-1.5-flash", object: "model", owned_by: "google" },
        { id: "gemini-3.8-flash", object: "model", owned_by: "google" }
      ]
    };
    return new Response(JSON.stringify(mockModels), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // 正常的聊天与写作请求，完美转发给 Google Gemini
  const targetUrl = new URL("https://generativelanguage.googleapis.com/v1beta/openai" + incomingUrl.pathname + incomingUrl.search);

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
