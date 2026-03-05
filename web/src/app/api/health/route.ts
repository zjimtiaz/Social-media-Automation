import { NextResponse } from "next/server";
import { getPythonClient, PythonServiceError } from "@/lib/python-client";

export async function GET() {
  try {
    const python = getPythonClient();
    const health = await python.healthCheck();

    return NextResponse.json({
      data: {
        status: health.status,
        version: health.version,
        uptime: health.uptime,
        services: health.services,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof PythonServiceError
        ? error.message
        : "Python service unreachable";

    return NextResponse.json(
      {
        data: {
          status: "unhealthy",
          services: { python: false },
          error: message,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
