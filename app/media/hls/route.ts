import { NextRequest } from "next/server";
import { encryptUrl, decryptUrl } from "@/lib/encryptor";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const urlParam = requestUrl.searchParams.get("url");
  const headerParam = requestUrl.searchParams.get("header");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let target = urlParam;
  let headers: Record<string, string> = {};

  try {
    target = await decryptUrl(urlParam);

    if (headerParam) {
      headers = JSON.parse(await decryptUrl(headerParam));
    }
  } catch {
    return new Response("Invalid url or headers", { status: 400 });
  }

  const response = await fetch(target, { headers });

  if (response.status === 429) {
    return new Response("Upstream rate limited", {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Retry-After": response.headers.get("Retry-After") || "10",
      },
    });
  }

  const playlist = await response.text();
  const baseUrl = new URL(target);

  const rewritten = (
    await Promise.all(
      playlist.split("\n").map(async (line) => {
        if (!line || line.startsWith("#")) {
          return line;
        }

        const segmentUrl = new URL(line, baseUrl).toString();
        const encryptedUrl = await encryptUrl(segmentUrl);

        return `https://api1.zxcstream.xyz/media/hls/segment?file=${encodeURIComponent(
          encryptedUrl,
        )}&header=${encodeURIComponent(headerParam || "")}`;
      }),
    )
  ).join("\n");

  return new Response(rewritten, {
    status: response.status,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
