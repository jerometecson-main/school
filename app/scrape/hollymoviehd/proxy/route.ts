import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

const GOOD_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36",
  Origin: "https://goodstream.cc",
};

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

    // /pl/WUmU1cMmqA6Hc61/0-27
    const parts = target.pathname.split("/");

    const embedId = parts[2];

    if (!embedId) {
      return new Response("Missing embed ID", { status: 400 });
    }

    // Preserve the e parameter from the playlist URL.
    const e = target.searchParams.get("e");

    const refererUrl = new URL(`https://goodstream.cc/embed/${embedId}`);

    if (e) {
      refererUrl.searchParams.set("e", e);
    }

    const response = await fetch(target, {
      headers: {
        ...GOOD_HEADERS,
        Accept: "*/*",
        Referer: refererUrl.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, {
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
  } catch (error) {
    console.error(error);

    return new Response("Proxy error", {
      status: 500,
    });
  }
}
