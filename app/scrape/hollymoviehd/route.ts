import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptUrl } from "@/lib/encryptor";

const supabase = createClient(
  process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
  process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
);

const domain = "https://api1.zxcstream.xyz";

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("id");
  const mediaType = req.nextUrl.searchParams.get("mediaType");
  const season = req.nextUrl.searchParams.get("season");
  const episode = req.nextUrl.searchParams.get("episode");

  const seasonParam = season ?? "";
  const episodeParam = episode ?? "";

  try {
    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 400 },
      );
    }

    const { data: cached } = await supabase
      .from("holly_movie_cache")
      .select("sources")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .eq("season", seasonParam)
      .eq("episode", episodeParam)
      .single();

    if (!cached?.sources?.length) {
      return NextResponse.json(
        { success: false, error: "No cached sources" },
        { status: 404 },
      );
    }

    const links = await Promise.all(
      cached.sources
        .filter((s: any) => s.file?.includes("/pl/"))
        .map(async (source: any) => {
          const encrypted = await encryptUrl(source.file);

          return {
            source: "pl",
            type: "hls",
            link: `${domain}/scrape/hollymoviehd/proxy?data=${encrypted}`,
          };
        }),
    );

    if (!links.length) {
      return NextResponse.json(
        { success: false, error: "No /pl/ sources found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      links,
      subtitles: [],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
