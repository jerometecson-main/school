// ICARUS SERVER – search + cache only
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL_MOVIEBOX_WEB!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX_WEB!,
);

const SEARCH_WORKER = "https://cool-sea-3ac5.zxcprime360.workers.dev/";

export async function GET(req: NextRequest) {
  try {
    const tmdbId = req.nextUrl.searchParams.get("id");
    const mediaType = req.nextUrl.searchParams.get("b");
    const title = req.nextUrl.searchParams.get("title");
    const date = req.nextUrl.searchParams.get("date");

    if (!tmdbId || !mediaType || !title || !date) {
      return NextResponse.json(
        { success: false, error: "missing params" },
        { status: 404 },
      );
    }

    // -------- Cache Lookup --------
    const { data: cached } = await supabase
      .from("moviebox_cache")
      .select("dubs")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        dubs: cached.dubs ?? [],
      });
    }

    // -------- Search Worker --------
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

    // -------- Match Result --------
    const normalizedTitle = title.toLowerCase().trim().replace(/-/g, " ");

    const LANG_TAGS =
      /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;

    const queryWords = normalizedTitle.split(/\s+/).filter(Boolean);
    const dateObj = new Date(date);

    let selectedItem = items.find((item: any) => {
      const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";

      if (LANG_TAGS.test(itemTitle)) return false;
      if (!item.releaseDate) return false;

      const itemDate = new Date(item.releaseDate);

      const diff =
        itemDate.getFullYear() * 12 +
        itemDate.getMonth() -
        (dateObj.getFullYear() * 12 + dateObj.getMonth());

      if (Math.abs(diff) > 1) return false;

      if (item.mediaType !== mediaType) return false;

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

    // -------- Detail (to get dubs) --------
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

    const detailJson = await detailRes.json();

    const info = detailJson?.data?.data || detailJson?.data || detailJson;

    let dubs = info?.subject?.dubs || [];

    if (dubs.length === 0) {
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

    // -------- Save to Supabase --------
    await supabase.from("moviebox_cache").upsert(
      {
        tmdb_id: tmdbId,
        media_type: mediaType,
        dubs,
        release_date: date,
        title,
      },
      {
        onConflict: "tmdb_id,media_type",
        ignoreDuplicates: true,
      },
    );

    return NextResponse.json({
      success: true,
      cached: false,
      dubs,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
