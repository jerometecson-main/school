// ICARUS SERVER – search + cache only
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRandomAfricanIP } from "@/lib/african-ip";

const supabase = createClient(
  process.env.SUPABASE_URL_MOVIEBOX_WEB!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX_WEB!,
);

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
    const randomIP = getRandomAfricanIP();

    const searchRes = await fetchWithTimeout(
      `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjM1Nzg2MTcyNzAwNDQwOTI5ODQsImF0cCI6MywiZXh0IjoiMTc4NjgxNDE3OSIsImV4cCI6MTc5NDU5MDE3OSwiaWF0IjoxNzg2ODEzODc5fQ.rptVA52qlQg30CeFcxQN15MGdNsNtp2u8wnt4n6oCZA",
          Origin: "https://movieboxhd.net",
          Referer: "https://movieboxhd.net/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
          "X-Forwarded-For": randomIP,
          "CF-Connecting-IP": randomIP,
          "X-Real-IP": randomIP,
          "X-No-High-Risk-Restrict": "0",
          "X-Request-Lang": "en",
          "X-Vip-Restrict": "1",
        },
        body: JSON.stringify({
          keyword: `${title}`,
          page: 1,
          perPage: 24,
          subjectType: mediaType === "tv" ? 2 : 1,
        }),
      },
      8000,
    );

    const searchJson = await searchRes.json();
    const results = searchJson?.data?.data || searchJson?.data || searchJson;
    const items = results?.items || [];

    if (!items.length) {
      return NextResponse.json(
        { success: false, error: "No search results" },
        { status: 404 },
      );
    }

    const normalizedTitle = title?.toLowerCase().trim().replace(/-/g, " ");
    const LANG_TAGS =
      /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;
    const queryWords = normalizedTitle!.split(/\s+/).filter(Boolean);
    const dateObj = date ? new Date(date) : null;

    let selectedItem = items.find((item: any) => {
      const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
      const itemReleaseDate = item.releaseDate;
      if (LANG_TAGS.test(itemTitle)) return false;
      if (!dateObj || !itemReleaseDate) return false;
      const itemDate = new Date(itemReleaseDate);
      const diff =
        itemDate.getFullYear() * 12 +
        itemDate.getMonth() -
        (dateObj.getFullYear() * 12 + dateObj.getMonth());
      if (Math.abs(diff) > 1) return false;
      const itemTitleClean = itemTitle.replace(/\bs\d+(-s\d+)?\b/gi, "").trim();
      const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
      if (queryWords.length <= 2 && itemWordsClean.length !== queryWords.length)
        return false;
      return queryWords.every((word) => itemTitle.includes(word));
    });

    if (!selectedItem) {
      selectedItem = items.find((item: any) => {
        const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
        const itemReleaseDate = item.releaseDate;
        if (!dateObj || !itemReleaseDate) return false;
        const itemDate = new Date(itemReleaseDate);
        const diff =
          itemDate.getFullYear() * 12 +
          itemDate.getMonth() -
          (dateObj.getFullYear() * 12 + dateObj.getMonth());
        if (Math.abs(diff) > 1) return false;
        const itemTitleClean = itemTitle
          .replace(/\bs\d+(-s\d+)?\b/gi, "")
          .trim();
        const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
        if (
          queryWords.length <= 2 &&
          itemWordsClean.length !== queryWords.length
        )
          return false;
        return queryWords.every((word) => itemTitle.includes(word));
      });
    }

    if (!selectedItem) {
      return NextResponse.json(
        { success: false, error: "Unavailable" },
        { status: 404 },
      );
    }

    const rawSubjectId = selectedItem?.subjectId;
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

          "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
          "X-Forwarded-For": randomIP,
          "CF-Connecting-IP": randomIP,
          "X-Real-IP": randomIP,

          "X-No-High-Risk-Restrict": "0",
          "X-Vip-Restrict": "1",
          "X-watch-restrict": "0",
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

    // -------- Save to Supabase only --------
    await supabase.from("moviebox_cache").upsert(
      {
        tmdb_id: tmdbId,
        media_type: mediaType,
        dubs,
        release_date: date,
        title,
      },
      { onConflict: "tmdb_id,media_type", ignoreDuplicates: true },
    );

    return NextResponse.json({
      success: true,
      cached: false,
      dubs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
