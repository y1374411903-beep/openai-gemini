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
  // 1. 读取你在 Vercel 配置的多行/逗号分割 Key 列表
  const rawKeys = process.env.GEMINI_API_KEY || (env && env.GEMINI_API_KEY) || "";
  const keyList = rawKeys.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean);

  if (keyList.length === 0) {
    return worker.fetch(request, env, ctx);
  }

  // 2. 随机抽取一个 Key 实现轮转负载均衡
  const randomKey = keyList[Math.floor(Math.random() * keyList.length)];

  // 3. 只替换 Authorization 头，完全保留原生的 request.body 流，绝不触发流损坏！
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Authorization", `Bearer ${randomKey}`);

  const newRequest = new Request(request, {
    headers: newHeaders,
  });

  return worker.fetch(newRequest, env, ctx);
}
