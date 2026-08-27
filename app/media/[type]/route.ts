import { NextRequest } from "next/server";
import { encryptUrl, decryptUrl } from "@/lib/encryptor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const requestUrl = new URL(request.url);

  const urlParam = requestUrl.searchParams.get("url");
  const headerParam = requestUrl.searchParams.get("header");
  const dashParam = requestUrl.searchParams.get("dash");

  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let target = urlParam;

  try {
    if (type === "mp4" || type === "segment" || type === "dash") {
      if (type === "segment" && dashParam === "1") {
        target = urlParam;
      } else {
        target = await decryptUrl(urlParam);
      }
    }
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  let headers: Record<string, string> = {};

  if (headerParam) {
    try {
      headers = JSON.parse(await decryptUrl(headerParam));
    } catch {
      return new Response("Invalid headers", { status: 400 });
    }
  }

  if (type === "mp4" || type === "segment") {
    const range = request.headers.get("Range");

    if (range) {
      headers.Range = range;
    }
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

  if (type === "m3u8") {
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

          return `${requestUrl.origin}/api/media/segment?url=${encodeURIComponent(
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

  // DASH - SegmentTemplate only
  if (type === "dash") {
    let mpd = await response.text();
    const baseUrl = new URL(target);

    mpd = mpd.replace(
      /(media|initialization)="([^"]+)"/g,
      (_, attribute, template) => {
        const segmentUrl = new URL(template, baseUrl).toString();

        return `${attribute}="${requestUrl.origin}/api/media/segment?url=${encodeURIComponent(
          segmentUrl,
        )}&header=${encodeURIComponent(headerParam || "")}&dash=1"`;
      },
    );

    return new Response(mpd, {
      status: response.status,
      headers: {
        "Content-Type": "application/dash+xml",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (type === "mp4" || type === "segment") {
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ||
          (type === "mp4" ? "video/mp4" : "video/mp4"),
        "Content-Length": response.headers.get("Content-Length") || "",
        "Content-Range": response.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}
// import { NextRequest } from "next/server";
// import { encryptUrl, decryptUrl } from "@/lib/encryptor";

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ type: string }> },
// ) {
//   const { type } = await params;
//   const requestUrl = new URL(request.url);

//   const urlParam = requestUrl.searchParams.get("url");
//   const headerParam = requestUrl.searchParams.get("header");

//   if (!urlParam) {
//     return new Response("Missing url", { status: 400 });
//   }

//   let target = urlParam;

//   try {
//     if (type === "mp4" || type === "segment") {
//       target = await decryptUrl(urlParam);
//     }
//   } catch {
//     return new Response("Invalid url", { status: 400 });
//   }

//   let headers: Record<string, string> = {};

//   if (headerParam) {
//     try {
//       headers = JSON.parse(await decryptUrl(headerParam));
//     } catch {
//       return new Response("Invalid headers", { status: 400 });
//     }
//   }

//   if (type === "mp4" || type === "segment") {
//     const range = request.headers.get("Range");

//     if (range) {
//       headers.Range = range;
//     }
//   }

//   const response = await fetch(target, { headers });

//   if (response.status === 429) {
//     return new Response("Upstream rate limited", {
//       status: 429,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Retry-After": response.headers.get("Retry-After") || "10",
//       },
//     });
//   }

//   if (type === "m3u8") {
//     const playlist = await response.text();
//     const baseUrl = new URL(target);

//     const rewritten = (
//       await Promise.all(
//         playlist.split("\n").map(async (line) => {
//           if (!line || line.startsWith("#")) {
//             return line;
//           }

//           const segmentUrl = new URL(line, baseUrl).toString();
//           const encryptedUrl = await encryptUrl(segmentUrl);

//           return `${requestUrl.origin}/api/media/segment?url=${encodeURIComponent(
//             encryptedUrl,
//           )}&header=${encodeURIComponent(headerParam || "")}`;
//         }),
//       )
//     ).join("\n");

//     return new Response(rewritten, {
//       status: response.status,
//       headers: {
//         "Content-Type": "application/vnd.apple.mpegurl",
//         "Access-Control-Allow-Origin": "*",
//       },
//     });
//   }

//   if (type === "mp4" || type === "segment") {
//     return new Response(response.body, {
//       status: response.status,
//       headers: {
//         "Content-Type":
//           response.headers.get("Content-Type") ||
//           (type === "mp4" ? "video/mp4" : "video/mp2t"),
//         "Content-Length": response.headers.get("Content-Length") || "",
//         "Content-Range": response.headers.get("Content-Range") || "",
//         "Accept-Ranges": "bytes",
//         "Access-Control-Allow-Origin": "*",
//       },
//     });
//   }

//   return new Response("Not Found", { status: 404 });
// }
