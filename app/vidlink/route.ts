import { NextRequest, NextResponse } from "next/server";
import { fetch, ProxyAgent } from "undici";

const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";

const residentialProxy = new ProxyAgent(process.env.RESIDENTIAL_PROXY_2!);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Origin: "https://vidlink.pro",
  Referer: "https://vidlink.pro/",
};

const VIDLINK_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.7",
  Referer: "https://vidlink.pro/movie/1184918",
  "Sec-CH-UA": '"Not=A?Brand";v="99", "Brave";v="151", "Chromium";v="151"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-GPC": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  "X-Playback-Environment": "dash-hevc",
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const tmdbId = url.searchParams.get("tmdbId");
  const mediaType = url.searchParams.get("mediaType");
  const season = url.searchParams.get("season");
  const episode = url.searchParams.get("episode");

  if (!tmdbId || !mediaType) {
    return NextResponse.json(
      {
        error: "missing params",
      },
      { status: 400 },
    );
  }

  try {
    const encryptedResponse = await fetch(
      `${ENC_DEC_API}/enc-vidlink?text=${encodeURIComponent(tmdbId)}`,
      {
        headers: HEADERS,
      },
    );

    if (!encryptedResponse.ok) {
      return NextResponse.json(
        { error: "encryption request failed" },
        { status: encryptedResponse.status },
      );
    }

    const encryptedData = (await encryptedResponse.json()) as {
      status: number;
      result?: string;
    };

    if (encryptedData.status !== 200 || !encryptedData.result) {
      return NextResponse.json(
        { error: "failed to encrypt tmdb id" },
        { status: 502 },
      );
    }

    const encryptedId = encryptedData.result;

    const vidlinkUrl =
      mediaType === "movie"
        ? `${VIDLINK_API}/movie/${encryptedId}?multiLang=0`
        : `${VIDLINK_API}/tv/${encryptedId}/${season}/${episode}?multiLang=0`;

    const response = await fetch(vidlinkUrl, {
      dispatcher: residentialProxy,
      signal: AbortSignal.timeout(15_000),
      headers: VIDLINK_HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Vidlink request failed",
          status: response.status,
        },
        { status: response.status },
      );
    }

    let data: any;

    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid Vidlink response" },
        { status: 502 },
      );
    }

    if (!data?.stream) {
      return NextResponse.json(
        { error: "stream data not found" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      playlist: data.stream.playlist,
      playlistHeaders: data.stream.playlistHeaders,
      type: data.stream.type,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 502 },
    );
  }
}
