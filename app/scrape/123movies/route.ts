import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const detailPath = req.nextUrl.searchParams.get("detailPath");
  const season = req.nextUrl.searchParams.get("se") || "0";
  const episode = req.nextUrl.searchParams.get("ep") || "0";
  const type = req.nextUrl.searchParams.get("type");

  if (!subjectId || !detailPath) {
    return NextResponse.json(
      { error: "subjectId and detailPath are required" },
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
  ];

  const source = sources[Math.floor(Math.random() * sources.length)];

  const url = `https://${source.host}/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${season}&ep=${episode}&detailPath=${detailPath}`;

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.7",
      referer: source.referer,
      "user-agent": userAgent,
      "x-client-info": '{"timezone":"Asia/Manila"}',
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
