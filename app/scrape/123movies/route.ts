import { NextRequest, NextResponse } from "next/server";
import { fetch, ProxyAgent } from "undici";

interface PlayResponse {
  data?: {
    dash?: unknown[];
    streams?: unknown[];
  };
  [key: string]: unknown;
}

const residentialProxy = new ProxyAgent(process.env.RESIDENTIAL_PROXY!);
const residentialProxy_2 = new ProxyAgent(process.env.RESIDENTIAL_PROXY_2!);
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
];

const SOURCES = [
  {
    name: "123movies",
    host: "123moviesfree.club",
    referer: (detailPath: string, subjectId: string) =>
      `https://123moviesfree.club/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "netnaija",
    host: "netnaija.film",
    referer: (detailPath: string) =>
      `https://netnaija.film/videoPlayPage/${detailPath}?type=/movie/detail`,
  },
  {
    name: "movieboxonline",
    host: "movieboxonline.net",
    referer: (detailPath: string, subjectId: string) =>
      `https://movieboxonline.net/play/${detailPath}?id=${subjectId}&page_from=home_Search+Result&type=/movie/detail`,
  },
  {
    name: "themoviebox",
    host: "themoviebox.org",
    referer: (detailPath: string, subjectId: string) =>
      `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "movebox",
    host: "movebox.run",
    referer: (detailPath: string, subjectId: string) =>
      `https://movebox.run/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "m2box",
    host: "m2box.org",
    referer: (detailPath: string, subjectId: string) =>
      `https://m2box.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "movieboc",
    host: "movieboc.com",
    referer: (detailPath: string, subjectId: string) =>
      `https://movieboc.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "moviebix",
    host: "moviebix.org",
    referer: (detailPath: string, subjectId: string) =>
      `https://moviebix.org/moviesPage/${detailPath}?id=${subjectId}&type=/movie/detail`,
  },
  {
    name: "movibox",
    host: "movibox.xyz",
    referer: (detailPath: string) => `https://movibox.xyz/watch/${detailPath}`,
  },
  {
    name: "movieboxonlinewatch",
    host: "movieboxonlinewatch.com",
    referer: (detailPath: string, subjectId: string) =>
      `https://movieboxonlinewatch.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "moviesbox",
    host: "moviesbox.top",
    referer: (detailPath: string, subjectId: string) =>
      `https://moviesbox.top/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "moviebixnet",
    host: "moviebix.net",
    referer: (detailPath: string, subjectId: string) =>
      `https://moviebix.net/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
  {
    name: "movieboxofficial",
    host: "movie-boxofficial.com",
    referer: (detailPath: string) =>
      `https://movie-boxofficial.com/player/${detailPath}`,
  },
  {
    name: "boxmovie",
    host: "boxmovie.app",
    referer: (detailPath: string, subjectId: string) =>
      `https://boxmovie.app/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
  },
];

const randomItem = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const subjectId = searchParams.get("subjectId");
  const detailPath = searchParams.get("detailPath");
  const season = searchParams.get("se") || "0";
  const episode = searchParams.get("ep") || "0";
  const type = searchParams.get("type");
  const streamSignType = searchParams.get("streamSignType");

  if (!subjectId || !detailPath) {
    return NextResponse.json(
      {
        error: "subjectId and detailPath are required",
      },
      { status: 400 },
    );
  }

  if (
    streamSignType !== null &&
    streamSignType !== "0" &&
    streamSignType !== "1"
  ) {
    return NextResponse.json(
      {
        error: "streamSignType must be 0 or 1",
      },
      { status: 400 },
    );
  }

  if (type !== null && type !== "dash" && type !== "mp4") {
    return NextResponse.json(
      {
        error: "type must be dash or mp4",
      },
      { status: 400 },
    );
  }

  const source = randomItem(SOURCES);
  const userAgent = randomItem(USER_AGENTS);

  const params = new URLSearchParams({
    subjectId,
    se: season,
    ep: episode,
    detailPath,
  });

  if (streamSignType !== null) {
    params.set("streamSignType", streamSignType);
  }

  const url = `https://${source.host}/wefeed-h5api-bff/subject/play?${params}`;

  try {
    const response = await fetch(url, {
      dispatcher: residentialProxy,
      signal: AbortSignal.timeout(15_000),
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.7",
        referer: source.referer(detailPath, subjectId),
        "user-agent": userAgent,
        "x-client-info": '{"timezone":"Asia/Manila"}',
        "x-source": "",
      },
    });

    if (!response.ok) {
      console.error(
        `[SCRAPE] ${source.name} HTTP ${response.status} | ${response.statusText}`,
      );

      return NextResponse.json(
        {
          error: "Upstream request failed",
          source: source.name,
          status: response.status,
        },
        { status: response.status },
      );
    }

    let data: PlayResponse;

    try {
      data = (await response.json()) as PlayResponse;
    } catch {
      console.error(`[SCRAPE] ${source.name} INVALID_JSON`);

      return NextResponse.json(
        {
          error: "Invalid upstream response",
          source: source.name,
        },
        { status: 502 },
      );
    }

    if (type === "dash") {
      return NextResponse.json({
        source: source.name,
        data: data.data?.dash ?? [],
      });
    }

    if (type === "mp4") {
      return NextResponse.json({
        source: source.name,
        data: data.data?.streams ?? [],
      });
    }

    return NextResponse.json({
      source: source.name,
      ...data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const errorType = error instanceof Error ? error.name : "UnknownError";

    console.error(`[SCRAPE] ${source.name} ${errorType} | ${message}`);

    return NextResponse.json(
      {
        error: "Upstream request failed",
        source: source.name,
        type: errorType,
      },
      { status: 502 },
    );
  }
}
