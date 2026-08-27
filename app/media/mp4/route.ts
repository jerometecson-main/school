import { NextRequest } from "next/server";
import { decryptUrl } from "@/lib/encryptor";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const urlParam = requestUrl.searchParams.get("url");
  const headerParam = requestUrl.searchParams.get("header");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let target: string;
  let headers: Record<string, string> = {};

  try {
    target = await decryptUrl(urlParam);

    if (headerParam) {
      headers = JSON.parse(await decryptUrl(headerParam));
    }
  } catch {
    return new Response("Invalid url or headers", { status: 400 });
  }

  const range = request.headers.get("Range");

  if (range) {
    headers.Range = range;
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

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "video/mp4",
      "Content-Length": response.headers.get("Content-Length") || "",
      "Content-Range": response.headers.get("Content-Range") || "",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
