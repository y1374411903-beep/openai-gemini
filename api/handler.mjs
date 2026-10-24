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
  // 1. 读取你在 Vercel 配置的逗号分割多 Key 列表
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);

  // 如果没有配置多 Key，回退到原版逻辑
  if (keyList.length === 0) {
    return worker.fetch(request, env, ctx);
  }

  // 2. 打乱 Key 顺序，实现随机负载均衡
  const shuffledKeys = [...keyList].sort(() => Math.random() - 0.5);

  // 克隆请求体，防止重试时 body 流被提前消费
  let bodyBuffer = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyBuffer = await request.arrayBuffer();
  }

  let lastResponse = null;

  // 3. 轮流尝试；遇到 429 或 503 自动换下一个 Key 重试
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

      // 如果返回不是 429（限流）和 503（服务过载），说明成功，直接返回结果
      if (response.status !== 429 && response.status !== 503) {
        return response;
      }

      // 如果撞了 429，记录并自动换下一个 Key 继续重试
      lastResponse = response;
    } catch (e) {
      // 网络偶发异常继续尝试下一个 Key
    }
  }

  // 仅在全部 Key 都超额时才返回错误
  return (
    lastResponse ||
    new Response(JSON.stringify({ error: "All GEMINI_API_KEYs quota exceeded." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  );
}
