// Carrega dados de navios do Vercel Blob
export interface Ship {
  id: string
  navio: string
  processo: string
  quantidade: number
  destino: string
  dataPrevista: string // Adicionado: Data de Partida Prevista
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  date: string // Data do arquivo CSV
}

export type ShipsByDate = Record<string, Ship[]>

// Cache para evitar re-fetching
type CachedShipData = {
  data: Ship[]
  ts: number
}

const SHIP_CACHE_TTL = 60000 // 60 segundos

const shipCache: Record<string, CachedShipData> = {}

/**
 * Limpa o cache de navios
 */
export function clearShipCache() {
  Object.keys(shipCache).forEach((key) => delete shipCache[key])
}

/**
 * Detecta o delimiter usado no CSV (, ou ;)
 */
function detectDelimiter(line: string): string {
  const commaCount = (line.match(/,/g) || []).length
  const semicolonCount = (line.match(/;/g) || []).length
  return semicolonCount > commaCount ? ";" : ","
}

/**
 * Parse uma linha CSV considerando aspas duplas e delimiter variável
 */
function parseCsvLine(line: string, delimiter = ","): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Normaliza nome de coluna para mapeamento (lowercase, sem espaços, sem acentos)
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[áàâã]/g, "a")
    .replace(/[éèê]/g, "e")
    .replace(/[íì]/g, "i")
    .replace(/[óòôõ]/g, "o")
    .replace(/[úù]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/\s+/g, "_")
}

/**
 * Cria mapa de índice de coluna baseado no header
 */
function createColumnMap(header: string[], delimiter: string): Record<string, number> {
  const map: Record<string, number> = {}
  const columns = parseCsvLine(header[0], delimiter)

  columns.forEach((col, index) => {
    const normalized = normalizeColumnName(col)

    // Mapeia variações de nome para chave padrão
    if (normalized.includes("data") && normalized.includes("prevista")) {
      map["dataprevista"] = index
    } else if (normalized === "data") {
      map["data"] = index
    } else if (normalized.includes("processo") || normalized.includes("process")) {
      map["processo"] = index
    } else if (normalized.includes("navio") || normalized.includes("vessel") || normalized.includes("ship")) {
      map["navio"] = index
    } else if (normalized.includes("destino") || normalized.includes("destination")) {
      map["destino"] = index
    } else if (
      normalized.includes("quantidade") ||
      normalized.includes("qtd") ||
      normalized.includes("peso") ||
      normalized.includes("toneladas") ||
      normalized.includes("tons")
    ) {
      map["quantidade"] = index
    } else if (normalized === "cor" || normalized === "color") {
      map["cor"] = index
    } else if (normalized === "pol") {
      map["pol"] = index
    } else if (normalized.includes("umi") || normalized.includes("umidade") || normalized.includes("moisture")) {
      map["umi"] = index
    } else if (normalized.includes("cin") || normalized.includes("cinza") || normalized.includes("ash")) {
      map["cin"] = index
    } else if (normalized === "ri") {
      map["ri"] = index
    }
  })

  return map
}

/**
 * Carrega navios de um arquivo CSV específico
 */
export async function loadShipsFromCsv(csvUrl: string, date: string): Promise<Ship[]> {
  const cached = shipCache[date]
  if (cached && Date.now() - cached.ts < SHIP_CACHE_TTL) {
    return cached.data
  }

  try {
    const cacheBuster = `?v=${Date.now()}`
    const urlWithCacheBuster = csvUrl.includes("?") ? `${csvUrl}&v=${Date.now()}` : `${csvUrl}${cacheBuster}`

    const response = await fetch(urlWithCacheBuster, { cache: "no-store" })

    if (!response.ok) {
      console.log(`[v0] CSV de navios não encontrado para ${date}`)
      shipCache[date] = { data: [], ts: Date.now() }
      return []
    }

    const text = await response.text()
    const lines = text.trim().split("\n")

    if (lines.length < 2) {
      shipCache[date] = { data: [], ts: Date.now() }
      return []
    }

    // Detecta delimiter a partir do header
    const delimiter = detectDelimiter(lines[0])

    // Cria mapa de colunas baseado no header
    const columnMap = createColumnMap([lines[0]], delimiter)

    const ships: Ship[] = []

    // Processa cada linha de dados
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCsvLine(line, delimiter)

      // Extrai valores usando o mapa de colunas
      const navio = columnMap["navio"] !== undefined ? values[columnMap["navio"]]?.replace(/"/g, "").trim() : ""
      const processo =
        columnMap["processo"] !== undefined ? values[columnMap["processo"]]?.replace(/"/g, "").trim() : ""
      const quantidadeStr =
        columnMap["quantidade"] !== undefined ? values[columnMap["quantidade"]]?.replace(/"/g, "").trim() : ""
      const destino = columnMap["destino"] !== undefined ? values[columnMap["destino"]]?.replace(/"/g, "").trim() : ""
      const dataPrevistaRaw =
        columnMap["dataprevista"] !== undefined ? values[columnMap["dataprevista"]]?.replace(/"/g, "").trim() : ""
      const corStr = columnMap["cor"] !== undefined ? values[columnMap["cor"]]?.replace(/"/g, "").trim() : ""
      const polStr = columnMap["pol"] !== undefined ? values[columnMap["pol"]]?.replace(/"/g, "").trim() : ""
      const umiStr = columnMap["umi"] !== undefined ? values[columnMap["umi"]]?.replace(/"/g, "").trim() : ""
      const cinStr = columnMap["cin"] !== undefined ? values[columnMap["cin"]]?.replace(/"/g, "").trim() : ""
      const riStr = columnMap["ri"] !== undefined ? values[columnMap["ri"]]?.replace(/"/g, "").trim() : ""

      // Valida campos obrigatórios (navio e quantidade)
      if (!navio || !quantidadeStr) {
        continue
      }

      const quantidade = Number.parseFloat(quantidadeStr.replace(",", ".")) || 0
      if (quantidade === 0) continue

      // Usa data do arquivo como fallback se dataPrevista vazia
      const dataPrevista = dataPrevistaRaw && dataPrevistaRaw !== "" ? dataPrevistaRaw : date

      const ship: Ship = {
        id: `${date}-${i}`,
        navio,
        processo: processo || "",
        quantidade,
        destino: destino || "",
        dataPrevista,
        cor: corStr && corStr !== "" ? Number.parseFloat(corStr.replace(",", ".")) : null,
        pol: polStr && polStr !== "" ? Number.parseFloat(polStr.replace(",", ".")) : null,
        umi: umiStr && umiStr !== "" ? Number.parseFloat(umiStr.replace(",", ".")) : null,
        cin: cinStr && cinStr !== "" ? Number.parseFloat(cinStr.replace(",", ".")) : null,
        ri: riStr && riStr !== "" ? Number.parseFloat(riStr.replace(",", ".")) : null,
        date: date,
      }

      ships.push(ship)
    }

    shipCache[date] = { data: ships, ts: Date.now() }
    return ships
  } catch (error) {
    console.log(`[v0] Erro ao carregar CSV de navios para ${date}:`, error)
    shipCache[date] = { data: [], ts: Date.now() }
    return []
  }
}

/**
 * Carrega todos os navios de um mapa de datas -> URLs
 */
export async function loadAllShips(csvMap: Record<string, string>): Promise<ShipsByDate> {
  const shipsByDate: ShipsByDate = {}

  const entries = Object.entries(csvMap)

  await Promise.all(
    entries.map(async ([date, url]) => {
      const ships = await loadShipsFromCsv(url, date)
      if (ships.length > 0) {
        shipsByDate[date] = ships
      }
    }),
  )

  return shipsByDate
}

import { listShipCsvByDate } from "./blob-storage"

/**
 * Carrega todos os navios diretamente do Blob
 */
export async function loadAllShipsFromBlob(): Promise<ShipsByDate> {
  const csvMap = await listShipCsvByDate()
  return await loadAllShips(csvMap)
}

/**
 * Agrupa navios por nome do navio
 */
export function groupShipsByName(shipsByDate: ShipsByDate): Record<string, Ship[]> {
  const grouped: Record<string, Ship[]> = {}

  Object.values(shipsByDate).forEach((ships) => {
    ships.forEach((ship) => {
      const name = ship.navio.trim().toUpperCase()
      if (!grouped[name]) {
        grouped[name] = []
      }
      grouped[name].push(ship)
    })
  })

  // Ordena cada grupo por data decrescente
  Object.keys(grouped).forEach((name) => {
    grouped[name].sort((a, b) => b.date.localeCompare(a.date))
  })

  return grouped
}

/**
 * Retorna lista única de navios com informações resumidas
 */
export function getUniqueShips(shipsByDate: ShipsByDate): Array<{
  name: string
  totalQuantity: number
  recordCount: number
  lastDate: string
  destinations: string[]
}> {
  const grouped = groupShipsByName(shipsByDate)

  return Object.entries(grouped)
    .map(([name, ships]) => ({
      name,
      totalQuantity: ships.reduce((sum, s) => sum + s.quantidade, 0),
      recordCount: ships.length,
      lastDate: ships[0]?.date || "",
      destinations: [...new Set(ships.map((s) => s.destino).filter(Boolean))],
    }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}
