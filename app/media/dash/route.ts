import { NextRequest } from "next/server";
import { decryptUrl } from "@/lib/encryptor";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const urlParam = searchParams.get("url");
  const headerParam = searchParams.get("header");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
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

  const response = await fetch(baseUrl, { headers });

  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
    });
  }

  const proxyBase = `https://api1.zxcstream.xyz/media/dash/segment`;

  const query =
    `url=${encodeURIComponent(urlParam)}` +
    `&header=${encodeURIComponent(headerParam || "")}`;

  let mpd = await response.text();

  mpd = mpd.replace(/(<SegmentTemplate\b[^>]*?)(\/?>)/g, (_, prefix, end) => {
    prefix = prefix
      .replace(
        /initialization="([^"]+)"/,
        `initialization="${proxyBase}?file=$1&${query}"`,
      )
      .replace(/media="([^"]+)"/, `media="${proxyBase}?file=$1&${query}"`);

    return prefix + end;
  });

  return new Response(mpd, {
    headers: {
      "Content-Type": "application/dash+xml",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
