// ICARUS SERVER – MovieBox search only

import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";

const SEARCH_WORKER = "https://cool-sea-3ac5.zxcprime360.workers.dev/";

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get("id");
    const mediaType = req.nextUrl.searchParams.get("b");
    const title = req.nextUrl.searchParams.get("title");
    const date = req.nextUrl.searchParams.get("date");
    const latestDate = req.nextUrl.searchParams.get("latestDate");

    if (!tmdbId || !mediaType || !title || !date) {
      return NextResponse.json(
        { success: false, error: "missing params" },
        { status: 400 },
      );
    }

    // -----------------------------
    // Search Worker
    // -----------------------------

    const searchUrl = new URL(SEARCH_WORKER);
    searchUrl.searchParams.set("query", title);

    const searchRes = await fetchWithTimeout(searchUrl.toString(), {}, 8000);

    if (!searchRes.ok) {
      return NextResponse.json(
        { success: false, error: "Search failed" },
        { status: 502 },
      );
    }

    const items = await searchRes.json();

    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json(
        { success: false, error: "No search results" },
        { status: 404 },
      );
    }

    // -----------------------------
    // Match Result
    // -----------------------------

    const normalizedTitle = title.toLowerCase().trim().replace(/-/g, " ");

    const LANG_TAGS =
      /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;

    const queryWords = normalizedTitle.split(/\s+/).filter(Boolean);

    const datesToTry =
      mediaType === "tv" && latestDate ? [date, latestDate] : [date];

    const selectedItem = items.find((item: any) => {
      const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";

      if (LANG_TAGS.test(itemTitle)) return false;
      if (!item.releaseDate) return false;
      if (item.mediaType !== mediaType) return false;

      // -----------------------------
      // Date Match
      // -----------------------------

      const itemDate = new Date(item.releaseDate);

      const matchesDate = datesToTry.some((matchDate) => {
        const dateObj = new Date(matchDate);

        const diff =
          itemDate.getFullYear() * 12 +
          itemDate.getMonth() -
          (dateObj.getFullYear() * 12 + dateObj.getMonth());

        return Math.abs(diff) <= 1;
      });

      if (!matchesDate) return false;

      // -----------------------------
      // Title Match
      // -----------------------------

      const itemTitleClean = itemTitle.replace(/\bs\d+(-s\d+)?\b/gi, "").trim();

      const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);

      if (
        queryWords.length <= 2 &&
        itemWordsClean.length !== queryWords.length
      ) {
        return false;
      }

      return queryWords.every((word) => itemTitle.includes(word));
    });

    if (!selectedItem) {
      return NextResponse.json(
        { success: false, error: "Unavailable" },
        { status: 404 },
      );
    }

    const rawSubjectId = selectedItem.subjectId;

    if (!rawSubjectId) {
      return NextResponse.json(
        { success: false, error: "SubjectId Not Found" },
        { status: 404 },
      );
    }

    // -----------------------------
    // Detail → Get Dubs
    // -----------------------------

    const detailRes = await fetchWithTimeout(
      `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${selectedItem.detailPath}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://netfilm.world",
          Referer: "https://netfilm.world/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        },
      },
      8000,
    );

    if (!detailRes.ok) {
      return NextResponse.json(
        { success: false, error: "Detail request failed" },
        { status: 502 },
      );
    }

    const detailJson = await detailRes.json();

    const info = detailJson?.data?.data || detailJson?.data || detailJson;

    let dubs = info?.subject?.dubs || [];

    // -----------------------------
    // No dubs → construct original
    // -----------------------------

    if (!dubs.length) {
      dubs = [
        {
          subjectId: rawSubjectId,
          detailPath: selectedItem.detailPath,
          original: true,
          lanCode: "orig",
          lanName: "Original Audio",
          type: 0,
          constructed: true,
        },
      ];
    }

    // -----------------------------
    // Return
    // -----------------------------

    return NextResponse.json({
      success: true,
      dubs,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// // ICARUS SERVER – MovieBox search only

// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";

// const SEARCH_WORKER = "https://cool-sea-3ac5.zxcprime360.workers.dev/";

// export async function GET(req: NextRequest) {
//   try {
//     const tmdbId = req.nextUrl.searchParams.get("id");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const title = req.nextUrl.searchParams.get("title");
//     const date = req.nextUrl.searchParams.get("date");

//     if (!tmdbId || !mediaType || !title || !date) {
//       return NextResponse.json(
//         { success: false, error: "missing params" },
//         { status: 400 },
//       );
//     }

//     // -----------------------------
//     // Search Worker
//     // -----------------------------

//     const searchUrl = new URL(SEARCH_WORKER);
//     searchUrl.searchParams.set("query", title);

//     const searchRes = await fetchWithTimeout(searchUrl.toString(), {}, 8000);

//     if (!searchRes.ok) {
//       return NextResponse.json(
//         { success: false, error: "Search failed" },
//         { status: 502 },
//       );
//     }

//     const items = await searchRes.json();

//     if (!Array.isArray(items) || !items.length) {
//       return NextResponse.json(
//         { success: false, error: "No search results" },
//         { status: 404 },
//       );
//     }

//     // -----------------------------
//     // Match Result
//     // -----------------------------

//     const normalizedTitle = title.toLowerCase().trim().replace(/-/g, " ");

//     const LANG_TAGS =
//       /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;

//     const queryWords = normalizedTitle.split(/\s+/).filter(Boolean);
//     const dateObj = new Date(date);

//     const selectedItem = items.find((item: any) => {
//       const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";

//       if (LANG_TAGS.test(itemTitle)) return false;
//       if (!item.releaseDate) return false;

//       const itemDate = new Date(item.releaseDate);

//       const diff =
//         itemDate.getFullYear() * 12 +
//         itemDate.getMonth() -
//         (dateObj.getFullYear() * 12 + dateObj.getMonth());

//       if (Math.abs(diff) > 1) return false;

//       if (item.mediaType !== mediaType) return false;

//       const itemTitleClean = itemTitle.replace(/\bs\d+(-s\d+)?\b/gi, "").trim();

//       const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);

//       if (
//         queryWords.length <= 2 &&
//         itemWordsClean.length !== queryWords.length
//       ) {
//         return false;
//       }

//       return queryWords.every((word) => itemTitle.includes(word));
//     });

//     if (!selectedItem) {
//       return NextResponse.json(
//         { success: false, error: "Unavailable" },
//         { status: 404 },
//       );
//     }

//     const rawSubjectId = selectedItem.subjectId;

//     if (!rawSubjectId) {
//       return NextResponse.json(
//         { success: false, error: "SubjectId Not Found" },
//         { status: 404 },
//       );
//     }

//     // -----------------------------
//     // Detail → Get Dubs
//     // -----------------------------

//     const detailRes = await fetchWithTimeout(
//       `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${selectedItem.detailPath}`,
//       {
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//           Origin: "https://netfilm.world",
//           Referer: "https://netfilm.world/",
//           "User-Agent":
//             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
//         },
//       },
//       8000,
//     );

//     if (!detailRes.ok) {
//       return NextResponse.json(
//         { success: false, error: "Detail request failed" },
//         { status: 502 },
//       );
//     }

//     const detailJson = await detailRes.json();

//     const info = detailJson?.data?.data || detailJson?.data || detailJson;

//     let dubs = info?.subject?.dubs || [];

//     // -----------------------------
//     // No dubs → construct original
//     // -----------------------------

//     if (!dubs.length) {
//       dubs = [
//         {
//           subjectId: rawSubjectId,
//           detailPath: selectedItem.detailPath,
//           original: true,
//           lanCode: "orig",
//           lanName: "Original Audio",
//           type: 0,
//           constructed: true,
//         },
//       ];
//     }

//     // -----------------------------
//     // Return
//     // -----------------------------

//     return NextResponse.json({
//       success: true,
//       dubs,
//     });
//   } catch {
//     return NextResponse.json(
//       { success: false, error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
