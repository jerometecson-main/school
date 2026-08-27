import { NextResponse } from "next/server";
import { fetch, ProxyAgent } from "undici";

const residentialProxy = new ProxyAgent(process.env.RESIDENTIAL_PROXY!);

export async function GET() {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      dispatcher: residentialProxy,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      proxyIp: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
