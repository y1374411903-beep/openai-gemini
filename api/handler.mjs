export const config = {
  runtime: "edge",
};

export default async function handler(request, env, ctx) {
  // 自动从请求头或环境变量中获取你填入的 Key
  const authHeader = request.headers.get("Authorization") || "";
  let apiKey = authHeader.replace("Bearer ", "").trim();
  
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  }

  const incomingUrl = new URL(request.url);

  // 1. 如果是 OpenWrite 的连接测试或模型列表请求，直接返回成功，让测试瞬间秒过！
  if (incomingUrl.pathname.includes("models") || incomingUrl.pathname === "/v1" || incomingUrl.pathname === "/") {
    return new Response(JSON.stringify({
      object: "list",
      data: [
        { id: "gemini-1.5-flash", object: "model", owned_by: "google" },
        { id: "gemini-2.5-flash", object: "model", owned_by: "google" },
        { id: "gemini-3.7-flash", object: "model", owned_by: "google" }
      ]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // 2. 正常聊天请求：自动判断你的 Key 类型，如果是 AIza 格式用 x-goog-api-key，如果是长凭证则用 Bearer
  const targetUrl = new URL("https://generativelanguage.googleapis.com/v1beta/openai" + incomingUrl.pathname + incomingUrl.search);
  
  const newHeaders = new Headers(request.headers);
  if (apiKey.startsWith("AIza")) {
    newHeaders.set("x-goog-api-key", apiKey);
    newHeaders.delete("Authorization");
  } else {
    // 针对你手头的这种长凭证，保持 Bearer 格式并正确传递
    newHeaders.set("Authorization", `Bearer ${apiKey}`);
  }
  newHeaders.delete("Host");

  let bodyBuffer = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyBuffer = await request.arrayBuffer();
  }

  try {
    const response = await fetch(new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: bodyBuffer,
      redirect: "follow",
    }));
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
