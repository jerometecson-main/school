//with 429 detector

import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const CACHE_DIR = "/home/deploy/cache";

const SEGMENT_PROXY = "https://odd-wind-9c3b.expired2.workers.dev/?url=";
// const SEGMENT_PROXY = "https://dark-cherry-6a91.onion1-15b.workers.dev/?url=";
// https: const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36";

// Goodstream cooldown.
// Cached playlists are still served during cooldown.
let goodstreamCooldownUntil = 0;

const GOODSTREAM_COOLDOWN = 10_000;

// Prevent multiple uncached requests from hitting Goodstream at once.
let goodstreamRequestInProgress = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const target = new URL(url);

    if (
      target.hostname !== "goodstream.cc" ||
      !target.pathname.startsWith("/pl/")
    ) {
      return new Response("Invalid URL", {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const parts = target.pathname.split("/");
    const embedId = parts[2];

    if (!embedId) {
      return new Response("Missing embed ID", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const e = target.searchParams.get("e");

    const refererUrl = new URL(`https://goodstream.cc/embed/${embedId}`);

    if (e) {
      refererUrl.searchParams.set("e", e);
    }

    await mkdir(CACHE_DIR, {
      recursive: true,
    });

    const cacheKey = createHash("sha256")
      .update(target.toString())
      .digest("hex");

    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.m3u8`);

    let playlist: string;

    /*
     * --------------------------------------------------
     * CACHE FIRST
     * --------------------------------------------------
     */

    try {
      playlist = await readFile(cacheFile, "utf8");

      if (!playlist.trimStart().startsWith("#EXTM3U")) {
        throw new Error("Invalid cached playlist");
      }

      // IMPORTANT:
      // Cache is served even when Goodstream is on cooldown.
      console.log("[goodstream] cache hit:", embedId);
    } catch {
      /*
       * --------------------------------------------------
       * NO CACHE
       * --------------------------------------------------
       */

      // Goodstream is currently rate limited.
      // Immediately reject uncached requests.
      if (Date.now() < goodstreamCooldownUntil) {
        console.log("[goodstream] cooldown 429:", embedId);

        return new Response("Goodstream rate limited", {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": "10",
          },
        });
      }

      // Another uncached request is already contacting Goodstream.
      // Do not queue this request.
      if (goodstreamRequestInProgress) {
        console.log("[goodstream] request busy 429:", embedId);

        return new Response("Goodstream busy", {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": "10",
          },
        });
      }

      goodstreamRequestInProgress = true;

      console.log("[goodstream] cache miss:", embedId);

      try {
        /*
         * --------------------------------------------------
         * FETCH GOODSTREAM
         * --------------------------------------------------
         */

        let stdout: string;

        try {
          const result = await execFileAsync("curl", [
            "-sS",
            "--compressed",

            target.toString(),

            "-H",
            "Accept: */*",

            "-H",
            "Origin: https://goodstream.cc",

            "-H",
            `Referer: ${refererUrl.toString()}`,

            "-H",
            `User-Agent: ${USER_AGENT}`,

            "-w",
            "\n__HTTP_STATUS__:%{http_code}",
          ]);

          stdout = result.stdout;
        } catch (error: any) {
          const output = error?.stdout || "";

          const statusMatch = output.match(/__HTTP_STATUS__:(\d{3})\s*$/);

          if (statusMatch) {
            const status = Number(statusMatch[1]);

            if (status === 429) {
              goodstreamCooldownUntil = Date.now() + GOODSTREAM_COOLDOWN;

              console.log("[goodstream] 429 cooldown started");

              return new Response("Goodstream rate limited", {
                status: 429,
                headers: {
                  ...CORS_HEADERS,
                  "Retry-After": "10",
                },
              });
            }

            return new Response(`Upstream error: ${status}`, {
              status,
              headers: CORS_HEADERS,
            });
          }

          console.error("[goodstream] curl error:", error);

          return new Response("Upstream connection error", {
            status: 502,
            headers: CORS_HEADERS,
          });
        }

        /*
         * --------------------------------------------------
         * READ HTTP STATUS
         * --------------------------------------------------
         */

        const statusMatch = stdout.match(/__HTTP_STATUS__:(\d{3})\s*$/);

        if (!statusMatch) {
          return new Response("Invalid upstream response", {
            status: 502,
            headers: CORS_HEADERS,
          });
        }

        const upstreamStatus = Number(statusMatch[1]);

        const markerIndex = stdout.lastIndexOf("\n__HTTP_STATUS__:");

        playlist = markerIndex === -1 ? stdout : stdout.slice(0, markerIndex);

        /*
         * --------------------------------------------------
         * 429 DETECTOR
         * --------------------------------------------------
         */

        if (upstreamStatus === 429) {
          goodstreamCooldownUntil = Date.now() + GOODSTREAM_COOLDOWN;

          console.log("[goodstream] 429 cooldown started");

          return new Response("Goodstream rate limited", {
            status: 429,
            headers: {
              ...CORS_HEADERS,
              "Retry-After": "10",
            },
          });
        }

        /*
         * --------------------------------------------------
         * OTHER UPSTREAM ERRORS
         * --------------------------------------------------
         */

        if (upstreamStatus < 200 || upstreamStatus >= 300) {
          return new Response(`Upstream error: ${upstreamStatus}`, {
            status: upstreamStatus,
            headers: CORS_HEADERS,
          });
        }

        /*
         * --------------------------------------------------
         * VALIDATE PLAYLIST
         * --------------------------------------------------
         */

        if (!playlist.trimStart().startsWith("#EXTM3U")) {
          return new Response("Invalid playlist", {
            status: 415,
            headers: CORS_HEADERS,
          });
        }

        /*
         * --------------------------------------------------
         * SAVE ORIGINAL PLAYLIST
         * --------------------------------------------------
         */

        await writeFile(cacheFile, playlist, "utf8");

        console.log("[goodstream] original playlist cached:", embedId);
      } finally {
        // Never leave the lock stuck if curl/writeFile throws.
        goodstreamRequestInProgress = false;
      }
    }

    /*
     * --------------------------------------------------
     * REWRITE PLAYLIST
     * --------------------------------------------------
     */

    const rewritten = playlist
      .split(/\r?\n/)
      .map((line) => {
        const value = line.trim();

        if (!value || value.startsWith("#")) {
          return line;
        }

        let absoluteUrl: URL;

        try {
          absoluteUrl = new URL(value, target);
        } catch {
          return line;
        }

        /*
         * Another Goodstream playlist.
         */
        if (
          absoluteUrl.hostname === "goodstream.cc" &&
          absoluteUrl.pathname.startsWith("/pl/")
        ) {
          return `/scrape/hollymoviehd/proxy?url=${encodeURIComponent(
            absoluteUrl.toString(),
          )}`;
        }

        /*
         * Actual media segment.
         */
        return SEGMENT_PROXY + encodeURIComponent(absoluteUrl.toString());
      })
      .join("\n");

    /*
     * --------------------------------------------------
     * RETURN PLAYLIST
     * --------------------------------------------------
     */

    return new Response(rewritten, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[goodstream] error:", error);

    return new Response("Proxy error", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

//cache using storage
// import { NextRequest } from "next/server";
// import { execFile } from "child_process";
// import { promisify } from "util";
// import { createHash } from "crypto";
// import { mkdir, readFile, writeFile } from "fs/promises";
// import path from "path";

// export const runtime = "nodejs";

// const execFileAsync = promisify(execFile);

// const CACHE_DIR = path.join(process.cwd(), "cache");

// const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

// const USER_AGENT =
//   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36";

// export async function GET(req: NextRequest) {
//   const url = req.nextUrl.searchParams.get("url");

//   if (!url) {
//     return new Response("Missing url", { status: 400 });
//   }

//   try {
//     const target = new URL(url);

//     if (
//       target.hostname !== "goodstream.cc" ||
//       !target.pathname.startsWith("/pl/")
//     ) {
//       return new Response("Invalid URL", { status: 403 });
//     }

//     const parts = target.pathname.split("/");
//     const embedId = parts[2];

//     if (!embedId) {
//       return new Response("Missing embed ID", { status: 400 });
//     }

//     const e = target.searchParams.get("e");

//     const refererUrl = new URL(`https://goodstream.cc/embed/${embedId}`);

//     if (e) {
//       refererUrl.searchParams.set("e", e);
//     }

//     await mkdir(CACHE_DIR, {
//       recursive: true,
//     });

//     const cacheKey = createHash("sha256")
//       .update(target.toString())
//       .digest("hex");

//     const cacheFile = path.join(CACHE_DIR, `${cacheKey}.m3u8`);

//     let playlist: string;

//     // Try original playlist cache first.
//     try {
//       playlist = await readFile(cacheFile, "utf8");

//       if (!playlist.trimStart().startsWith("#EXTM3U")) {
//         throw new Error("Invalid cached playlist");
//       }

//       console.log("[goodstream] cache hit:", embedId);
//     } catch {
//       console.log("[goodstream] cache miss:", embedId);

//       console.log("[goodstream] target:", target.toString());
//       console.log("[goodstream] referer:", refererUrl.toString());

//       const { stdout } = await execFileAsync("curl", [
//         "-sS",
//         "--compressed",
//         target.toString(),
//         "-H",
//         "Accept: */*",
//         "-H",
//         "Origin: https://goodstream.cc",
//         "-H",
//         `Referer: ${refererUrl.toString()}`,
//         "-H",
//         `User-Agent: ${USER_AGENT}`,
//       ]);

//       playlist = stdout;

//       if (!playlist.trimStart().startsWith("#EXTM3U")) {
//         return new Response("Invalid playlist", {
//           status: 415,
//         });
//       }

//       // Save ORIGINAL playlist before rewriting.
//       await writeFile(cacheFile, playlist, "utf8");

//       console.log("[goodstream] original playlist cached:", embedId);
//     }

//     // Rewrite only when returning the playlist.
//     const rewritten = playlist
//       .split(/\r?\n/)
//       .map((line) => {
//         const value = line.trim();

//         if (!value || value.startsWith("#")) {
//           return line;
//         }

//         let absoluteUrl: URL;

//         try {
//           absoluteUrl = new URL(value, target);
//         } catch {
//           return line;
//         }

//         // Another Goodstream playlist.
//         if (
//           absoluteUrl.hostname === "goodstream.cc" &&
//           absoluteUrl.pathname.startsWith("/pl/")
//         ) {
//           return `/scrape/hollymoviehd/proxy?url=${encodeURIComponent(
//             absoluteUrl.toString(),
//           )}`;
//         }

//         // Actual media segment.
//         return SEGMENT_PROXY + encodeURIComponent(absoluteUrl.toString());
//       })
//       .join("\n");

//     return new Response(rewritten, {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.apple.mpegurl",
//         "Cache-Control": "no-store",
//         "Access-Control-Allow-Origin": "*",
//       },
//     });
//   } catch (error) {
//     console.error("[goodstream] error:", error);

//     return new Response("Proxy error", {
//       status: 500,
//     });
//   }
// }

//curl approach
// import { NextRequest } from "next/server";
// import { execFile } from "child_process";
// import { promisify } from "util";

// export const runtime = "nodejs";

// const execFileAsync = promisify(execFile);

// const SEGMENT_PROXY = "https://segment.expired1.workers.dev/?url=";

// const USER_AGENT =
//   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36";

// export async function GET(req: NextRequest) {
//   const url = req.nextUrl.searchParams.get("url");

//   if (!url) {
//     return new Response("Missing url", { status: 400 });
//   }

//   try {
//     const target = new URL(url);

//     if (
//       target.hostname !== "goodstream.cc" ||
//       !target.pathname.startsWith("/pl/")
//     ) {
//       return new Response("Invalid URL", { status: 403 });
//     }

//     const parts = target.pathname.split("/");
//     const embedId = parts[2];

//     if (!embedId) {
//       return new Response("Missing embed ID", { status: 400 });
//     }

//     const e = target.searchParams.get("e");

//     const refererUrl = new URL(`https://goodstream.cc/embed/${embedId}`);

//     if (e) {
//       refererUrl.searchParams.set("e", e);
//     }

//     console.log("[goodstream] target:", target.toString());
//     console.log("[goodstream] referer:", refererUrl.toString());

//     const { stdout } = await execFileAsync("curl", [
//       "-sS",
//       "--compressed",
//       target.toString(),
//       "-H",
//       `Referer: ${refererUrl.toString()}`,
//       "-H",
//       `User-Agent: ${USER_AGENT}`,
//     ]);

//     const playlist = stdout;

//     console.log("[goodstream] playlist:", playlist.slice(0, 100));

//     if (!playlist.trimStart().startsWith("#EXTM3U")) {
//       return new Response("Invalid playlist", {
//         status: 415,
//       });
//     }

//     const rewritten = playlist
//       .split(/\r?\n/)
//       .map((line) => {
//         const value = line.trim();

//         if (!value || value.startsWith("#")) {
//           return line;
//         }

//         let absoluteUrl: URL;

//         try {
//           absoluteUrl = new URL(value, target);
//         } catch {
//           return line;
//         }

//         /*
//          * Another Goodstream playlist.
//          * Send it through this Next.js proxy again.
//          */
//         if (
//           absoluteUrl.hostname === "goodstream.cc" &&
//           absoluteUrl.pathname.startsWith("/pl/")
//         ) {
//           return `/scrape/hollymoviehd/proxy?url=${encodeURIComponent(
//             absoluteUrl.toString(),
//           )}`;
//         }

//         /*
//          * Actual media segment.
//          * Send it through the segment worker.
//          */
//         return SEGMENT_PROXY + encodeURIComponent(absoluteUrl.toString());
//       })
//       .join("\n");

//     return new Response(rewritten, {
//       status: 200,
//       headers: {
//         "Content-Type": "application/vnd.apple.mpegurl",
//         "Cache-Control": "no-store",
//         "Access-Control-Allow-Origin": "*",
//       },
//     });
//   } catch (error) {
//     console.error("[goodstream] error:", error);

//     return new Response("Proxy error", {
//       status: 500,
//     });
//   }
// }
