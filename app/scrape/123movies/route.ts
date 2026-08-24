import { getRandomAfricanIP } from "@/lib/african-ip";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const detailPath = req.nextUrl.searchParams.get("detailPath");
  const season = req.nextUrl.searchParams.get("se") || "0";
  const episode = req.nextUrl.searchParams.get("ep") || "0";
  const type = req.nextUrl.searchParams.get("type");

  const streamSignType = req.nextUrl.searchParams.get("streamSignType");
  if (!subjectId || !detailPath) {
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
  const randomIP = getRandomAfricanIP();
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
      referer: `https://moviebix.org/moviesPage/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
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

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.7",
      referer: source.referer,
      "user-agent": userAgent,
      "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
      "X-Forwarded-For": randomIP,
      "CF-Connecting-IP": randomIP,
      "X-Real-IP": randomIP,

      "x-source": "",
    },
    cache: "no-store",
  });

  const data = await response.json();

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
