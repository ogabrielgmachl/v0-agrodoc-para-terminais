import { createClient } from "@/lib/supabase/server"
import { type ShipsByDate } from "@/lib/load-ships"

export interface Ship {
  id: string
  navio: string
  processo: string
  quantidade: number
  destino: string
  dataPrevista: string
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  date: string
}

/**
 * GET /api/ships?year=YYYY&month=MM
 * 
 * Retorna navios do Supabase agrupados por data no formato ShipsByDate
 * Query params:
 * - year: Ano (ex: 2026)
 * - month: Mês (ex: 1 para janeiro)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    if (!yearParam || !monthParam) {
      return Response.json(
        { error: "Missing query parameters: year and month are required" },
        { status: 400 }
      )
    }

    const year = parseInt(yearParam, 10)
    const month = parseInt(monthParam, 10)

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return Response.json(
        { error: "Invalid year or month" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Monta intervalo de datas para o mês/ano
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]

    console.log(`[v0] Fetching ships for ${year}-${String(month).padStart(2, "0")}: ${startDate} to ${endDate}`)

    // Consulta navios do Supabase para o período
    const { data: shipsData, error: shipsError } = await supabase
      .from("navios")
      .select("*")
      .gte("data_embarque", startDate)
      .lte("data_embarque", endDate)
      .order("data_embarque", { ascending: false })

    if (shipsError) {
      console.error("[v0] Supabase error fetching ships:", shipsError)
      return Response.json(
        { error: "Failed to fetch ships from database" },
        { status: 500 }
      )
    }

    // Agrupa por data (YYYY-MM-DD)
    const shipsByDate: ShipsByDate = {}


    const toNumberOrNull = (v: any): number | null => {
      if (v === null || v === undefined) return null
      if (typeof v === "number") return Number.isNaN(v) ? null : v
      const s = String(v).trim()
      if (s === "") return null
      const n = Number(s)
      return Number.isNaN(n) ? null : n
    }

    /**
     * Normalizações de escala:
     * - Alguns dados antigos entram como "inteiro escalado" (ex: 135000000 -> 1350) para COR/RI.
     * - Toneladas às vezes entram como KG (ex: 82500000 -> 82500).
     */
    const normalizeCor = (v: any): number | null => {
      const n = toNumberOrNull(v)
      if (n === null) return null
      return n >= 100000 ? n / 100000 : n
    }

    const normalizeRi = (v: any): number | null => {
      const n = toNumberOrNull(v)
      if (n === null) return null
      return n >= 100000 ? n / 100000 : n
    }

    const normalizeTonnage = (v: any): number => {
      const n = toNumberOrNull(v)
      if (n === null) return 0
      // Se vier em kg (>= 1.000.000), converte para toneladas
      return n >= 1000000 ? n / 1000 : n
    }

    const toNumberOrZero = (v: any): number => {
      const n = toNumberOrNull(v)
      return n === null ? 0 : n
    }
    if (shipsData && shipsData.length > 0) {
      shipsData.forEach((row: any) => {
        const dateKey = row.data_embarque // já está no formato YYYY-MM-DD
        
        if (!shipsByDate[dateKey]) {
          shipsByDate[dateKey] = []
        }

        // Mapeia os campos do Supabase para o formato esperado
        const ship: Ship = {
          id: row.id,
          navio: row.navio || "",
          processo: row.processo || "",
          // No Supabase a coluna é "toneladas" (numeric). Mantemos o nome "quantidade" no front para compatibilidade.
          quantidade: normalizeTonnage(row.toneladas ?? row.quantidade),
          destino: row.destino || "",
          // No Supabase a coluna é "data_partida" (date). Se não existir, usamos a data_embarque.
          dataPrevista: row.data_partida || row.data_prevista || dateKey,
          cor: normalizeCor(row.cor),
          pol: toNumberOrNull(row.pol),
          umi: toNumberOrNull(row.umi),
          cin: toNumberOrNull(row.cin),
          ri: normalizeRi(row.ri),
          date: dateKey,
        }

        console.log(`[v0] Ship loaded: ${row.navio}, COR=${row.cor}, RI=${row.ri}, TON=${ship.quantidade}`)

        shipsByDate[dateKey].push(ship)
      })
    }

    console.log(`[v0] Ships fetched: ${Object.keys(shipsByDate).length} dates with data`)

    return Response.json({ shipsByDate }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in /api/ships:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
