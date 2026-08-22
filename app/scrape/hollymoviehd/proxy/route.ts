import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const customReferer = req.nextUrl.searchParams.get("referer");

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

    /*
     * /pl/WUmU1cMmqA6Hc61/0-27
     *       ↑
     *       embed ID
     */
    const parts = target.pathname.split("/");
    const embedId = parts[2];

    if (!embedId) {
      return new Response("Missing embed ID", { status: 400 });
    }

    let refererUrl: string;

    /*
     * If a referer was explicitly supplied, use it.
     * Otherwise generate it from the /pl/ URL.
     */
    if (customReferer) {
      const parsedReferer = new URL(customReferer);

      if (
        parsedReferer.hostname !== "goodstream.cc" ||
        !parsedReferer.pathname.startsWith("/embed/")
      ) {
        return new Response("Invalid referer", { status: 403 });
      }

      refererUrl = parsedReferer.toString();
    } else {
      const e = target.searchParams.get("e");

      const generatedReferer = new URL(
        `https://goodstream.cc/embed/${embedId}`,
      );

      if (e) {
        generatedReferer.searchParams.set("e", e);
      }

      refererUrl = generatedReferer.toString();
    }

    console.log("[goodstream] target:", target.toString());
    console.log("[goodstream] referer:", refererUrl);

    const response = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "*/*",
        Origin: "https://goodstream.cc",
        Referer: refererUrl,
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });

    console.log(
      "[goodstream] upstream:",
      response.status,
      response.headers.get("content-type"),
    );

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, {
        status: response.status,
      });
    }

    const playlist = await response.text();

    console.log("[goodstream] playlist:", playlist.slice(0, 150));

    if (!playlist.trimStart().startsWith("#EXTM3U")) {
      return new Response("Invalid playlist", {
        status: 415,
      });
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
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[goodstream] error:", error);

    return new Response("Proxy error", {
      status: 500,
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
