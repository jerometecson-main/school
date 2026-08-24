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

  const requestId = Math.random().toString(36).slice(2, 8);
  const start = Date.now();

  console.log(
    `[SCRAPE] ${requestId} START | source=${source.name} | host=${source.host} | subjectId=${subjectId} | se=${season} | ep=${episode}`,
  );

  try {
    const response = await fetch(url, {
      dispatcher: residentialProxy,
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.7",
        referer: source.referer,
        "user-agent": userAgent,
        "x-client-info": '{"timezone":"Asia/Manila"}',
        "x-source": "",
      },
    });

    const elapsed = Date.now() - start;

    // Get the response body first so we can inspect errors.
    const body = await response.text();

    console.log(
      `[SCRAPE] ${requestId} RESPONSE | source=${source.name} | status=${response.status} | ${elapsed}ms`,
    );

    if (!response.ok) {
      console.warn(
        `[SCRAPE] ${requestId} FAILED | source=${source.name} | status=${response.status} | body=${body.slice(0, 500)}`,
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
      data = JSON.parse(body) as PlayResponse;
    } catch {
      console.error(
        `[SCRAPE] ${requestId} INVALID JSON | source=${source.name} | body=${body.slice(0, 500)}`,
      );

      return NextResponse.json(
        {
          error: "Invalid upstream response",
          source: source.name,
        },
        { status: 502 },
      );
    }

    const count =
      type === "dash"
        ? (data.data?.dash?.length ?? 0)
        : type === "mp4"
          ? (data.data?.streams?.length ?? 0)
          : 0;

    console.log(
      `[SCRAPE] ${requestId} SUCCESS | source=${source.name} | status=${response.status} | items=${count} | ${elapsed}ms`,
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
  } catch (error) {
    const elapsed = Date.now() - start;

    console.error(
      `[SCRAPE] ${requestId} ERROR | source=${source.name} | ${elapsed}ms |`,
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error: "Upstream request failed",
        source: source.name,
      },
      { status: 502 },
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { fetch, ProxyAgent } from "undici";

// interface PlayResponse {
//   data?: {
//     dash?: unknown[];
//     streams?: unknown[];
//   };
//   [key: string]: unknown;
// }

// const residentialProxy = new ProxyAgent(process.env.RESIDENTIAL_PROXY!);

// export async function GET(req: NextRequest) {
//   const subjectId = req.nextUrl.searchParams.get("subjectId");
//   const detailPath = req.nextUrl.searchParams.get("detailPath");
//   const season = req.nextUrl.searchParams.get("se") || "0";
//   const episode = req.nextUrl.searchParams.get("ep") || "0";
//   const type = req.nextUrl.searchParams.get("type");
//   const streamSignType = req.nextUrl.searchParams.get("streamSignType");

//   if (!subjectId || !detailPath) {
//     return NextResponse.json(
//       { error: "subjectId and detailPath are required" },
//       { status: 400 },
//     );
//   }

//   if (
//     streamSignType !== null &&
//     streamSignType !== "0" &&
//     streamSignType !== "1"
//   ) {
//     return NextResponse.json(
//       { error: "streamSignType must be 0 or 1" },
//       { status: 400 },
//     );
//   }

//   const userAgents = [
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
//     "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
//   ];

//   const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

//   const sources = [
//     {
//       name: "123movies",
//       host: "123moviesfree.club",
//       referer: `https://123moviesfree.club/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "netnaija",
//       host: "netnaija.film",
//       referer: `https://netnaija.film/videoPlayPage/${detailPath}?type=/movie/detail`,
//     },
//     {
//       name: "movieboxonline",
//       host: "movieboxonline.net",
//       referer: `https://movieboxonline.net/play/${detailPath}?id=${subjectId}&page_from=home_Search+Result&type=/movie/detail`,
//     },
//     {
//       name: "themoviebox",
//       host: "themoviebox.org",
//       referer: `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "movebox",
//       host: "movebox.run",
//       referer: `https://movebox.run/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "m2box",
//       host: "m2box.org",
//       referer: `https://m2box.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "movieboc",
//       host: "movieboc.com",
//       referer: `https://movieboc.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "moviebix",
//       host: "moviebix.org",
//       referer: `https://moviebix.org/moviesPage/${detailPath}?id=${subjectId}&type=/movie/detail`,
//     },
//     {
//       name: "movibox",
//       host: "movibox.xyz",
//       referer: `https://movibox.xyz/watch/${detailPath}`,
//     },
//     {
//       name: "movieboxonlinewatch",
//       host: "movieboxonlinewatch.com",
//       referer: `https://movieboxonlinewatch.com/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "moviesbox",
//       host: "moviesbox.top",
//       referer: `https://moviesbox.top/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "moviebixnet",
//       host: "moviebix.net",
//       referer: `https://moviebix.net/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//     {
//       name: "movieboxofficial",
//       host: "movie-boxofficial.com",
//       referer: `https://movie-boxofficial.com/player/${detailPath}`,
//     },
//     {
//       name: "boxmovie",
//       host: "boxmovie.app",
//       referer: `https://boxmovie.app/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
//     },
//   ];

//   const source = sources[Math.floor(Math.random() * sources.length)];

//   const params = new URLSearchParams({
//     subjectId,
//     se: season,
//     ep: episode,
//     detailPath,
//   });

//   if (streamSignType) {
//     params.set("streamSignType", streamSignType);
//   }

//   const url = `https://${source.host}/wefeed-h5api-bff/subject/play?${params.toString()}`;

//   try {
//     const response = await fetch(url, {
//       dispatcher: residentialProxy,
//       headers: {
//         accept: "application/json",
//         "accept-language": "en-US,en;q=0.7",
//         referer: source.referer,
//         "user-agent": userAgent,
//         "x-client-info": '{"timezone":"Asia/Manila"}',
//         "x-source": "",
//       },
//     });

//     const data = (await response.json()) as PlayResponse;
//     // const proxyIP = await getProxyIP();
//     if (type === "dash") {
//       return NextResponse.json({
//         source: source.name,
//         // ip: proxyIP,
//         data: data.data?.dash ?? [],
//       });
//     }

//     if (type === "mp4") {
//       return NextResponse.json({
//         source: source.name,
//         // ip: proxyIP,
//         data: data.data?.streams ?? [],
//       });
//     }

//     return NextResponse.json({
//       source: source.name,
//       // ip: proxyIP,
//       ...data,
//     });
//   } catch (error) {
//     console.error(
//       `[SCRAPE] ${source.name} failed:`,
//       error instanceof Error ? error.message : error,
//     );

//     return NextResponse.json(
//       {
//         error: "Upstream request failed",
//         source: source.name,
//       },
//       { status: 502 },
//     );
//   }
// }
// // async function getProxyIP(): Promise<string | null> {
// //   try {
// //     const response = await fetch("https://api.ipify.org?format=json", {
// //       dispatcher: residentialProxy,
// //     });

// //     const data = (await response.json()) as { ip?: string };

// //     return data.ip ?? null;
// //   } catch {
// //     return null;
// //   }
// // }
