import { getRandomPLDTIP } from "@/lib/pldt-ips";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const detailPath = req.nextUrl.searchParams.get("detailPath");
  const season = req.nextUrl.searchParams.get("se") || "0";
  const episode = req.nextUrl.searchParams.get("ep") || "0";
  const type = req.nextUrl.searchParams.get("type");
  const streamSignType = req.nextUrl.searchParams.get("streamSignType");

  if (!subjectId || !detailPath) {
    console.error("[PLAY] Missing subjectId or detailPath");

    return NextResponse.json(
      { error: "subjectId and detailPath are required" },
      { status: 400 },
    );
  }

  if (
    streamSignType !== null &&
    streamSignType !== "0" &&
    streamSignType !== "1"
  ) {
    console.error("[PLAY] Invalid streamSignType:", streamSignType);

    return NextResponse.json(
      { error: "streamSignType must be 0 or 1" },
      { status: 400 },
    );
  }

  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  ];

  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const randomIP = getRandomPLDTIP();

  const sources = [
    {
      name: "123movies",
      host: "123moviesfree.club",
      referer: `https://123moviesfree.club/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "netnaija",
      host: "netnaija.film",
      referer: `https://netnaija.film/videoPlayPage/${detailPath}?type=/movie/detail`,
    },
    {
      name: "movieboxonline",
      host: "movieboxonline.net",
      referer: `https://movieboxonline.net/play/${detailPath}?id=${subjectId}&page_from=home_Search+Result&type=/movie/detail`,
    },
    {
      name: "themoviebox",
      host: "themoviebox.org",
      referer: `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "movebox",
      host: "movebox.run",
      referer: `https://movebox.run/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "m2box",
      host: "m2box.org",
      referer: `https://m2box.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "movieboc",
      host: "movieboc.com",
      referer: `https://movieboc.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "moviebix",
      host: "moviebix.org",
      referer: `https://moviebix.org/moviesPage/${detailPath}?id=${subjectId}&type=/movie/detail`,
    },
    {
      name: "movibox",
      host: "movibox.xyz",
      referer: `https://movibox.xyz/watch/${detailPath}`,
    },
    {
      name: "movieboxonlinewatch",
      host: "movieboxonlinewatch.com",
      referer: `https://movieboxonlinewatch.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "moviesbox",
      host: "moviesbox.top",
      referer: `https://moviesbox.top/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "moviebixnet",
      host: "moviebix.net",
      referer: `https://moviebix.net/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
    {
      name: "movieboxofficial",
      host: "movie-boxofficial.com",
      referer: `https://movie-boxofficial.com/player/${detailPath}`,
    },
    {
      name: "boxmovie",
      host: "boxmovie.app",
      referer: `https://boxmovie.app/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
    },
  ];

  const source = sources[Math.floor(Math.random() * sources.length)];

  const params = new URLSearchParams({
    subjectId,
    se: season,
    ep: episode,
    detailPath,
  });

  if (streamSignType) {
    params.set("streamSignType", streamSignType);
  }

  const url = `https://${source.host}/wefeed-h5api-bff/subject/play?${params.toString()}`;

  console.log(
    `[PLAY] Request | source=${source.name} | host=${source.host} | subjectId=${subjectId} | se=${season} | ep=${episode} | type=${type} | ip=${randomIP}`,
  );

  const start = Date.now();

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.7",
        referer: source.referer,
        "user-agent": userAgent,
        "x-client-info": '{"timezone":"Asia/Manila"}',
        "X-Forwarded-For": randomIP,
        "CF-Connecting-IP": randomIP,
        "X-Real-IP": randomIP,
        "x-source": "",
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      `[PLAY] FETCH ERROR | source=${source.name} | host=${source.host} | ip=${randomIP}`,
      error,
    );

    return NextResponse.json(
      {
        error: "Upstream request failed",
        source: source.name,
      },
      { status: 502 },
    );
  }

  const elapsed = Date.now() - start;

  console.log(
    `[PLAY] Response | source=${source.name} | status=${response.status} ${response.statusText} | time=${elapsed}ms`,
  );

  if (response.status === 429) {
    console.error(
      `[PLAY] RATE LIMITED 429 | source=${source.name} | ip=${randomIP} | retry-after=${response.headers.get("retry-after") || "none"}`,
    );
  } else if (response.status === 403) {
    console.error(
      `[PLAY] FORBIDDEN 403 | source=${source.name} | ip=${randomIP}`,
    );
  } else if (!response.ok) {
    console.error(
      `[PLAY] UPSTREAM ERROR | source=${source.name} | status=${response.status}`,
    );
  }

  let data: any;

  try {
    data = await response.json();
  } catch (error) {
    console.error(
      `[PLAY] INVALID JSON | source=${source.name} | status=${response.status}`,
      error,
    );

    return NextResponse.json(
      {
        error: "Invalid response from upstream",
        source: source.name,
        status: response.status,
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    console.error(
      `[PLAY] FAILED DATA | source=${source.name} | status=${response.status}`,
      JSON.stringify(data).slice(0, 1000),
    );

    return NextResponse.json(
      {
        error: "Upstream request failed",
        source: source.name,
        status: response.status,
        data,
      },
      { status: response.status },
    );
  }

  console.log(
    `[PLAY] SUCCESS | source=${source.name} | subjectId=${subjectId} | time=${elapsed}ms`,
  );

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
}
