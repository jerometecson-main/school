import { NextRequest } from "next/server";
import { decryptUrl } from "@/lib/encryptor";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const urlParam = searchParams.get("url");
  const headerParam = searchParams.get("header");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let mpdUrl: string;
  let headers: Record<string, string> = {};

  try {
    mpdUrl = await decryptUrl(urlParam);

    if (headerParam) {
      headers = JSON.parse(await decryptUrl(headerParam));
    }
  } catch {
    return new Response("Invalid url or headers", { status: 400 });
  }

  const response = await fetch(mpdUrl, { headers });

  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
    });
  }

  let mpd = await response.text();

  const cookie = headers.Cookie || headers.cookie || "";
  const params = new URLSearchParams();

  for (const part of cookie.split(";")) {
    const [key, ...values] = part.trim().split("=");

    if (!key || !values.length) continue;

    const value = values.join("=");

    if (key === "CloudFront-Policy") {
      params.set("Policy", value);
    } else if (key === "CloudFront-Signature") {
      params.set("Signature", value);
    } else if (key === "CloudFront-Key-Pair-Id") {
      params.set("Key-Pair-Id", value);
    }
  }

  const baseUrl = new URL(mpdUrl);
  baseUrl.pathname = baseUrl.pathname.substring(
    0,
    baseUrl.pathname.lastIndexOf("/") + 1,
  );
  baseUrl.search = "";

  mpd = mpd.replace(
    /(\b(?:initialization|media)=")([^"]+)"/g,
    (_, prefix, value) => {
      if (/^https?:\/\//i.test(value)) {
        return `${prefix}${value}"`;
      }

      const segmentUrl = new URL(value.split("?")[0], baseUrl);
      segmentUrl.search = params.toString();

      return `${prefix}${segmentUrl.href}"`;
    },
  );

  return new Response(mpd, {
    headers: {
      "Content-Type": "application/dash+xml",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
