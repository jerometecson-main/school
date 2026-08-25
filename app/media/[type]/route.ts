import { NextRequest } from "next/server";
import { encryptUrl, decryptUrl } from "@/lib/encryptor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  const url = new URL(request.url);

  let target = url.searchParams.get("url");
  const headerParam = url.searchParams.get("header");

  if (!target) {
    return new Response("Missing url", { status: 400 });
  }

  if (type === "mp4" || type === "segment") {
    try {
      target = await decryptUrl(target);
    } catch {
      return new Response("Invalid url", { status: 400 });
    }
  }

  let headers: Record<string, string> = {};

  try {
    if (headerParam) {
      headers = JSON.parse(await decryptUrl(headerParam));
    }
  } catch {
    return new Response("Invalid headers", { status: 400 });
  }

  const range = request.headers.get("Range");

  if (range && (type === "mp4" || type === "segment")) {
    headers.Range = range;
  }

  const res = await fetch(target, {
    headers,
  });

  if (res.status === 429) {
    return new Response("Upstream rate limited", {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Retry-After": res.headers.get("Retry-After") || "10",
      },
    });
  }

  // M3U8
  if (type === "m3u8") {
    const text = await res.text();
    const base = new URL(target);

    const playlist = (
      await Promise.all(
        text.split("\n").map(async (line) => {
          if (!line || line.startsWith("#")) {
            return line;
          }

          const segment = new URL(line, base).toString();
          const encrypted = await encryptUrl(segment);

          return `${url.origin}/api/media/segment?url=${encodeURIComponent(
            encrypted,
          )}&header=${encodeURIComponent(headerParam || "")}`;
        }),
      )
    ).join("\n");

    return new Response(playlist, {
      status: res.status,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // MP4
  if (type === "mp4") {
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "video/mp4",
        "Content-Length": res.headers.get("Content-Length") || "",
        "Content-Range": res.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Segment
  if (type === "segment") {
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "video/mp2t",
        "Content-Length": res.headers.get("Content-Length") || "",
        "Content-Range": res.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}
