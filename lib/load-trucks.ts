export type Truck = {
  id: number
  licensePlate: string
  nfNumber: string
  client: string
  supplier: string
  // Campos de autorização (doublecheck do laboratório)
  autorizacao: "APROVADO" | "RECUSADO" | null // null = aguardando
  dataAutorizacao: string | null
  dataAutorizacaoFormatada: string | null
  nomeUsuarioAutorizacao: string | null
  grossWeight: number
  // Análises finais (resultado definitivo - pode ser NIR ou Doublecheck)
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  // Datas das análises finais (NIR ou Doublecheck se houver)
  corData: string | null
  polData: string | null
  umiData: string | null
  cinData: string | null
  riData: string | null
  // Análises anteriores do NIR (se houve doublecheck)
  corAnterior: number | null
  polAnterior: number | null
  umiAnterior: number | null
  cinAnterior: number | null
  riAnterior: number | null
  // Datas NIR (sempre presente quando há análise NIR)
  corDataNir: string | null
  polDataNir: string | null
  umiDataNir: string | null
  cinDataNir: string | null
  riDataNir: string | null
  // Analistas
  corAnalista: string | null
  polAnalista: string | null
  umiAnalista: string | null
  cinAnalista: string | null
  riAnalista: string | null
  // Analistas anteriores (NIR se houve doublecheck)
  corAnalistaAnterior: string | null
  polAnalistaAnterior: string | null
  umiAnalistaAnterior: string | null
  cinAnalistaAnterior: string | null
  riAnalistaAnterior: string | null
  // Links para boletins
  linkBoletimDb: string | null // Link do doublecheck
  linkBoletimB7: string | null // Link do Bola 7
  // Status calculado
  status: "approved" | "apurado" | "rejected"
  isRepeated: boolean
  hasOtherOutOfSpec: boolean
  // Indica se houve doublecheck (tem algum valor _anterior)
  houveDoublecheck: boolean
  // Indica se é um caminhão Bola 7
  isBola7: boolean
}

// Margens de especificação
const specifications = {
  cor: { max: 1250 },
  cin: { max: 0.2 },
  pol: { min: 98.9, max: 99.6 },
  ri: { max: 500 },
  umi: { max: 0.2 },
}

export type DayQualityStats = {
  cor: number
  pol: number
  umi: number
  cin: number
  ri: number
  hasData: boolean
}

export type DayStatsByDate = Record<string, DayQualityStats>

function parseDecimal(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null

  const trimmed = value.trim()

  // Detecta formato brasileiro: "91.771,550" ou "0,10"
  const hasBrFormat =
    trimmed.includes(",") && (trimmed.indexOf(",") > trimmed.lastIndexOf(".") || !trimmed.includes("."))

  let normalized: string

  if (hasBrFormat) {
    // Formato BR: remove pontos (milhares) e troca vírgula por ponto
    normalized = trimmed.replace(/\./g, "").replace(",", ".")
  } else {
    // Formato US/CSV: já usa ponto como decimal
    normalized = trimmed.replace(/,/g, "")
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Parse uma linha CSV considerando aspas duplas para campos com vírgulas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function cleanStringValue(value: string | undefined): string {
  if (!value) return ""

  // Remove aspas duplas do início e fim, e faz trim
  let cleaned = value.trim().replace(/^["]+|["]+$/g, "")

  // Remove "(STA)" de "SAO MARTINHO (STA)" - corrigido para usar \( e \) ao invés de $$
  cleaned = cleaned.replace(/\s*\(STA\)\s*$/i, "")

  // Remove "57-95" de "BARRA SANTA CANDIDA 57-95"
  cleaned = cleaned.replace(/\s+57-95\s*$/i, "")

  return cleaned.trim()
}

// Valores como "1.151" no CSV significam 1151, não 1.151
function parseIntegerWithThousandsSeparator(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null

  const trimmed = value.trim()

  // Remove pontos (separadores de milhares) e vírgulas
  // "1.151" -> "1151", "1,151" -> "1151"
  const normalized = trimmed.replace(/[.,]/g, "")

  const parsed = Number.parseInt(normalized, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parsePtBrDateTime(input: string | null): Date | null {
  if (!input) return null

  // Ex.: "22/01/2026 10:50:30" ou "22/01/2026 10:50"
  const [datePart, timePartRaw] = input.trim().split(" ")
  if (!datePart) return null

  const [dd, mm, yyyy] = datePart.split("/").map(Number)
  if (!dd || !mm || !yyyy) return null

  const [HH = 0, MI = 0, SS = 0] = (timePartRaw ?? "").split(":").map((v) => Number(v))
  const d = new Date(yyyy, mm - 1, dd, HH, MI, SS)

  return Number.isNaN(d.getTime()) ? null : d
}

function formatPtBrAutorizacao(date: Date): string {
  const dateText = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)

  const timeText = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)

  // O mês em pt-BR costuma vir minúsculo ("janeiro"). Vamos capitalizar.
  const prettyDate = dateText.replace(/de\s+([a-záéíóúâêôãõç]+)/i, (_, m) => `de ${m[0].toUpperCase()}${m.slice(1)}`)

  return `${prettyDate} às ${timeText}`
}

function isCorOutOfSpec(truck: { cor: number | null }): boolean {
  return truck.cor !== null && truck.cor > specifications.cor.max
}

function isPolOutOfSpec(truck: { pol: number | null }): boolean {
  return truck.pol !== null && (truck.pol < specifications.pol.min || truck.pol > specifications.pol.max)
}

function isUmiOutOfSpec(truck: { umi: number | null }): boolean {
  return truck.umi !== null && truck.umi > specifications.umi.max
}

function isCinOutOfSpec(truck: { cin: number | null }): boolean {
  return truck.cin !== null && truck.cin > specifications.cin.max
}

function isRiOutOfSpec(truck: { ri: number | null }): boolean {
  return truck.ri !== null && truck.ri > specifications.ri.max
}

function classifyTruck(truck: {
  cor: number | null
  cin: number | null
  pol: number | null
  ri: number | null
  umi: number | null
}): "approved" | "apurado" | "rejected" {
  const nonRiOut = isCorOutOfSpec(truck) || isPolOutOfSpec(truck) || isUmiOutOfSpec(truck) || isCinOutOfSpec(truck)
  const riOut = isRiOutOfSpec(truck)

  if (riOut) {
    return "rejected" // RI out of spec = Rejeitado
  } else if (nonRiOut) {
    return "apurado" // Non-RI out of spec = Apurado
  } else {
    return "approved" // All within spec = Aprovado
  }
}

function hasOtherAnalysesOutOfSpec(truck: {
  cor: number | null
  cin: number | null
  pol: number | null
  umi: number | null
}): boolean {
  return isCorOutOfSpec(truck) || isPolOutOfSpec(truck) || isUmiOutOfSpec(truck) || isCinOutOfSpec(truck)
}

type CachedData<T> = {
  data: T
  ts: number
}

const CSV_CACHE_TTL = 60000 // 60 segundos

const csvCache = new Map<string, CachedData<Truck[]>>()
let cachedCsvMap: CachedData<Record<string, string>> | null = null

export function clearTruckCache() {
  csvCache.clear()
  cachedCsvMap = null
  console.log("[v0] Truck cache cleared")
}

async function loadTrucksFromCsv(path: string): Promise<Truck[]> {
    const cached = csvCache.get(path)
  if (cached && Date.now() - cached.ts < CSV_CACHE_TTL) {
    console.log(`[v0] Using cached trucks for: ${path}`)
    return cached.data
  }

  try {
    const cacheBuster = `?v=${Date.now()}`
    const urlWithCacheBuster = path.includes("?") ? `${path}&v=${Date.now()}` : `${path}${cacheBuster}`

    console.log(`[v0] Fetching trucks from CSV: ${urlWithCacheBuster}`)
    const response = await fetch(urlWithCacheBuster, { cache: "no-store" })

    if (!response.ok) {
      console.log(`[v0] Arquivo CSV não encontrado (${response.status}): ${path}`)
      csvCache.set(path, { data: [], ts: Date.now() })
      return []
    }

    const text = await response.text()
    const lines = text.trim().split(/\r?\n/)
    console.log(`[v0] CSV loaded with ${lines.length} lines from ${path}`)

    const headerLine = lines[0]
    const headers = parseCsvLine(headerLine).map((h) => h.trim().toLowerCase())

    // Map column names to indices (supports both old and new formats)
    const colIndex = {
      id: headers.findIndex((h) => h === "id" || h === "caminhao"),
      placa: headers.findIndex((h) => h === "placa"),
      notaFiscal: headers.findIndex((h) => h === "nota_fiscal"),
      cliente: headers.findIndex((h) => h === "cliente"),
      fornecedor: headers.findIndex((h) => h === "fornecedor"),
      // Novos campos de autorização (doublecheck)
      autorizacao: headers.findIndex((h) => h === "autorizacao"),
      dataAutorizacao: headers.findIndex((h) => h === "data_autorizacao"),
      peso: headers.findIndex((h) => h === "peso" || h === "peso_liquido_t"),
      // Análises finais (resultado NIR ou Doublecheck)
      cor: headers.findIndex((h) => h === "cor"),
      pol: headers.findIndex((h) => h === "pol"),
      umi: headers.findIndex((h) => h === "umi" || h === "um"),
      cin: headers.findIndex((h) => h === "cin"),
      ri: headers.findIndex((h) => h === "ri"),
      // Datas das análises finais
      corData: headers.findIndex((h) => h === "cor_data"),
      polData: headers.findIndex((h) => h === "pol_data"),
      umiData: headers.findIndex((h) => h === "umi_data"),
      cinData: headers.findIndex((h) => h === "cin_data"),
      riData: headers.findIndex((h) => h === "ri_data"),
      // Análises anteriores (NIR - antes do doublecheck)
      corAnterior: headers.findIndex((h) => h === "cor_anterior"),
      polAnterior: headers.findIndex((h) => h === "pol_anterior"),
      umiAnterior: headers.findIndex((h) => h === "umi_anterior"),
      cinAnterior: headers.findIndex((h) => h === "cin_anterior"),
      riAnterior: headers.findIndex((h) => h === "ri_anterior"),
      // Datas NIR (sempre data original do NIR)
      corDataNir: headers.findIndex((h) => h === "cor_data_nir"),
      polDataNir: headers.findIndex((h) => h === "pol_data_nir"),
      umiDataNir: headers.findIndex((h) => h === "umi_data_nir"),
      cinDataNir: headers.findIndex((h) => h === "cin_data_nir"),
      riDataNir: headers.findIndex((h) => h === "ri_data_nir"),
      // Analistas
      corAnalista: headers.findIndex((h) => h === "cor_analista"),
      polAnalista: headers.findIndex((h) => h === "pol_analista"),
      umiAnalista: headers.findIndex((h) => h === "umi_analista"),
      cinAnalista: headers.findIndex((h) => h === "cin_analista"),
      riAnalista: headers.findIndex((h) => h === "ri_analista"),
      // Analistas anteriores
      corAnalistaAnterior: headers.findIndex((h) => h === "cor_analista_anterior"),
      polAnalistaAnterior: headers.findIndex((h) => h === "pol_analista_anterior"),
      umiAnalistaAnterior: headers.findIndex((h) => h === "umi_analista_anterior"),
      cinAnalistaAnterior: headers.findIndex((h) => h === "cin_analista_anterior"),
      riAnalistaAnterior: headers.findIndex((h) => h === "ri_analista_anterior"),
      // Links para boletins
      linkBoletimDb: headers.findIndex((h) => h === "link_boletim_db"),
      linkBoletimB7: headers.findIndex((h) => h === "link_boletim_b7"),
    }

    // Remove header line
    const dataLines = lines.slice(1).filter((line) => line.trim())

    const trucks: Truck[] = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const parts = parseCsvLine(line)

      const id = colIndex.id >= 0 && parts[colIndex.id] ? Number.parseInt(parts[colIndex.id], 10) : 0
      const licensePlate = colIndex.placa >= 0 ? parts[colIndex.placa]?.trim() || "" : ""

      if (!id || !licensePlate) {
        console.warn(`[v0] CSV: Linha sem id ou placa será pulada:`, line.substring(0, 50))
        continue
      }

      const nfNumber = colIndex.notaFiscal >= 0 ? parts[colIndex.notaFiscal]?.trim() || "" : ""
      const client = colIndex.cliente >= 0 ? cleanStringValue(parts[colIndex.cliente]) : ""
      const supplier = colIndex.fornecedor >= 0 ? cleanStringValue(parts[colIndex.fornecedor]) : ""

      // Campos de autorização (doublecheck do laboratório)
      const autorizacaoRaw = colIndex.autorizacao >= 0 ? parts[colIndex.autorizacao]?.trim().toUpperCase() || "" : ""
      const autorizacao: "APROVADO" | "RECUSADO" | null =
        autorizacaoRaw === "APROVADO" ? "APROVADO" : autorizacaoRaw === "RECUSADO" ? "RECUSADO" : null
      
      // NÃO inferir data automaticamente - usar apenas o que está no CSV
      const dataAutorizacaoRaw =
        colIndex.dataAutorizacao >= 0 && parts[colIndex.dataAutorizacao]?.trim() 
          ? parts[colIndex.dataAutorizacao].trim() 
          : null
      
      const parsedDataAutorizacao = dataAutorizacaoRaw ? parsePtBrDateTime(dataAutorizacaoRaw) : null
      const dataAutorizacaoFormatada = parsedDataAutorizacao ? formatPtBrAutorizacao(parsedDataAutorizacao) : null

      const grossWeight = parseDecimal(colIndex.peso >= 0 ? parts[colIndex.peso] : null) ?? 0

      // Análises finais (resultado definitivo - pode ser NIR ou Doublecheck)
      const cor = parseIntegerWithThousandsSeparator(colIndex.cor >= 0 ? parts[colIndex.cor] : null)
      const pol = parseDecimal(colIndex.pol >= 0 ? parts[colIndex.pol] : null)
      const umi = parseDecimal(colIndex.umi >= 0 ? parts[colIndex.umi] : null)
      const cin = parseDecimal(colIndex.cin >= 0 ? parts[colIndex.cin] : null)
      const ri = parseIntegerWithThousandsSeparator(colIndex.ri >= 0 ? parts[colIndex.ri] : null)

      // Datas das análises finais
      const corData = colIndex.corData >= 0 && parts[colIndex.corData]?.trim() ? parts[colIndex.corData].trim() : null
      const polData = colIndex.polData >= 0 && parts[colIndex.polData]?.trim() ? parts[colIndex.polData].trim() : null
      const umiData = colIndex.umiData >= 0 && parts[colIndex.umiData]?.trim() ? parts[colIndex.umiData].trim() : null
      const cinData = colIndex.cinData >= 0 && parts[colIndex.cinData]?.trim() ? parts[colIndex.cinData].trim() : null
      const riData = colIndex.riData >= 0 && parts[colIndex.riData]?.trim() ? parts[colIndex.riData].trim() : null

      // Análises anteriores do NIR (se houve doublecheck)
      const corAnterior = parseIntegerWithThousandsSeparator(
        colIndex.corAnterior >= 0 ? parts[colIndex.corAnterior] : null
      )
      const polAnterior = parseDecimal(colIndex.polAnterior >= 0 ? parts[colIndex.polAnterior] : null)
      const umiAnterior = parseDecimal(colIndex.umiAnterior >= 0 ? parts[colIndex.umiAnterior] : null)
      const cinAnterior = parseDecimal(colIndex.cinAnterior >= 0 ? parts[colIndex.cinAnterior] : null)
      const riAnterior = parseIntegerWithThousandsSeparator(
        colIndex.riAnterior >= 0 ? parts[colIndex.riAnterior] : null
      )

      // Datas NIR (sempre data original do NIR)
      const corDataNir = colIndex.corDataNir >= 0 && parts[colIndex.corDataNir]?.trim() ? parts[colIndex.corDataNir].trim() : null
      const polDataNir = colIndex.polDataNir >= 0 && parts[colIndex.polDataNir]?.trim() ? parts[colIndex.polDataNir].trim() : null
      const umiDataNir = colIndex.umiDataNir >= 0 && parts[colIndex.umiDataNir]?.trim() ? parts[colIndex.umiDataNir].trim() : null
      const cinDataNir = colIndex.cinDataNir >= 0 && parts[colIndex.cinDataNir]?.trim() ? parts[colIndex.cinDataNir].trim() : null
      const riDataNir = colIndex.riDataNir >= 0 && parts[colIndex.riDataNir]?.trim() ? parts[colIndex.riDataNir].trim() : null

      // Analistas (não exibir "robo_lab", apenas nomes reais de agentes)
      const corAnalista = colIndex.corAnalista >= 0 && parts[colIndex.corAnalista]?.trim() ? parts[colIndex.corAnalista].trim() : null
      const polAnalista = colIndex.polAnalista >= 0 && parts[colIndex.polAnalista]?.trim() ? parts[colIndex.polAnalista].trim() : null
      const umiAnalista = colIndex.umiAnalista >= 0 && parts[colIndex.umiAnalista]?.trim() ? parts[colIndex.umiAnalista].trim() : null
      const cinAnalista = colIndex.cinAnalista >= 0 && parts[colIndex.cinAnalista]?.trim() ? parts[colIndex.cinAnalista].trim() : null
      const riAnalista = colIndex.riAnalista >= 0 && parts[colIndex.riAnalista]?.trim() ? parts[colIndex.riAnalista].trim() : null

      // Analistas anteriores
      const corAnalistaAnterior = colIndex.corAnalistaAnterior >= 0 && parts[colIndex.corAnalistaAnterior]?.trim() ? parts[colIndex.corAnalistaAnterior].trim() : null
      const polAnalistaAnterior = colIndex.polAnalistaAnterior >= 0 && parts[colIndex.polAnalistaAnterior]?.trim() ? parts[colIndex.polAnalistaAnterior].trim() : null
      const umiAnalistaAnterior = colIndex.umiAnalistaAnterior >= 0 && parts[colIndex.umiAnalistaAnterior]?.trim() ? parts[colIndex.umiAnalistaAnterior].trim() : null
      const cinAnalistaAnterior = colIndex.cinAnalistaAnterior >= 0 && parts[colIndex.cinAnalistaAnterior]?.trim() ? parts[colIndex.cinAnalistaAnterior].trim() : null
      const riAnalistaAnterior = colIndex.riAnalistaAnterior >= 0 && parts[colIndex.riAnalistaAnterior]?.trim() ? parts[colIndex.riAnalistaAnterior].trim() : null

      // Links para boletins
      const linkBoletimDb = colIndex.linkBoletimDb >= 0 && parts[colIndex.linkBoletimDb]?.trim() ? parts[colIndex.linkBoletimDb].trim() : null
      const linkBoletimB7 = colIndex.linkBoletimB7 >= 0 && parts[colIndex.linkBoletimB7]?.trim() ? parts[colIndex.linkBoletimB7].trim() : null

      // Indica se houve doublecheck (tem algum valor _anterior preenchido OU tem dados de autorização)
      const temValoresAnteriores =
        corAnterior !== null ||
        polAnterior !== null ||
        umiAnterior !== null ||
        cinAnterior !== null ||
        riAnterior !== null
      
      // Se tem autorização preenchida OU dados anteriores OU link de doublecheck, houve doublecheck
      const houveDoublecheck = temValoresAnteriores || autorizacao !== null || dataAutorizacaoRaw !== null || linkBoletimDb !== null
      
      // Indica se é caminhão Bola 7 (tem link de boletim B7)
      const isBola7 = linkBoletimB7 !== null && linkBoletimB7.trim() !== ""

      const truck: Truck = {
        id,
        licensePlate,
        nfNumber,
        client,
        supplier,
        autorizacao,
        dataAutorizacao: dataAutorizacaoRaw,
        dataAutorizacaoFormatada,
        nomeUsuarioAutorizacao: null, // Removido do CSV novo
        grossWeight,
        cor,
        pol,
        umi,
        cin,
        ri,
        corData,
        polData,
        umiData,
        cinData,
        riData,
        corAnterior,
        polAnterior,
        umiAnterior,
        cinAnterior,
        riAnterior,
        corDataNir,
        polDataNir,
        umiDataNir,
        cinDataNir,
        riDataNir,
        corAnalista,
        polAnalista,
        umiAnalista,
        cinAnalista,
        riAnalista,
        corAnalistaAnterior,
        polAnalistaAnterior,
        umiAnalistaAnterior,
        cinAnalistaAnterior,
        riAnalistaAnterior,
        linkBoletimDb,
        linkBoletimB7,
        status: "approved",
        isRepeated: false,
        hasOtherOutOfSpec: false,
        houveDoublecheck,
        isBola7,
      }

      // Determine status based on specifications
      truck.status = classifyTruck(truck)
      truck.hasOtherOutOfSpec = hasOtherAnalysesOutOfSpec(truck)
      
      // houveDoublecheck é TRUE apenas se:
      // 1. Tem valores _anterior preenchidos (já foi feito doublecheck)
      // 2. OU tem dados de autorização preenchidos (já passou pelo lab)
      // NÃO marca como doublecheck apenas pelo status - o status "apurado"/"rejected" 
      // pode ser do NIR antes de ir para o lab

      trucks.push(truck)
    }

    csvCache.set(path, { data: trucks, ts: Date.now() })

    return trucks
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG_CSV === "true") {
      console.log(`[v0] Erro ao carregar CSV ${path}:`, error instanceof Error ? error.message : error)
    }
    csvCache.set(path, { data: [], ts: Date.now() })
    return []
  }
}

export async function getTruckCsvUrlForDate(dateISO: string): Promise<string> {
  const csvMap = await getCsvMap()
  const csvUrl = csvMap[dateISO]

  if (!csvUrl) {
    throw new Error(`Não há dados de caminhões disponíveis para a data ${dateISO}`)
  }

  return csvUrl
}

import { listTruckCsvByDate } from "./blob-storage"

async function getCsvMap(): Promise<Record<string, string>> {
  if (cachedCsvMap && Date.now() - cachedCsvMap.ts < CSV_CACHE_TTL) {
    return cachedCsvMap.data
  }

  const isClient = typeof window !== "undefined"

  if (!isClient) {
    // Only try Blob API on server side
    try {
      const blobMap = await listTruckCsvByDate()
      if (Object.keys(blobMap).length > 0) {
        cachedCsvMap = { data: blobMap, ts: Date.now() }
        if (process.env.NEXT_PUBLIC_DEBUG_CSV === "true") {
          console.log("[v0] CSV Map carregado do Blob:", Object.keys(blobMap).length, "datas disponíveis")
        }
        return blobMap
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar do Blob, tentando API:", error instanceof Error ? error.message : error)
    }
  }

  // Client side or Blob failed - use API
  try {
    const response = await fetch("/api/list-csv", {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error("[v0] Error listing CSV files: HTTP", response.status)
      return {}
    }

    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      console.error("[v0] Invalid content-type from /api/list-csv:", contentType)
      return {}
    }

    const json = await response.json()

    let mapData: Record<string, string> = {}

    if (json.data && typeof json.data === "object") {
      mapData = json.data
    } else if (json.byDate && typeof json.byDate === "object") {
      mapData = json.byDate
    } else if (typeof json === "object" && json !== null && !json.error && !json.ok) {
      mapData = json
    } else {
      console.warn("[v0] Unexpected response format from /api/list-csv:", json)
      mapData = {}
    }

    cachedCsvMap = { data: mapData, ts: Date.now() }

    console.log("[v0] CSV Map loaded:", Object.keys(mapData).length, "dates available")

    return mapData
  } catch (error) {
    if (error instanceof Error) {
      console.error("[v0] Error loading CSV list:", error.message)
    } else {
      console.error("[v0] Error loading CSV list:", error)
    }
    return {}
  }
}

export async function loadTrucksForDate(date: string): Promise<Truck[] | null> {
  try {
    const csvMap = await getCsvMap()
    const csvFilePath = csvMap[date]

    if (!csvFilePath) {
      console.log(`[v0] No CSV found for date: ${date}`)
      return null
    }

    console.log(`[v0] Loading trucks from Blob for ${date}: ${csvFilePath}`)

    const trucks = await loadTrucksFromCsv(csvFilePath)
    console.log(`[v0] Loaded ${trucks.length} trucks for date ${date}`)
    return trucks.length > 0 ? trucks : null
  } catch (error) {
    console.error(`[v0] Erro ao carregar caminhões para ${date}:`, error)
    return null
  }
}

export async function getAvailableDates(): Promise<string[]> {
  const csvMap = await getCsvMap()
  return Object.keys(csvMap).sort()
}
