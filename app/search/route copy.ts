import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch(
    "https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search",
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
        "X-Client-Info": '{"timezone":"Asia/Manila"}',
        "X-No-High-Risk-Restrict": "0",
        "X-Request-Lang": "en",
        "X-Vip-Restrict": "1",
      },
      body: JSON.stringify({
        keyword: "michael",
        page: 1,
        perPage: 28,
        subjectType: 1,
      }),
    },
  );

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
  });
}
