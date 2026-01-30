import { NextResponse } from "next/server"
import { listTruckCsvByDate } from "@/lib/blob-storage"

export async function GET() {
  try {
    const data = await listTruckCsvByDate()
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error listing truck CSV files from Blob:", error)
    return NextResponse.json(
      {
        data: {},
        error: "Failed to list truck CSV files",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
