import { NextRequest } from "next/server";
import { decryptUrl } from "@/lib/encryptor";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const urlParam = searchParams.get("url");
  const headerParam = searchParams.get("header");
  const file = searchParams.get("file");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  if (!file) {
    return new Response("Missing file", { status: 400 });
  }

  let baseUrl: string;
  let headers: Record<string, string> = {};

  try {
    baseUrl = await decryptUrl(urlParam);

    if (headerParam) {
      headers = JSON.parse(await decryptUrl(headerParam));
    }
  } catch {
    return new Response("Invalid url or headers", { status: 400 });
  }

  const upstream = new URL(baseUrl);

  const upstreamBase =
    upstream.origin +
    upstream.pathname.substring(0, upstream.pathname.lastIndexOf("/") + 1);

  const filename = file.split("/").pop();

  if (!filename) {
    return new Response("Invalid file", { status: 400 });
  }

  const range = request.headers.get("Range");

  if (range) {
    headers.Range = range;
  }

  const response = await fetch(upstreamBase + filename, {
    headers,
  });

  if (!response.ok && response.status !== 206) {
    return new Response(await response.text(), {
      status: response.status,
    });
  }

  const outputHeaders = new Headers(response.headers);

  outputHeaders.set("Access-Control-Allow-Origin", "*");
  outputHeaders.set("Access-Control-Allow-Headers", "*");
  outputHeaders.set("Access-Control-Expose-Headers", "*");
  outputHeaders.set("Accept-Ranges", "bytes");
  outputHeaders.set("Cache-Control", "no-store");

  return new Response(response.body, {
    status: response.status,
    headers: outputHeaders,
  });
}
