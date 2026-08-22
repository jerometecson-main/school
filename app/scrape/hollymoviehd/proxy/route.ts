import { NextRequest } from "next/server";

export const runtime = "nodejs";
const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  try {
    const target = new URL(url);

    if (
      target.hostname !== "goodstream.cc" ||
      !target.pathname.startsWith("/pl/")
    ) {
      return new Response("Invalid URL", { status: 403 });
    }

    const response = await fetch(target, {
      headers: {
        Accept: "*/*",
        Referer: "https://goodstream.cc/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response("Upstream error", {
        status: response.status,
      });
    }

    const playlist = await response.text();

    if (!playlist.startsWith("#EXTM3U")) {
      return new Response("Invalid playlist", { status: 415 });
    }

    const rewritten = playlist
      .split(/\r?\n/)
      .map((line) => {
        const value = line.trim();

        if (!value || value.startsWith("#")) {
          return line;
        }

        return SEGMENT_PROXY + encodeURIComponent(value);
      })
      .join("\n");

    return new Response(rewritten, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Proxy error", { status: 500 });
  }
}
