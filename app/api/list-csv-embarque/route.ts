import { NextResponse } from "next/server"
import { listShipCsvByDate } from "@/lib/blob-storage"

export async function GET() {
  try {
    const csvMap = await listShipCsvByDate()
    return NextResponse.json(csvMap, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Erro ao listar CSVs de navios do Blob:", error)
    return NextResponse.json(
      { error: "Falha ao listar arquivos CSV de navios" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
