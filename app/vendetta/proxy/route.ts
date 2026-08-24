//with 429 detector

import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { decryptUrl, encryptUrl } from "@/lib/encryptor";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const CACHE_DIR = "/home/deploy/cache";

const SEGMENT_PROXIES = [
  "https://rapid-mountain-88b5.cabbage17.workers.dev/",
  "https://segment.expired1.workers.dev/",
  "https://dawn-surf-3fd4.cabbag16.workers.dev/",
  "https://dark-cherry-6a91.onion1-15b.workers.dev/",
  "https://odd-wind-9c3b.expired2.workers.dev/",
  "https://weathered-bar-2ae0.carrot1.workers.dev/",
  "https://little-bird-702a.carrot2.workers.dev/",
  "https://soft-tree-cf19.carrot3.workers.dev/",
  "https://round-wave-420a.carrot4.workers.dev/",
  "https://restless-night-5882.carrot5.workers.dev/",
  "https://sweet-breeze-2630.carrot6.workers.dev/",
  "https://purple-cake-7e15.carrot7.workers.dev/",
  "https://jolly-butterfly-081a.carrot8.workers.dev/",
  "https://curly-surf-ddc0.carrot9.workers.dev/",
  "https://steep-meadow-bbeb.carrot10.workers.dev/",
  "https://young-cherry-ce34.carrot11.workers.dev/",
  "https://wild-math-4113.carrot12.workers.dev/",
  "https://restless-frost-4949.carrot13.workers.dev/",
  "https://raspy-firefly-a523.carrot14.workers.dev/",
  "https://square-paper-11d3.carrot15.workers.dev/",
  "https://red-dawn-bf1d.carrot16.workers.dev/",
  "https://lively-rain-6889.carrot17.workers.dev/",
  "https://summer-salad-552a.carrot18.workers.dev/",
  "https://quiet-paper-8f9c.carrot19.workers.dev/",
  "https://purple-sea-e132.carrot20.workers.dev/",
  //

  "https://odd-wind-9c3b.expired2.workers.dev/",
  "https://curly-union-6ce7.expired3.workers.dev/",
  "https://fancy-firefly-569e.expired4.workers.dev/",
  "https://rapid-waterfall-1d25.expired5.workers.dev/",

  "https://purple-thunder-0eb4.wubbalubbadubdub19.workers.dev/",
  "https://square-dust-80f5.wubbalubbadubdub02.workers.dev/",
  "https://curly-bird-930d.wubbalubbadubdub01.workers.dev/",
  "https://patient-wildflower-6f28.wubbalubbadubdub03.workers.dev/",

  "https://black-meadow-49fd.wubbalubbadubdub04.workers.dev/",
  "https://tight-block-7a4d.wubbalubbadubdub05.workers.dev/",
  "https://curly-mud-ddfd.wubbalubbadubdub06.workers.dev/",
  "https://empty-math-17a7.wubbalubbadubdub07.workers.dev/",

  "https://white-bread-be62.wubbalubbadubdub08.workers.dev/",
  "https://blue-sun-21d4.wubbalubbadubdub09.workers.dev/",
  "https://young-feather-228d.wubbalubbadubdub010.workers.dev/",
  "https://nameless-grass-79ed.test15-e6c.workers.dev/",

  "https://noisy-forest-7049.test8-98b.workers.dev/",
  "https://broken-silence-4b06.test14-b67.workers.dev/",
  "https://ancient-dream-4f1b.test13-ab8.workers.dev/",
  "https://dark-forest-d6c1.test14-b67.workers.dev/",

  "https://gentle-cloud-7dfe.test12-3d3.workers.dev/",
  "https://divine-firefly-ad26.test11-a1b.workers.dev/",
  "https://floral-meadow-f3a7.test5-9ab.workers.dev/",
  "https://wispy-wind-4a50.test7-337.workers.dev/",
  // "https://royal-mud-a500.test9-6da.workers.dev/",
  // "https://twilight-limit-cf88.test6-cb9.workers.dev/",
  // "https://square-sky-2f86.test26-ee5.workers.dev/",
  // "https://red-lake-0545.test25-30d.workers.dev/",
  // "https://plain-lab-17af.test24-6ad.workers.dev/",
  // "https://small-wood-adba.test23-515.workers.dev/",
  // "https://dawn-field-efbb.test22-f82.workers.dev/",
  // "https://rapid-rain-1898.test21-0af.workers.dev/",
  // "https://blue-sun-2b6e.test20-5b4.workers.dev/",
  // "https://broken-paper-2e14.test19-31a.workers.dev/",
  // "https://polished-rice-b094.test18-8cb.workers.dev/",
  // "https://soft-bread-864e.test16-011.workers.dev/",
  // "https://dry-moon-e266.test66-8cc.workers.dev/",
  // "https://fragrant-rice-8998.test65-8de.workers.dev/",
  // "https://restless-resonance-a8a8.test63-bfc.workers.dev/",
  // "https://nameless-tooth-8cbb.test64-0d5.workers.dev/",
  // "https://spring-darkness-8beb.test61-86c.workers.dev/",
  // "https://odd-river-ed9f.test29-be6.workers.dev/",
  // "https://soft-shadow-1443.expired8.workers.dev/",
  // "https://floral-limit-aeb0.expired9.workers.dev/",
  // "https://still-mode-5f32.expired6.workers.dev/",
  // "https://cool-wave-a9c1.expired7.workers.dev/",
  // "https://shrill-smoke-e6eb.test60-598.workers.dev/",
  // "https://twilight-resonance-eb4d.test28-f24.workers.dev/",
  // "https://billowing-rain-7239.test27-15e.workers.dev/",
  // "https://throbbing-dream-bb83.test62-63e.workers.dev/",
  // "https://small-hall-439b.test83-291.workers.dev/",
  // "https://rough-bonus-f4e3.test82-ac2.workers.dev/",
  // "https://quiet-sun-4390.test80-1f4.workers.dev/",
  // "https://curly-sea-0553.test79-29a.workers.dev/",
  // "https://mute-bonus-b2b6.test78-564.workers.dev/",
  // "https://fragrant-silence-a7d1.test77-a68.workers.dev/",
  // "https://weathered-king-9f51.test76-4e9.workers.dev/",
  // "https://delicate-dream-a0ac.test75-da4.workers.dev/",
  // "https://twilight-mode-af23.test74-635.workers.dev/",
  // "https://sweet-feather-58ef.test73-bfb.workers.dev/",
  // "https://restless-term-9ca1.test72-165.workers.dev/",
  // "https://wispy-sea-969e.test71-dc9.workers.dev/",
  // "https://silent-rain-377c.test68-6e8.workers.dev/",
  // "https://flat-darkness-ef7a.test70-ee3.workers.dev/",
  // "https://restless-brook-d944.test67-989.workers.dev/",
  // "https://long-dew-a85b.test84-c55.workers.dev/",
  // "https://muddy-sky-afea.test92-0aa.workers.dev/",
  // "https://green-resonance-ba27.orion001.workers.dev/",
  // "https://plain-tooth-a5ef.orion002.workers.dev/",
  // "https://lively-rice-79f8.orion004.workers.dev/",
  // "https://morning-mountain-b270.orion003.workers.dev/",
  // "https://young-poetry-2f1e.orion005.workers.dev/",
  // "https://broken-fire-37fb.orion006.workers.dev/",
  // "https://wispy-sea-c35e.orion008.workers.dev/",
  // "https://broken-pond-08af.orion007.workers.dev/",
  // "https://dry-rain-6c61.orion0010.workers.dev/",
  // "https://morning-paper-2c32.orion009.workers.dev/",
  // "https://sparkling-bush-c28f.orion0012.workers.dev/",
  // "https://late-firefly-ca73.orion0011.workers.dev/",
  // "https://snowy-grass-18ac.orion0014.workers.dev/",
  // "https://billowing-glitter-4e38.orion0013.workers.dev/",
  // "https://curly-glitter-b0c4.orion0016.workers.dev/",
  // "https://billowing-hat-4025.orion0015.workers.dev/",
  // "https://restless-hill-ae23.orion0017.workers.dev/",
  // "https://dark-wave-57fc.orion0018.workers.dev/",
  // "https://cold-hat-5c06.orion0020.workers.dev/",
  // "https://morning-voice-8620.orion0019.workers.dev/",
  // "https://holy-snowflake-2fb4.orion0001.workers.dev/",
  // "https://hidden-moon-0989.orion0002.workers.dev/",
  // "https://throbbing-pine-dceb.orion0003.workers.dev/",
  // "https://gentle-boat-15ec.orion0004.workers.dev/",
  // "https://lingering-glade-54f6.orion0005.workers.dev/",
  // "https://lively-bush-0572.orion0006.workers.dev/",
  // "https://jolly-bread-cd55.orion0007.workers.dev/",
  // "https://nameless-paper-1bf8.orion0008.workers.dev/",
  // "https://super-hat-bcbd.orion0009.workers.dev/",
  // "https://old-fog-35b0.orion00010.workers.dev/",
];

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

async function findProxy(proxies: string[]) {
  if (!proxies.length) return null;

  for (const proxy of shuffle(proxies)) {
    try {
      const res = await fetchWithTimeout(proxy, { method: "GET" }, 7000);

      console.log(`[PROXY] ${proxy} -> ${res.status}`);

      if (res.ok) {
        return proxy;
      }
    } catch (error) {
      console.error(`[PROXY] ${proxy} failed:`, error);
    }
  }

  return null;
}
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
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return new Response("Missing data", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = await decryptUrl(data);
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

    const segmentProxy = await findProxy(SEGMENT_PROXIES);
    if (!segmentProxy) {
      return new Response("No segment proxy available", {
        status: 502,
        headers: CORS_HEADERS,
      });
    }
    /*
     * --------------------------------------------------
     * REWRITE PLAYLIST
     * --------------------------------------------------
     */
    const rewritten = await Promise.all(
      playlist.split(/\r?\n/).map(async (line) => {
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

        // Nested master playlist
        if (
          absoluteUrl.hostname === "goodstream.cc" &&
          absoluteUrl.pathname.startsWith("/pl/")
        ) {
          const encrypted = await encryptUrl(absoluteUrl.toString());

          return `/vendetta/proxy?data=${encrypted}`;
        }

        // Media segment
        const encrypted = await encryptUrl(absoluteUrl.toString());

        return `${segmentProxy}?data=${encrypted}`;
      }),
    );

    const rewrittenPlaylist = rewritten.join("\n");

    return new Response(rewrittenPlaylist, {
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
