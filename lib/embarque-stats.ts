import type { ShipsByDate, Ship } from "./load-ships"

export interface EmbarqueMonthStats {
  hasData: boolean
  totalShips: number
  totalTonnage: number
  qualityMetrics: {
    cor: number
    pol: number
    umi: number
    cin: number
    ri: number
  }
}

/**
 * Calcula estatísticas do mês de embarque de forma centralizada
 * Garante consistência entre Desktop e Mobile
 */
export function calculateEmbarqueMonthStats(params: {
  shipsByDate: ShipsByDate
  year: number
  monthIndex: number
  onlyUntilToday?: boolean
}): EmbarqueMonthStats {
  const { shipsByDate, year, monthIndex, onlyUntilToday = true } = params

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const uniqueRecords = new Map<
    string,
    {
      tonnage: number
      cor: number | null
      pol: number | null
      umi: number | null
      cin: number | null
      ri: number | null
    }
  >()

  const allRecordsForAvg: Array<{
    cor: number | null
    pol: number | null
    umi: number | null
    cin: number | null
    ri: number | null
  }> = []

  // Função auxiliar para garantir número válido (sem "corrigir" escala)
  const normalizeValue = (value: number | null): number | null => {
    if (value === null) return null
    return Number.isNaN(value) ? null : value
  }

  // Iterar sobre todos os registros
  Object.entries(shipsByDate).forEach(([dateKey, ships]) => {
    // Filtrar pelo mês (data do arquivo CSV)
    if (!dateKey.startsWith(monthKey)) return

    if (onlyUntilToday) {
      const [yearStr, monthStr, dayStr] = dateKey.split("-").map(Number)
      if (yearStr && monthStr && dayStr) {
        const fileDate = new Date(yearStr, monthStr - 1, dayStr)
        fileDate.setHours(0, 0, 0, 0)
        if (fileDate > today) return
      }
    }

    ships.forEach((ship: Ship) => {
      const shipName = ship.navio?.trim().toUpperCase()
      if (!shipName) return

      const uniqueKey = `${dateKey}|${ship.processo || ""}`

      // Se já existe, NÃO acumula (cada registro é individual)
      if (!uniqueRecords.has(uniqueKey)) {
        uniqueRecords.set(uniqueKey, {
          tonnage: ship.quantidade || 0,
          cor: normalizeValue(ship.cor),
          pol: normalizeValue(ship.pol),
          umi: normalizeValue(ship.umi),
          cin: normalizeValue(ship.cin),
          ri: normalizeValue(ship.ri),
        })
      }

      allRecordsForAvg.push({
        cor: normalizeValue(ship.cor),
        pol: normalizeValue(ship.pol),
        umi: normalizeValue(ship.umi),
        cin: normalizeValue(ship.cin),
        ri: normalizeValue(ship.ri),
      })
    })
  })

  let totalTonnage = 0
  uniqueRecords.forEach((record) => {
    console.log(`[v0] Adding tonnage: ${record.tonnage}`)
    totalTonnage += record.tonnage
  })
  console.log(`[v0] Total tonnage calculated: ${totalTonnage} from ${uniqueRecords.size} unique records`)

  let totalCor = 0,
    countCor = 0
  let totalPol = 0,
    countPol = 0
  let totalUmi = 0,
    countUmi = 0
  let totalCin = 0,
    countCin = 0
  let totalRi = 0,
    countRi = 0

  allRecordsForAvg.forEach((record) => {
    if (record.cor !== null) {
      totalCor += record.cor
      countCor++
    }
    if (record.pol !== null) {
      totalPol += record.pol
      countPol++
    }
    if (record.umi !== null) {
      totalUmi += record.umi
      countUmi++
    }
    if (record.cin !== null) {
      totalCin += record.cin
      countCin++
    }
    if (record.ri !== null) {
      totalRi += record.ri
      countRi++
    }
  })

  if (process.env.NODE_ENV === "development") {
    console.log("[v0] Embarque Stats Debug:", {
      monthKey,
      totalShips: uniqueRecords.size,
      totalTonnage,
      uniqueKeys: Array.from(uniqueRecords.keys()).slice(0, 5),
      totalRecordsForAvg: allRecordsForAvg.length,
    })
  }

  return {
    hasData: uniqueRecords.size > 0,
    totalShips: uniqueRecords.size,
    totalTonnage,
    qualityMetrics: {
      cor: countCor > 0 ? totalCor / countCor : 0,
      pol: countPol > 0 ? totalPol / countPol : 0,
      umi: countUmi > 0 ? totalUmi / countUmi : 0,
      cin: countCin > 0 ? totalCin / countCin : 0,
      ri: countRi > 0 ? totalRi / countRi : 0,
    },
  }
}
