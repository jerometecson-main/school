import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36";

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

    const parts = target.pathname.split("/");
    const embedId = parts[2];

    if (!embedId) {
      return new Response("Missing embed ID", { status: 400 });
    }

    const e = target.searchParams.get("e");

    const refererUrl = new URL(`https://goodstream.cc/embed/${embedId}`);

    if (e) {
      refererUrl.searchParams.set("e", e);
    }

    console.log("[goodstream] target:", target.toString());
    console.log("[goodstream] referer:", refererUrl.toString());

    const { stdout } = await execFileAsync("curl", [
      "-sS",
      "--compressed",
      target.toString(),
      "-H",
      `Referer: ${refererUrl.toString()}`,
      "-H",
      `User-Agent: ${USER_AGENT}`,
    ]);

    const playlist = stdout;

    console.log("[goodstream] playlist:", playlist.slice(0, 100));

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
