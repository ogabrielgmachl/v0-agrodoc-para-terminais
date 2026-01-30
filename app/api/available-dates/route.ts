import { getAvailableDates } from "@/lib/load-trucks"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const dates = await getAvailableDates()
    return NextResponse.json(
      { dates },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("[API] Erro ao buscar datas disponíveis:", error)
    return NextResponse.json(
      { error: "Erro ao buscar datas disponíveis" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
