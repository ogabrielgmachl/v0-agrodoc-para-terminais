"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LayoutGrid,
  X,
  Clock,
  History,
  Beaker,
  Scan,
  FileText,
  Download,
  } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCor, formatPol, formatUmi, formatCin, formatRi, formatDecimal, formatDateTimePtBr, formatWeight, updateBoletimToken } from "@/lib/utils"
import { exportTrucksToPDF, exportQualityAnalysisToPDF } from "@/lib/pdf-export"

interface TruckData {
  id: string
  licensePlate: string
  grossWeight: number
  // Campos de autorização (doublecheck do laboratório)
  autorizacao: "APROVADO" | "RECUSADO" | null
  dataAutorizacao: string | null
  dataAutorizacaoFormatada: string | null
  nomeUsuarioAutorizacao: string | null
  // Análises finais (resultado NIR ou Doublecheck)
  cor: number | null
  pol: number | null
  umi: number | null
  cin: number | null
  ri: number | null
  // Datas das análises finais
  corData: string | null
  polData: string | null
  umiData: string | null
  cinData: string | null
  riData: string | null
  // Análises anteriores (NIR)
  corAnterior: number | null
  polAnterior: number | null
  umiAnterior: number | null
  cinAnterior: number | null
  riAnterior: number | null
  // Datas NIR (sempre data original do NIR)
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
  // Analistas anteriores
  corAnalistaAnterior: string | null
  polAnalistaAnterior: string | null
  umiAnalistaAnterior: string | null
  cinAnalistaAnterior: string | null
  riAnalistaAnterior: string | null
  // Links para boletins
  linkBoletimDb: string | null
  linkBoletimB7: string | null
  status: "approved" | "rejected" | "apurado"
  client: string
  supplier: string
  nfNumber: string | null
  isRepeated: boolean
  hasOtherOutOfSpec: boolean
  houveDoublecheck: boolean
  isBola7: boolean
}

interface DayViewOverlayProps {
  selectedDay: Date
  isDarkMode: boolean
  trucksByDate: Record<string, TruckData[]>
  onClose: () => void
  initialSearchTerm?: string // Initial search term to filter trucks
  // Callbacks for state management
  onFilterStatusChange?: (status: "all" | "approved" | "apurado" | "rejected") => void
  onCurrentPageChange?: (page: number) => void
  onTableViewModeChange?: (mode: "main" | "by-client") => void
  onPreviousDay?: () => void
  onNextDay?: () => void
}

const ITEMS_PER_PAGE = 10

const qualityLimits = {
  pol: { min: 98.9, max: 99.6 },
  cor: { max: 1250 },
  cin: { max: 0.2 },
  ri: { max: 500 },
  um: { max: 0.2 },
}

const isOutOfSpec = (metric: string, value: number): boolean => {
  switch (metric) {
    case "pol":
      return value < qualityLimits.pol.min || value > qualityLimits.pol.max
    case "cor":
      return value > qualityLimits.cor.max
    case "cin":
      return value > qualityLimits.cin.max
    case "ri":
      return value > qualityLimits.ri.max
    case "um":
      return value > qualityLimits.um.max
    default:
      return false
  }
}

const hasIncompleteData = (truck: TruckData): boolean => {
  return (
    !truck.licensePlate ||
    truck.licensePlate.trim() === "" ||
    !truck.nfNumber ||
    truck.nfNumber.trim() === "" ||
    !truck.client ||
    truck.client.trim() === "" ||
    !truck.supplier ||
    truck.supplier.trim() === "" ||
    truck.grossWeight === null ||
    truck.grossWeight === 0 ||
    truck.cor === null ||
    truck.pol === null ||
    truck.umi === null ||
    truck.cin === null ||
    truck.ri === null
  )
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

// Helper function to format date for history display
const formatHistoryDate = (dateStr: string | null): string => {
  if (!dateStr) return ""

  // Remove wrapping quotes if CSV stored them
  const cleaned = dateStr.replace(/^"+|"+$/g, "").trim()
  if (!cleaned) return ""

  // Handle pt-BR format: DD/MM/YYYY HH:mm:ss (or without seconds)
  const m = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)

  if (m) {
    const dd = Number(m[1])
    const mm = Number(m[2])
    const yyyy = Number(m[3])
    const HH = Number(m[4] ?? 0)
    const MI = Number(m[5] ?? 0)
    const date = new Date(yyyy, mm - 1, dd, HH, MI, 0)

    if (!Number.isNaN(date.getTime())) {
      const day = date.getDate()
      const monthName = months[date.getMonth()]
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${day} de ${monthName} de ${year} às ${hours}:${minutes}`
    }
  }

  // Fallback: try ISO or other JS-friendly formats
  try {
    const date = new Date(cleaned)
    if (Number.isNaN(date.getTime())) return cleaned

    const day = date.getDate()
    const monthName = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")

    return `${day} de ${monthName} de ${year} às ${hours}:${minutes}`
  } catch {
    return cleaned
  }
}

// Helper function to get which analyses went out of spec in NIR
// Se tiver valores _anterior, usa eles. Senão, verifica os valores atuais (para compatibilidade com CSVs antigos)
const getOutOfSpecAnalyses = (truck: TruckData): string[] => {
  const outOfSpec: string[] = []
  const temValoresAnteriores =
    truck.corAnterior !== null ||
    truck.polAnterior !== null ||
    truck.umiAnterior !== null ||
    truck.cinAnterior !== null ||
    truck.riAnterior !== null

  if (temValoresAnteriores) {
    // Usa valores anteriores do NIR
    if (truck.corAnterior !== null && isOutOfSpec("cor", truck.corAnterior)) outOfSpec.push("COR")
    if (truck.polAnterior !== null && isOutOfSpec("pol", truck.polAnterior)) outOfSpec.push("POL")
    if (truck.umiAnterior !== null && isOutOfSpec("um", truck.umiAnterior)) outOfSpec.push("UMI")
    if (truck.cinAnterior !== null && isOutOfSpec("cin", truck.cinAnterior)) outOfSpec.push("CIN")
    if (truck.riAnterior !== null && isOutOfSpec("ri", truck.riAnterior)) outOfSpec.push("RI")
  } else {
    // Fallback: usa valores atuais para identificar o que está fora de spec
    if (truck.cor !== null && isOutOfSpec("cor", truck.cor)) outOfSpec.push("COR")
    if (truck.pol !== null && isOutOfSpec("pol", truck.pol)) outOfSpec.push("POL")
    if (truck.umi !== null && isOutOfSpec("um", truck.umi)) outOfSpec.push("UMI")
    if (truck.cin !== null && isOutOfSpec("cin", truck.cin)) outOfSpec.push("CIN")
    if (truck.ri !== null && isOutOfSpec("ri", truck.ri)) outOfSpec.push("RI")
  }
  return outOfSpec
}

// Helper function to check if truck really went through doublecheck
  // Doublecheck = pelo menos UMA métrica tem AMBOS _anterior (NIR) E valor atual (Lab)
  const hasDoublecheck = (truck: TruckData): boolean => {
    const hasCORDoublecheck = truck.corAnterior !== null && truck.cor !== null
    const hasPOLDoublecheck = truck.polAnterior !== null && truck.pol !== null
    const hasUMIDoublecheck = truck.umiAnterior !== null && truck.umi !== null
    const hasCINDoublecheck = truck.cinAnterior !== null && truck.cin !== null
    const hasRIDoublecheck = truck.riAnterior !== null && truck.ri !== null
    
    return hasCORDoublecheck || hasPOLDoublecheck || hasUMIDoublecheck || hasCINDoublecheck || hasRIDoublecheck
  }
  
  // Helper function to check if a specific metric had doublecheck
  const metricHadDoublecheck = (truck: TruckData, metric: string): boolean => {
    switch (metric.toLowerCase()) {
      case "cor":
        return truck.corAnterior !== null && truck.cor !== null
      case "pol":
        return truck.polAnterior !== null && truck.pol !== null
      case "umi":
      case "um":
        return truck.umiAnterior !== null && truck.umi !== null
      case "cin":
        return truck.cinAnterior !== null && truck.cin !== null
      case "ri":
        return truck.riAnterior !== null && truck.ri !== null
      default:
        return false
    }
  }

// Helper function to format ALL values from NIR (usando valores _anterior quando existem)
// Correção 2: Mostra TODOS os valores detectados pelo NIR, não apenas fora de spec
const formatNIRValues = (truck: TruckData): string => {
  const values: string[] = []
  // Se existem valores anteriores, usa eles (valores detectados pelo NIR antes do doublecheck)
  if (truck.corAnterior !== null) values.push(`COR: ${formatCor(truck.corAnterior)}`)
  if (truck.polAnterior !== null) values.push(`POL: ${formatPol(truck.polAnterior)}`)
  if (truck.umiAnterior !== null) values.push(`UMI: ${formatUmi(truck.umiAnterior)}`)
  if (truck.cinAnterior !== null) values.push(`CIN: ${formatCin(truck.cinAnterior)}`)
  if (truck.riAnterior !== null) values.push(`RI: ${formatRi(truck.riAnterior)}`)
  
  // Se não tem valores anteriores, usa valores atuais (fallback para CSVs antigos)
  if (values.length === 0) {
  if (truck.cor !== null) values.push(`COR: ${formatCor(truck.cor)}`)
  if (truck.pol !== null) values.push(`POL: ${formatPol(truck.pol)}`)
  if (truck.umi !== null) values.push(`UMI: ${formatUmi(truck.umi)}`)
  if (truck.cin !== null) values.push(`CIN: ${formatCin(truck.cin)}`)
  if (truck.ri !== null) values.push(`RI: ${formatRi(truck.ri)}`)
  }
  return values.join(", ")
}

// Helper function to get NIR results - only out-of-spec values
const getNIRResultsArray = (truck: TruckData): { metric: string; value: string }[] => {
  const results: { metric: string; value: string }[] = []
  
  // Exibir TODOS os doublecheck realizados (tem _anterior), não apenas os fora de spec
  if (truck.corAnterior !== null) {
    results.push({ metric: "COR", value: formatCor(truck.corAnterior) })
  }
  if (truck.polAnterior !== null) {
    results.push({ metric: "POL", value: formatPol(truck.polAnterior) })
  }
  if (truck.umiAnterior !== null) {
    results.push({ metric: "UMI", value: formatUmi(truck.umiAnterior) })
  }
  if (truck.cinAnterior !== null) {
    results.push({ metric: "CIN", value: formatCin(truck.cinAnterior) })
  }
  if (truck.riAnterior !== null) {
    results.push({ metric: "RI", value: formatRi(truck.riAnterior) })
  }
  
  return results
}

// Helper function to format only out-of-spec values from NIR (usando valores _anterior)
const formatOutOfSpecValuesNIR = (truck: TruckData): string => {
  const values: string[] = []
  // Se existem valores anteriores, usa eles (valores detectados pelo NIR antes do doublecheck)
  if (truck.corAnterior !== null && isOutOfSpec("cor", truck.corAnterior)) values.push(`COR: ${formatCor(truck.corAnterior)}`)
  if (truck.polAnterior !== null && isOutOfSpec("pol", truck.polAnterior)) values.push(`POL: ${formatPol(truck.polAnterior)}`)
  if (truck.umiAnterior !== null && isOutOfSpec("um", truck.umiAnterior)) values.push(`UMI: ${formatUmi(truck.umiAnterior)}`)
  if (truck.cinAnterior !== null && isOutOfSpec("cin", truck.cinAnterior)) values.push(`CIN: ${formatCin(truck.cinAnterior)}`)
  if (truck.riAnterior !== null && isOutOfSpec("ri", truck.riAnterior)) values.push(`RI: ${formatRi(truck.riAnterior)}`)
  
  // Se não tem valores anteriores, usa valores atuais (fallback para CSVs antigos)
  if (values.length === 0) {
    if (truck.cor !== null && isOutOfSpec("cor", truck.cor)) values.push(`COR: ${formatCor(truck.cor)}`)
    if (truck.pol !== null && isOutOfSpec("pol", truck.pol)) values.push(`POL: ${formatPol(truck.pol)}`)
    if (truck.umi !== null && isOutOfSpec("um", truck.umi)) values.push(`UMI: ${formatUmi(truck.umi)}`)
    if (truck.cin !== null && isOutOfSpec("cin", truck.cin)) values.push(`CIN: ${formatCin(truck.cin)}`)
    if (truck.ri !== null && isOutOfSpec("ri", truck.ri)) values.push(`RI: ${formatRi(truck.ri)}`)
  }
  return values.join(", ")
}

// Helper function to format lab results (todos os valores, não apenas fora de spec)
const formatLabResults = (truck: TruckData): string => {
  const values: string[] = []
  if (truck.cor !== null) values.push(`COR: ${formatCor(truck.cor)}`)
  if (truck.pol !== null) values.push(`POL: ${formatPol(truck.pol)}`)
  if (truck.umi !== null) values.push(`UMI: ${formatUmi(truck.umi)}`)
  if (truck.cin !== null) values.push(`CIN: ${formatCin(truck.cin)}`)
  if (truck.ri !== null) values.push(`RI: ${formatRi(truck.ri)}`)
  return values.join(", ")
}

// Helper function to get lab results - only for metrics that were out-of-spec in NIR
const getLabResultsArray = (truck: TruckData): { metric: string; value: string }[] => {
  const results: { metric: string; value: string }[] = []
  
  // Exibir TODOS os resultados de lab que tiveram doublecheck (tem _anterior), não apenas os fora de spec
  if (truck.corAnterior !== null && truck.cor !== null) {
    results.push({ metric: "COR", value: formatCor(truck.cor) })
  }
  if (truck.polAnterior !== null && truck.pol !== null) {
    results.push({ metric: "POL", value: formatPol(truck.pol) })
  }
  if (truck.umiAnterior !== null && truck.umi !== null) {
    results.push({ metric: "UMI", value: formatUmi(truck.umi) })
  }
  if (truck.cinAnterior !== null && truck.cin !== null) {
    results.push({ metric: "CIN", value: formatCin(truck.cin) })
  }
  if (truck.riAnterior !== null && truck.ri !== null) {
    results.push({ metric: "RI", value: formatRi(truck.ri) })
  }
  
  return results
}

// Helper function to format only out-of-spec values from Lab (mantido para compatibilidade)
const formatOutOfSpecValuesLab = (truck: TruckData): string => {
  const values: string[] = []
  if (truck.cor !== null && isOutOfSpec("cor", truck.cor)) values.push(`COR: ${formatCor(truck.cor)}`)
  if (truck.pol !== null && isOutOfSpec("pol", truck.pol)) values.push(`POL: ${formatPol(truck.pol)}`)
  if (truck.umi !== null && isOutOfSpec("um", truck.umi)) values.push(`UMI: ${formatUmi(truck.umi)}`)
  if (truck.cin !== null && isOutOfSpec("cin", truck.cin)) values.push(`CIN: ${formatCin(truck.cin)}`)
  if (truck.ri !== null && isOutOfSpec("ri", truck.ri)) values.push(`RI: ${formatRi(truck.ri)}`)
  return values.join(", ")
}

// Helper to detect incomplete doublecheck (NIR found issues but no _anterior values recorded)
const hasIncompleteDoublecheck = (truck: TruckData): boolean => {
  const hasAnyAnterior = truck.corAnterior !== null || truck.polAnterior !== null || 
                        truck.umiAnterior !== null || truck.cinAnterior !== null || 
                        truck.riAnterior !== null
  // Se não tem valores anteriores E tem valores atuais fora de spec, é doublecheck incompleto
  if (!hasAnyAnterior) {
    return (truck.cor !== null && isOutOfSpec("cor", truck.cor)) ||
           (truck.pol !== null && isOutOfSpec("pol", truck.pol)) ||
           (truck.umi !== null && isOutOfSpec("um", truck.umi)) ||
           (truck.cin !== null && isOutOfSpec("cin", truck.cin)) ||
           (truck.ri !== null && isOutOfSpec("ri", truck.ri))
  }
  return false
}

// Helper function to get the final decision text for Status column (card view)
const getFinalDecisionText = (truck: TruckData): string => {
  // Caso 1: Aprovado diretamente pelo NIR (sem doublecheck)
  if (truck.status === "approved" && !hasDoublecheck(truck)) {
    return "Liberado pelo NIR"
  }
  
  // Caso 2: Passou por doublecheck do laboratório e foi aprovado pelo terminal
  if (hasDoublecheck(truck) && truck.autorizacao === "APROVADO") {
    return "Liberado pelo terminal"
  }
  
  // Caso 3: Passou por doublecheck incompleto (aprovado sem razão clara)
  if (hasIncompleteDoublecheck(truck)) {
    return "Liberado pelo terminal"
  }
  
  // Caso 4: Rejeitado pelo terminal
  if (truck.autorizacao === "RECUSADO") {
    return "Recusado"
  }
  
  // Caso 5: Aguardando decisão (apurado/rejected sem autorização)
  if ((truck.status === "apurado" || truck.status === "rejected") && truck.autorizacao === null) {
    return "Aguardando status"
  }
  
  // Caso 6: Status incompleto ou faltando informação crucial
  return "Aguardando dados"
}

// Helper function to get the final decision text for History popup (more detailed)
const getFinalDecisionTextHistory = (truck: TruckData): string => {
  // Caso 1: Aprovado diretamente pelo NIR (sem doublecheck)
  if (truck.status === "approved" && !hasDoublecheck(truck)) {
    return "Liberado pelo NIR"
  }
  
  // Caso 2: Passou por doublecheck do laboratório e foi aprovado pelo terminal
  if (hasDoublecheck(truck) && truck.autorizacao === "APROVADO") {
    return "Liberado pelo terminal"
  }
  
  // Caso 3: Passou por doublecheck incompleto (aprovado sem razão clara)
  if (hasIncompleteDoublecheck(truck)) {
    return "Liberado pelo terminal"
  }
  
  // Caso 4: Rejeitado pelo terminal
  if (truck.autorizacao === "RECUSADO") {
    return "Recusado"
  }
  
  // Caso 5: Aguardando decisão (apurado/rejected sem autorização)
  if ((truck.status === "apurado" || truck.status === "rejected") && truck.autorizacao === null) {
    return "Aguardando o status final"
  }
  
  // Caso 6: Status incompleto ou faltando informação crucial
  return "Aguardando dados"
}

// Helper function to determine if status is incomplete/missing info
const isMissingInfo = (truck: TruckData): boolean => {
  // Se não tem status definido
  if (!truck.status) return true
  
  // Se passou por doublecheck mas não tem autorização
  if (hasDoublecheck(truck) && !truck.autorizacao) return true
  
  // Se tem status apurado/rejected mas sem dados de lab e sem autorização
  if ((truck.status === "apurado" || truck.status === "rejected") && 
      !truck.autorizacao && 
      truck.cor === null && truck.pol === null && truck.umi === null) {
    return true
  }
  
  return false
}

// Helper function to check if truck has complete data for history display
const hasCompleteHistoryData = (truck: TruckData): boolean => {
  // Precisa ter status definido
  const hasStatus = truck.status !== null && truck.status !== undefined && truck.status !== ""
  if (!hasStatus) return false
  
  // Se houve doublecheck: só precisa ter dados do lab (não importa se NIR estava fora ou dentro de spec)
  if (hasDoublecheck(truck)) {
    const hasLabData = truck.cor !== null || truck.pol !== null || 
                       truck.umi !== null || truck.cin !== null || truck.ri !== null
    return hasLabData
  }
  
  // Se não houve doublecheck: só precisa ter dados do NIR (qualquer status)
  const hasNIRData = truck.cor !== null || truck.pol !== null || 
                     truck.umi !== null || truck.cin !== null || truck.ri !== null
  
  return hasNIRData && hasStatus
}

export function DayViewOverlay({ 
  selectedDay, 
  isDarkMode, 
  trucksByDate, 
  onClose, 
  initialSearchTerm = "",
  onPreviousDay,
  onNextDay 
}: DayViewOverlayProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "apurado" | "rejected">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [tableViewMode, setTableViewMode] = useState<"main" | "by-client">("main")
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [showOnlyOutOfSpec, setShowOnlyOutOfSpec] = useState(false)
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())
  const [historyPopup, setHistoryPopup] = useState<{ truck: TruckData; x: number; y: number } | null>(null)

  const daysDifference = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(selectedDay)
    selected.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - selected.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [selectedDay])

  const isRecentDay = daysDifference <= 3

  // Reset filters when day changes, but keep initialSearchTerm
  useEffect(() => {
    setShowOnlyIncomplete(false)
    setFilterStatus("all")
    setSearchTerm(initialSearchTerm)
    setCurrentPage(1)
    setTableViewMode("main")
    setExpandedGroups(new Set())
    setExpandedSuppliers(new Set())
    setHistoryPopup(null)
  }, [selectedDay, initialSearchTerm])

  // Get trucks for the selected day
  const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
  const dayTrucks = useMemo(() => trucksByDate[dateStr] || [], [trucksByDate, dateStr])

  // Derived lists
  const incompleteTrucks = useMemo(() => dayTrucks.filter(hasIncompleteData), [dayTrucks])
  const completeTrucks = useMemo(() => dayTrucks.filter((t) => !hasIncompleteData(t)), [dayTrucks])

  // KPIs with tonnage
  const kpis = useMemo(
    () => {
      const approvedTrucks = completeTrucks.filter((t) => t.status === "approved")
      const apuradoTrucks = completeTrucks.filter((t) => t.status === "apurado" || (t.status === "rejected" && t.hasOtherOutOfSpec))
      const rejectedTrucks = completeTrucks.filter((t) => t.status === "rejected")

      return {
        total: dayTrucks.length,
        totalTonnage: dayTrucks.reduce((sum, t) => sum + (t.grossWeight || 0), 0),
        approved: approvedTrucks.length,
        approvedTonnage: approvedTrucks.reduce((sum, t) => sum + (t.grossWeight || 0), 0),
        apurado: apuradoTrucks.length,
        apuradoTonnage: apuradoTrucks.reduce((sum, t) => sum + (t.grossWeight || 0), 0),
        rejected: rejectedTrucks.length,
        rejectedTonnage: rejectedTrucks.reduce((sum, t) => sum + (t.grossWeight || 0), 0),
        awaiting: incompleteTrucks.length,
      }
    },
    [dayTrucks, completeTrucks, incompleteTrucks],
  )

  // Filtered trucks
  const getFilteredTrucks = useMemo(() => {
    let trucks = dayTrucks

    if (showOnlyIncomplete) {
      return trucks.filter(hasIncompleteData)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      trucks = trucks.filter(
        (t) =>
          t.licensePlate.toLowerCase().includes(term) ||
          t.client.toLowerCase().includes(term) ||
          t.supplier.toLowerCase().includes(term) ||
          (t.nfNumber && t.nfNumber.toLowerCase().includes(term)),
      )
    }

    if (filterStatus !== "all") {
      trucks = trucks.filter((t) => !hasIncompleteData(t) && t.status === filterStatus)
    }

    return trucks
  }, [dayTrucks, showOnlyIncomplete, searchTerm, filterStatus])

  // Pagination
  const totalPages = Math.ceil(getFilteredTrucks.length / ITEMS_PER_PAGE)
  const paginatedTrucks = getFilteredTrucks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Formatted date
  const formattedDate = `${selectedDay.getDate()} de ${months[selectedDay.getMonth()]} de ${selectedDay.getFullYear()}`

  // Calculate daily averages (arithmetic and weighted)
  const dailyAverages = useMemo(() => {
    // Filter trucks based on filterStatus
    let trucksToAnalyze = completeTrucks
    
    if (filterStatus !== "all") {
      trucksToAnalyze = completeTrucks.filter((t) => t.status === filterStatus)
    }
    
    const trucksWithData = trucksToAnalyze.filter((t) => 
      t.cor !== null || t.pol !== null || t.umi !== null || t.cin !== null || t.ri !== null
    )
    
    if (trucksWithData.length === 0) {
      return {
        cor: { arithmetic: null, weighted: null },
        pol: { arithmetic: null, weighted: null },
        umi: { arithmetic: null, weighted: null },
        cin: { arithmetic: null, weighted: null },
        ri: { arithmetic: null, weighted: null },
      }
    }

    // Arithmetic totals and counts
    const totals = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const counts = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    
    // Weighted totals (value * weight) and total weights
    const weightedTotals = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const totalWeights = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }

    trucksWithData.forEach((truck) => {
      const weight = truck.grossWeight || 0
      
      if (truck.cor !== null) {
        totals.cor += truck.cor
        counts.cor++
        if (weight > 0) {
          weightedTotals.cor += truck.cor * weight
          totalWeights.cor += weight
        }
      }
      if (truck.pol !== null) {
        totals.pol += truck.pol
        counts.pol++
        if (weight > 0) {
          weightedTotals.pol += truck.pol * weight
          totalWeights.pol += weight
        }
      }
      if (truck.umi !== null) {
        totals.umi += truck.umi
        counts.umi++
        if (weight > 0) {
          weightedTotals.umi += truck.umi * weight
          totalWeights.umi += weight
        }
      }
      if (truck.cin !== null) {
        totals.cin += truck.cin
        counts.cin++
        if (weight > 0) {
          weightedTotals.cin += truck.cin * weight
          totalWeights.cin += weight
        }
      }
      if (truck.ri !== null) {
        totals.ri += truck.ri
        counts.ri++
        if (weight > 0) {
          weightedTotals.ri += truck.ri * weight
          totalWeights.ri += weight
        }
      }
    })

    return {
      cor: {
        arithmetic: counts.cor > 0 ? totals.cor / counts.cor : null,
        weighted: totalWeights.cor > 0 ? weightedTotals.cor / totalWeights.cor : null,
      },
      pol: {
        arithmetic: counts.pol > 0 ? totals.pol / counts.pol : null,
        weighted: totalWeights.pol > 0 ? weightedTotals.pol / totalWeights.pol : null,
      },
      umi: {
        arithmetic: counts.umi > 0 ? totals.umi / counts.umi : null,
        weighted: totalWeights.umi > 0 ? weightedTotals.umi / totalWeights.umi : null,
      },
      cin: {
        arithmetic: counts.cin > 0 ? totals.cin / counts.cin : null,
        weighted: totalWeights.cin > 0 ? weightedTotals.cin / totalWeights.cin : null,
      },
      ri: {
        arithmetic: counts.ri > 0 ? totals.ri / counts.ri : null,
        weighted: totalWeights.ri > 0 ? weightedTotals.ri / totalWeights.ri : null,
      },
    }
  }, [completeTrucks, filterStatus])

  // Card configs
  const cardConfigs = [
    {
      label: "TOTAL",
      value: kpis.total,
      tonnage: kpis.totalTonnage,
      icon: TrendingUp,
      bgColor: isDarkMode ? "bg-blue-950/40" : "bg-blue-50",
      borderColor: isDarkMode ? "border-blue-800/40" : "border-blue-200",
      iconBg: isDarkMode ? "bg-blue-900/40" : "bg-blue-100",
      iconColor: isDarkMode ? "text-blue-400" : "text-blue-600",
      textColor: isDarkMode ? "text-blue-400" : "text-blue-700",
      labelColor: isDarkMode ? "text-blue-400/70" : "text-blue-600",
      filter: "all" as const,
    },
    {
      label: "APROVADOS",
      value: kpis.approved,
      tonnage: kpis.approvedTonnage,
      icon: CheckCircle2,
      bgColor: isDarkMode ? "bg-green-950/40" : "bg-green-50",
      borderColor: isDarkMode ? "border-green-800/40" : "border-green-200",
      iconBg: isDarkMode ? "bg-green-900/40" : "bg-green-100",
      iconColor: isDarkMode ? "text-green-400" : "text-green-600",
      textColor: isDarkMode ? "text-green-400" : "text-green-700",
      labelColor: isDarkMode ? "text-green-400/70" : "text-green-600",
      filter: "approved" as const,
    },
    {
      label: "APONTADOS",
      value: kpis.apurado,
      tonnage: kpis.apuradoTonnage,
      icon: AlertCircle,
      bgColor: isDarkMode ? "bg-amber-950/40" : "bg-amber-50",
      borderColor: isDarkMode ? "border-amber-800/40" : "border-amber-200",
      iconBg: isDarkMode ? "bg-amber-900/40" : "bg-amber-100",
      iconColor: isDarkMode ? "text-amber-400" : "text-amber-600",
      textColor: isDarkMode ? "text-amber-400" : "text-amber-700",
      labelColor: isDarkMode ? "text-amber-400/70" : "text-amber-600",
      filter: "apurado" as const,
    },
    {
      label: "RECUSADOS",
      value: kpis.rejected,
      tonnage: kpis.rejectedTonnage,
      icon: XCircle,
      // Usando cores baseadas na lógica de autorização (vermelho para recusados confirmados)
      bgColor: isDarkMode ? "bg-rose-950/40" : "bg-rose-50",
      borderColor: isDarkMode ? "border-rose-800/40" : "border-rose-200",
      iconBg: isDarkMode ? "bg-rose-900/40" : "bg-rose-100",
      iconColor: isDarkMode ? "text-rose-400" : "text-rose-600",
      textColor: isDarkMode ? "text-rose-400" : "text-rose-700",
      labelColor: isDarkMode ? "text-rose-400/70" : "text-rose-600",
      filter: "rejected" as const,
    },
  ]

  // Remove o sufixo "/XX-XX" do nome
  const getShortName = (fullName: string | null): string => {
    if (!fullName) return "-"
    return fullName.split("/")[0].trim()
  }

  // Função para formatar peso com 1 casa decimal
  const formatPeso = (peso: number | null): string => {
    if (peso === null || peso === undefined) return "-"
    return peso.toFixed(1).replace(".", ",")
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${isDarkMode ? "bg-[#0a0f1a]" : "bg-slate-50"}`}>
      {/* Header - mantido conforme solicitado */}
      <header
        className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
          isDarkMode ? "bg-[#0d1220] border-slate-700/50" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`gap-2 ${
              isDarkMode
                ? "text-slate-300 hover:text-white hover:bg-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Retornar
          </Button>

          <div className={`h-5 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-300"}`} />

          {/* Navegação de dias - ambas setas à esquerda */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousDay}
              className={`p-1.5 ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextDay}
              className={`p-1.5 ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Próximo dia"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Data */}
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {formattedDate}
            </h1>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {dayTrucks.length} caminhões recepcionados
            </p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
              exportTrucksToPDF(getFilteredTrucks as any, dateKey)
            }}
            className={`gap-2 ${
              isDarkMode
                ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
              exportQualityAnalysisToPDF(getFilteredTrucks as any, dateKey)
            }}
            className={`gap-2 ${
              isDarkMode
                ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Beaker className="h-4 w-4" />
            Análise Qualidade PDF
          </Button>
        </div>
      </header>

      {/* Conteudo principal com scroll da pagina */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4 space-y-4">
          {kpis.awaiting > 0 && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                isRecentDay
                  ? isDarkMode
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                  : isDarkMode
                    ? "bg-red-500/10 border border-red-500/20 text-red-200"
                    : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1">
                {isRecentDay ? (
                  <>
                    Aguardando compilação de dados de {kpis.awaiting} {kpis.awaiting === 1 ? "caminhão" : "caminhões"}.{" "}
                    <button
                      onClick={() => {
                        setShowOnlyIncomplete(!showOnlyIncomplete)
                        setFilterStatus("all")
                        setSearchTerm("")
                        setCurrentPage(1)
                      }}
                      className={`font-medium hover:underline ${showOnlyIncomplete ? "underline" : ""}`}
                    >
                      Ver caminhões.
                    </button>
                  </>
                ) : (
                  <>
                    Dados de {kpis.awaiting} {kpis.awaiting === 1 ? "caminhão" : "caminhões"} já deveriam ter sido
                    compilados.{" "}
                    <button
                      onClick={() => {
                        setShowOnlyIncomplete(!showOnlyIncomplete)
                        setFilterStatus("all")
                        setSearchTerm("")
                        setCurrentPage(1)
                      }}
                      className={`font-medium hover:underline ${showOnlyIncomplete ? "underline" : ""}`}
                    >
                      Ver caminhões.
                    </button>
                  </>
                )}
              </p>
              {showOnlyIncomplete && (
                <button
                  onClick={() => setShowOnlyIncomplete(false)}
                  className={`p-1 rounded hover:bg-black/10 ${
                    isRecentDay
                      ? isDarkMode
                        ? "text-amber-300"
                        : "text-amber-700"
                      : isDarkMode
                        ? "text-red-300"
                        : "text-red-700"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Cards de metricas - 100% largura em linha */}
          {!showOnlyIncomplete && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cardConfigs.map((card) => (
                <button
                  key={card.label}
                  onClick={() => {
                    setFilterStatus(card.filter)
                    setCurrentPage(1)
                  }}
                  className={`relative rounded-xl border ${card.bgColor} ${card.borderColor} p-4 text-left transition-all hover:shadow-md ${
                    filterStatus === card.filter
                      ? "ring-2 ring-offset-1 " +
                        (isDarkMode ? "ring-sky-500 ring-offset-slate-900" : "ring-sky-500 ring-offset-white")
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${card.labelColor}`}>
                        {card.label}
                      </p>
                  <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                  <p className={`text-xs mt-1 ${card.labelColor}`}>
                    {formatWeight(card.tonnage)} toneladas
                  </p>
                    </div>
                    <div className={`${card.iconBg} rounded-lg p-2.5 shrink-0`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}



          {/* Barra de acoes - busca e filtros - Design Moderno */}
          {!showOnlyIncomplete && (
            <div
              className={`flex flex-col lg:flex-row lg:items-center gap-4 p-5 rounded-2xl shadow-sm ${
                isDarkMode 
                  ? "bg-gradient-to-r from-slate-800/80 to-slate-800/60 border border-slate-700/50 backdrop-blur-sm" 
                  : "bg-gradient-to-r from-white to-slate-50/80 border border-slate-200/80 backdrop-blur-sm"
              }`}
            >
              <div className="flex-1 relative group">
                <Search
                  className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                    isDarkMode ? "text-slate-500 group-focus-within:text-sky-400" : "text-slate-400 group-focus-within:text-sky-500"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Buscar por placa, cliente ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className={`w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isDarkMode
                      ? "bg-slate-900/80 text-white placeholder-slate-500 border border-slate-600/50 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:bg-slate-900"
                      : "bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 shadow-inner"
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setCurrentPage(1)
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-400"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className={`hidden lg:block h-8 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />

              <button
                onClick={() => {
                  setTableViewMode(tableViewMode === "main" ? "by-client" : "main")
                  setExpandedGroups(new Set())
                  setExpandedSuppliers(new Set())
                }}
                className={`flex w-full lg:w-auto justify-center items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gradient-to-r from-sky-500/20 to-sky-600/20 text-sky-300 hover:from-sky-500/30 hover:to-sky-600/30 border border-sky-500/20"
                    : "bg-gradient-to-r from-sky-50 to-sky-100/80 text-sky-700 hover:from-sky-100 hover:to-sky-150 border border-sky-200/50 shadow-sm"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                {tableViewMode === "main" ? "Principal" : "Por Cliente"}
              </button>
            </div>
          )}

          {/* Tabela principal - Design Moderno */}
          <div
            className={`rounded-2xl overflow-hidden shadow-sm ${
              isDarkMode 
                ? "bg-gradient-to-b from-slate-800/50 to-slate-800/30 border border-slate-700/50" 
                : "bg-white border border-slate-200/80"
            }`}
          >
            {tableViewMode === "main" ? (
              <>
                <table className="w-full">
                  <thead className={`sticky top-0 z-10 ${isDarkMode ? "bg-slate-800/95 backdrop-blur-sm" : "bg-gradient-to-r from-slate-50 to-slate-100/80"}`}>
                    <tr className={isDarkMode ? "border-b border-slate-700/80" : "border-b border-slate-200"}>
                      <th
                        className={`px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Placa
                      </th>
                      <th
                        className={`px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        NF
                      </th>
                      <th
                        className={`px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Cliente
                      </th>
                      <th
                        className={`px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Fornecedor
                      </th>
                      <th
                        className={`px-4 py-4 text-right text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Peso (T)
                      </th>
                      {/* Indicadores agrupados com estilo destacado */}
                      <th
                        className={`px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                      >
                        COR
                      </th>
                      <th
                        className={`px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                      >
                        POL
                      </th>
                      <th
                        className={`px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                      >
                        UMI
                      </th>
                      <th
                        className={`px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                      >
                        CIN
                      </th>
                      <th
                        className={`px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}
                      >
                        RI
                      </th>
                      <th
                        className={`px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Hist.
                      </th>
                      <th
                        className={`px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? "divide-y divide-slate-700/30" : "divide-y divide-slate-100"}>
                    {paginatedTrucks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className={`px-4 py-12 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {showOnlyIncomplete
                            ? "Todos os caminhões deste dia já possuem análises completas."
                            : "Nenhum caminhão encontrado"}
                        </td>
                      </tr>
                    ) : (
                      paginatedTrucks.map((truck) => {
                        // Lógica de exibição na tabela:
                        // - Se métrica tem _anterior E valor atual: exibir valor atual (lab) em VERDE
                        // - Se métrica tem apenas valor atual (sem _anterior): exibir valor atual (NIR) com cores de spec
                        
                        // Determinar valores a exibir e se vieram do lab (doublecheck)
                        const displayCor = truck.cor
                        const displayPol = truck.pol
                        const displayUmi = truck.umi
                        const displayCin = truck.cin
                        const displayRi = truck.ri
                        
                        // For color determination, check NIR values (anterior if exists, else current)
                        const nirCor = truck.corAnterior !== null ? truck.corAnterior : truck.cor
                        const nirPol = truck.polAnterior !== null ? truck.polAnterior : truck.pol
                        const nirUmi = truck.umiAnterior !== null ? truck.umiAnterior : truck.umi
                        const nirCin = truck.cinAnterior !== null ? truck.cinAnterior : truck.cin
                        const nirRi = truck.riAnterior !== null ? truck.riAnterior : truck.ri
                        
                        // Verificar se teve doublecheck (verde) ou é resultado direto do NIR (cores de spec)
                        const corIsFromLab = metricHadDoublecheck(truck, "cor")
                        const polIsFromLab = metricHadDoublecheck(truck, "pol")
                        const umiIsFromLab = metricHadDoublecheck(truck, "umi")
                        const cinIsFromLab = metricHadDoublecheck(truck, "cin")
                        const riIsFromLab = metricHadDoublecheck(truck, "ri")
                        
                        // Para valores do NIR (sem doublecheck), verificar se estão fora de spec
                        const isCorOutOfSpec = !corIsFromLab && nirCor !== null && isOutOfSpec("cor", nirCor)
                        const isPolOutOfSpec = !polIsFromLab && nirPol !== null && isOutOfSpec("pol", nirPol)
                        const isUmiOutOfSpec = !umiIsFromLab && nirUmi !== null && isOutOfSpec("um", nirUmi)
                        const isCinOutOfSpec = !cinIsFromLab && nirCin !== null && isOutOfSpec("cin", nirCin)
                        const isRiOutOfSpec = !riIsFromLab && nirRi !== null && isOutOfSpec("ri", nirRi)
                        const isIncomplete = hasIncompleteData(truck)

                        return (
                          <tr
                            key={truck.id}
                            className={`transition-all duration-200 ${
                              isDarkMode 
                                ? "hover:bg-slate-700/40" 
                                : "hover:bg-sky-50/50"
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <span
                                className={`font-mono text-sm font-semibold tracking-wide ${isDarkMode ? "text-white" : "text-slate-900"}`}
                              >
                                {truck.licensePlate || "-"}
                              </span>
                            </td>
                            <td className={`px-4 py-3.5 text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                              {truck.nfNumber || "-"}
                            </td>
                            <td
                              className={`px-4 py-3.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                              title={truck.client || "-"}
                            >
                              {getShortName(truck.client)}
                            </td>
                            <td
                              className={`px-4 py-3.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                              title={truck.supplier || "-"}
                            >
                              {getShortName(truck.supplier)}
                            </td>
                          <td
                            className={`px-4 py-3.5 text-right text-sm font-semibold tabular-nums ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
                          >
                            {formatWeight(truck.grossWeight)}
                          </td>
                            {/* Indicadores */}
                            <td className="px-3 py-3">
                              <div className="flex justify-center">
                                {displayCor !== null ? (
                                  <span
                                    className={`text-xs font-medium cursor-help ${
                                      corIsFromLab
                                        ? isDarkMode
                                          ? "text-purple-400"
                                          : "text-purple-600"
                                        : isCorOutOfSpec
                                          ? isDarkMode
                                            ? "text-orange-400"
                                            : "text-orange-600"
                                          : isDarkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                    title={`Resultado: ${formatCor(displayCor)}\nData: ${truck.corData || "N/A"}\n${truck.corAnalista && truck.corAnalista !== "robo_lab" ? `Analista: ${truck.corAnalista}` : ""}`}
                                  >
                                    {formatCor(displayCor)}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center">
                                {displayPol !== null ? (
                                  <span
                                    className={`text-xs font-medium cursor-help ${
                                      polIsFromLab
                                        ? isDarkMode
                                          ? "text-purple-400"
                                          : "text-purple-600"
                                        : isPolOutOfSpec
                                          ? isDarkMode
                                            ? "text-orange-400"
                                            : "text-orange-600"
                                          : isDarkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                    title={`Resultado: ${formatPol(displayPol)}\nData: ${truck.polData || "N/A"}\n${truck.polAnalista && truck.polAnalista !== "robo_lab" ? `Analista: ${truck.polAnalista}` : ""}`}
                                  >
                                    {formatPol(displayPol)}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center">
                                {displayUmi !== null ? (
                                  <span
                                    className={`text-xs font-medium cursor-help ${
                                      umiIsFromLab
                                        ? isDarkMode
                                          ? "text-purple-400"
                                          : "text-purple-600"
                                        : isUmiOutOfSpec
                                          ? isDarkMode
                                            ? "text-orange-400"
                                            : "text-orange-600"
                                          : isDarkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                    title={`Resultado: ${formatUmi(displayUmi)}\nData: ${truck.umiData || "N/A"}\n${truck.umiAnalista && truck.umiAnalista !== "robo_lab" ? `Analista: ${truck.umiAnalista}` : ""}`}
                                  >
                                    {formatUmi(displayUmi)}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center">
                                {displayCin !== null ? (
                                  <span
                                    className={`text-xs font-medium cursor-help ${
                                      cinIsFromLab
                                        ? isDarkMode
                                          ? "text-purple-400"
                                          : "text-purple-600"
                                        : isCinOutOfSpec
                                          ? isDarkMode
                                            ? "text-orange-400"
                                            : "text-orange-600"
                                          : isDarkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                    title={`Resultado: ${formatCin(displayCin)}\nData: ${truck.cinData || "N/A"}\n${truck.cinAnalista && truck.cinAnalista !== "robo_lab" ? `Analista: ${truck.cinAnalista}` : ""}`}
                                  >
                                    {formatCin(displayCin)}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center">
                                {displayRi !== null ? (
                                  <span
                                    className={`text-xs font-medium cursor-help ${
                                      riIsFromLab
                                        ? isDarkMode
                                          ? "text-purple-400"
                                          : "text-purple-600"
                                        : isRiOutOfSpec
                                          ? isDarkMode
                                            ? "text-orange-400"
                                            : "text-orange-600"
                                          : isDarkMode
                                            ? "text-slate-300"
                                            : "text-slate-700"
                                    }`}
                                    title={`Resultado: ${formatRi(displayRi)}\nData: ${truck.riData || "N/A"}\n${truck.riAnalista && truck.riAnalista !== "robo_lab" ? `Analista: ${truck.riAnalista}` : ""}`}
                                  >
                                    {formatRi(displayRi)}
                                  </span>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Coluna Histórico */}
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                {!hasCompleteHistoryData(truck) ? (
                                  <span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${
                                      isDarkMode
                                        ? "bg-slate-700/40 text-slate-400"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                    title="Histórico pendente"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setHistoryPopup({
                                        truck,
                                        x: rect.left + rect.width / 2,
                                        y: rect.bottom + 8,
                                      })
                                    }}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                                      isDarkMode
                                        ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    }`}
                                    title="Ver histórico"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                        
                        {/* Coluna Status */}
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                                {isIncomplete || isMissingInfo(truck) ? (
                                  <span
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                                      isDarkMode
                                        ? "bg-slate-700/40 text-slate-400"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    {getFinalDecisionText(truck)}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                                      // Approved without doublecheck OR incomplete doublecheck (approved without reason)
                                      truck.status === "approved" || hasIncompleteDoublecheck(truck)
                                        ? isDarkMode
                                          ? "bg-green-500/20 text-green-300"
                                          : "bg-green-100 text-green-700"
                                        : // Apurado/Rejected with APROVADO authorization
                                          (truck.status === "apurado" || truck.status === "rejected") &&
                                            truck.autorizacao === "APROVADO"
                                          ? isDarkMode
                                            ? "bg-green-500/20 text-green-300"
                                            : "bg-green-100 text-green-700"
                                          : // Apurado/Rejected awaiting lab (null/empty authorization)
                                            (truck.status === "apurado" || truck.status === "rejected") &&
                                              truck.autorizacao === null
                                            ? isDarkMode
                                              ? "bg-amber-500/20 text-amber-300"
                                              : "bg-amber-100 text-amber-700"
                                            : // Apurado/Rejected with RECUSADO authorization
                                              isDarkMode
                                              ? "bg-rose-500/20 text-rose-300"
                                              : "bg-rose-100 text-rose-700"
                                    }`}
                                  >
                                    {truck.status === "approved" || hasIncompleteDoublecheck(truck) ? (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (truck.status === "apurado" || truck.status === "rejected") &&
                                      truck.autorizacao === "APROVADO" ? (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (truck.status === "apurado" || truck.status === "rejected") &&
                                      truck.autorizacao === null ? (
                                      <Clock className="h-3.5 w-3.5" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    {getFinalDecisionText(truck)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                {/* Paginacao - Design Moderno */}
                {paginatedTrucks.length > 0 && (
                  <div
                    className={`flex items-center justify-between gap-4 px-5 py-4 border-t ${
                      isDarkMode 
                        ? "border-slate-700/50 bg-gradient-to-r from-slate-800/60 to-slate-800/40" 
                        : "border-slate-200 bg-gradient-to-r from-slate-50 to-white"
                    }`}
                  >
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Mostrando{" "}
                      <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                        {Math.min(currentPage * ITEMS_PER_PAGE, getFilteredTrucks.length)}
                      </span>{" "}
                      de{" "}
                      <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {getFilteredTrucks.length}
                      </span>
                      {" "}registros
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg transition-all ${
                          currentPage === 1
                            ? isDarkMode
                              ? "text-slate-600 cursor-not-allowed"
                              : "text-slate-300 cursor-not-allowed"
                            : isDarkMode
                              ? "text-slate-300 hover:bg-slate-700/80 hover:text-white"
                              : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <div
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                          isDarkMode ? "bg-slate-700/60" : "bg-slate-100"
                        }`}
                      >
                        <span className={`text-sm font-bold ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}>
                          {currentPage}
                        </span>
                        <span className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>/</span>
                        <span className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {totalPages || 1}
                        </span>
                      </div>

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className={`p-2 rounded-lg transition-all ${
                          currentPage >= totalPages
                            ? isDarkMode
                              ? "text-slate-600 cursor-not-allowed"
                              : "text-slate-300 cursor-not-allowed"
                            : isDarkMode
                              ? "text-slate-300 hover:bg-slate-700/80 hover:text-white"
                              : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Visualizacao por Cliente */
              <div className="p-4 space-y-3">
                {(() => {
                  const groupedByClient = getFilteredTrucks.reduce(
                    (acc, truck) => {
                      const client = truck.client || "Sem Cliente"
                      if (!acc[client]) acc[client] = []
                      acc[client].push(truck)
                      return acc
                    },
                    {} as Record<string, TruckData[]>,
                  )

                  if (Object.keys(groupedByClient).length === 0) {
                    return (
                      <div className={`text-center py-12 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Nenhum caminhão encontrado
                      </div>
                    )
                  }

                  return Object.entries(groupedByClient).map(([client, clientTrucks]) => {
                    const isClientExpanded = expandedGroups.has(client)
                    const totalWeight = clientTrucks.reduce((sum, t) => sum + t.grossWeight, 0)

                    const groupedBySupplier = clientTrucks.reduce(
                      (acc, truck) => {
                        const supplier = truck.supplier || "Sem Fornecedor"
                        if (!acc[supplier]) acc[supplier] = []
                        acc[supplier].push(truck)
                        return acc
                      },
                      {} as Record<string, TruckData[]>,
                    )

                    return (
                      <div
                        key={client}
                        className={`rounded-lg overflow-hidden ${
                          isDarkMode
                            ? "bg-slate-800/50 border border-slate-700/50"
                            : "bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedGroups)
                            if (isClientExpanded) newExpanded.delete(client)
                            else newExpanded.add(client)
                            setExpandedGroups(newExpanded)
                          }}
                          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                            isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight
                              className={`h-5 w-5 transition-transform ${isClientExpanded ? "rotate-90" : ""} ${
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              }`}
                            />
                            <div className="flex flex-col items-start">
                              <span className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {client}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded mt-1 ${
                                  isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {clientTrucks.length} caminhões
                              </span>
                            </div>
                          </div>
                      <span className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {formatWeight(totalWeight)} T
                      </span>
                        </button>

                        {isClientExpanded && (
                          <div className={`px-4 pb-4 space-y-2 ${isDarkMode ? "bg-slate-900/30" : "bg-white"}`}>
                            <div
                              className={`text-xs font-medium px-2 py-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                            >
                              Fornecedores que enviaram para {client}:
                            </div>
                            {Object.entries(groupedBySupplier).map(([supplier, supplierTrucks]) => {
                              const supplierKey = `${client}-${supplier}`
                              const isSupplierExpanded = expandedSuppliers.has(supplierKey)
                              const supplierWeight = supplierTrucks.reduce((sum, t) => sum + t.grossWeight, 0)

                              return (
                                <div
                                  key={supplierKey}
                                  className={`rounded-lg overflow-hidden ${
                                    isDarkMode
                                      ? "bg-slate-800/50 border border-slate-700/30"
                                      : "bg-slate-50 border border-slate-200"
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedSuppliers)
                                      if (isSupplierExpanded) newExpanded.delete(supplierKey)
                                      else newExpanded.add(supplierKey)
                                      setExpandedSuppliers(newExpanded)
                                    }}
                                    className={`w-full px-3 py-2 flex items-center justify-between transition-colors ${
                                      isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <ChevronRight
                                        className={`h-4 w-4 transition-transform ${isSupplierExpanded ? "rotate-90" : ""} ${
                                          isDarkMode ? "text-slate-500" : "text-slate-400"
                                        }`}
                                      />
                                      <div className="flex flex-col items-start">
                                        <span
                                          className={`font-medium text-xs ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
                                        >
                                          {supplier}
                                        </span>
                                        <span
                                          className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                                            isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-600"
                                          }`}
                                        >
                                          {supplierTrucks.length} caminhões
                                        </span>
                                      </div>
                                    </div>
                            <span
                              className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                            >
                              {formatWeight(supplierWeight)} T
                            </span>
                                  </button>

                                  {isSupplierExpanded && (
                                    <div className="overflow-x-auto">
                                      <table className="w-full">
                                        <thead>
                                          <tr className={isDarkMode ? "bg-slate-900/50" : "bg-slate-100"}>
                                            <th
                                              className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              Placa
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              NF
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              Peso (T)
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              COR
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              POL
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              UMI
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              CIN
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              RI
                                            </th>
                                            <th
                                              className={`px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                            >
                                              Status
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {supplierTrucks.map((truck) => {
                                            // Check if there was doublecheck (lab re-analysis)
                                            const hadDoublecheck = hasDoublecheck(truck)
                                            
                                            // Determine which values to display: lab results if doublecheck, else NIR results
                                            const displayCor = truck.cor
                                            const displayPol = truck.pol
                                            const displayUmi = truck.umi
                                            const displayCin = truck.cin
                                            const displayRi = truck.ri
                                            
                                            // For color determination, check NIR values (anterior if exists, else current)
                                            const nirCor = truck.corAnterior !== null ? truck.corAnterior : truck.cor
                                            const nirPol = truck.polAnterior !== null ? truck.polAnterior : truck.pol
                                            const nirUmi = truck.umiAnterior !== null ? truck.umiAnterior : truck.umi
                                            const nirCin = truck.cinAnterior !== null ? truck.cinAnterior : truck.cin
                                            const nirRi = truck.riAnterior !== null ? truck.riAnterior : truck.ri
                                            
                                            // If doublecheck happened, use green for all lab values
                                            // Otherwise, use orange for out-of-spec NIR values
                                            const isCorOut = !hadDoublecheck && nirCor !== null && isOutOfSpec("cor", nirCor)
                                            const isPolOut = !hadDoublecheck && nirPol !== null && isOutOfSpec("pol", nirPol)
                                            const isUmiOut = !hadDoublecheck && nirUmi !== null && isOutOfSpec("um", nirUmi)
                                            const isCinOut = !hadDoublecheck && nirCin !== null && isOutOfSpec("cin", nirCin)
                                            const isRiOut = !hadDoublecheck && nirRi !== null && isOutOfSpec("ri", nirRi)
                                            
                                            // Green color for doublecheck results
                                            const isDoublecheckApproved = hadDoublecheck

                                            return (
                                              <tr
                                                key={truck.id}
                                                className={
                                                  isDarkMode
                                                    ? "border-t border-slate-700/30 hover:bg-slate-700/30"
                                                    : "border-t border-slate-100 hover:bg-slate-50"
                                                }
                                              >
                                                <td
                                                  className={`px-3 py-2 text-xs font-mono ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                                                >
                                                  {truck.licensePlate}
                                                </td>
                                                <td
                                                  className={`px-3 py-2 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                                                >
                                                  {truck.nfNumber || "-"}
                                                </td>
                                  <td
                                    className={`px-3 py-2 text-xs text-right ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
                                  >
                                    {formatWeight(truck.grossWeight)}
                                  </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                  <span
                                                    className={
                                                      isDoublecheckApproved
                                                        ? isDarkMode
                                                          ? "text-green-400 font-medium"
                                                          : "text-green-600 font-medium"
                                                        : isCorOut
                                                          ? isDarkMode
                                                            ? "text-orange-400"
                                                            : "text-orange-600"
                                                          : isDarkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }
                                                  >
                                                    {displayCor !== null ? formatCor(displayCor) : "-"}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                  <span
                                                    className={
                                                      isDoublecheckApproved
                                                        ? isDarkMode
                                                          ? "text-green-400 font-medium"
                                                          : "text-green-600 font-medium"
                                                        : isPolOut
                                                          ? isDarkMode
                                                            ? "text-orange-400"
                                                            : "text-orange-600"
                                                          : isDarkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }
                                                  >
                                                    {displayPol !== null ? formatPol(displayPol) : "-"}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                  <span
                                                    className={
                                                      isDoublecheckApproved
                                                        ? isDarkMode
                                                          ? "text-green-400 font-medium"
                                                          : "text-green-600 font-medium"
                                                        : isUmiOut
                                                          ? isDarkMode
                                                            ? "text-orange-400"
                                                            : "text-orange-600"
                                                          : isDarkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }
                                                  >
                                                    {displayUmi !== null ? formatUmi(displayUmi) : "-"}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                  <span
                                                    className={
                                                      isDoublecheckApproved
                                                        ? isDarkMode
                                                          ? "text-green-400 font-medium"
                                                          : "text-green-600 font-medium"
                                                        : isCinOut
                                                          ? isDarkMode
                                                            ? "text-orange-400"
                                                            : "text-orange-600"
                                                          : isDarkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }
                                                  >
                                                    {displayCin !== null ? formatCin(displayCin) : "-"}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                  <span
                                                    className={
                                                      isDoublecheckApproved
                                                        ? isDarkMode
                                                          ? "text-green-400 font-medium"
                                                          : "text-green-600 font-medium"
                                                        : isRiOut
                                                          ? isDarkMode
                                                            ? "text-orange-400"
                                                            : "text-orange-600"
                                                          : isDarkMode
                                                            ? "text-slate-300"
                                                            : "text-slate-700"
                                                    }
                                                  >
                                                    {displayRi !== null ? formatRi(displayRi) : "-"}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                                      truck.status === "approved"
                                                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                        : truck.status === "apurado"
                                                          ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                                    }`}
                                                  >
                                                    {truck.status === "approved"
                                                      ? "Aprovado"
                                                      : truck.status === "apurado"
                                                        ? "Apontado"
                                                        : "Recusado"}
                                                  </span>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>

          {/* Daily Averages Section - Bar Charts - Design Moderno */}
          {!showOnlyIncomplete && (dailyAverages.cor.arithmetic !== null || dailyAverages.pol.arithmetic !== null || dailyAverages.umi.arithmetic !== null || dailyAverages.cin.arithmetic !== null || dailyAverages.ri.arithmetic !== null) && (
            <div className={`rounded-2xl overflow-hidden shadow-sm ${isDarkMode ? "bg-gradient-to-b from-slate-800/60 to-slate-800/40 border border-slate-700/60" : "bg-gradient-to-b from-white to-slate-50/50 border border-slate-200/80"}`}>
              <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-slate-700/60 bg-slate-800/40' : 'border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-sky-500/20" : "bg-sky-100"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        Médias do Dia
                      </h3>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Indicadores de qualidade agregados
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                      Beta
                    </span>
                  </div>
                  {/* Legend - Estilo Moderno */}
                  <div className={`flex items-center gap-5 px-4 py-2 rounded-xl ${isDarkMode ? "bg-slate-900/50" : "bg-slate-100/80"}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`} />
                      <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Aritmética</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" />
                      <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Ponderada</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-5 gap-5">
                  {/* COR Chart */}
                  {dailyAverages.cor.arithmetic !== null && (() => {
                    const maxHeight = 100 // pixels for bar area
                    const maxVal = qualityLimits.cor.max
                    const arithHeight = Math.max(4, Math.min(maxHeight, (dailyAverages.cor.arithmetic / maxVal) * maxHeight))
                    const weightHeight = dailyAverages.cor.weighted !== null 
                      ? Math.max(4, Math.min(maxHeight, (dailyAverages.cor.weighted / maxVal) * maxHeight))
                      : 0
                    return (
                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/40" : "bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm"}`}>
                      <p className={`text-sm font-bold mb-3 text-center ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        COR
                      </p>
                      
                      <div className="flex gap-2">
                        {/* Y-axis */}
                        <div className="flex flex-col justify-between text-[9px] text-slate-400 h-[100px] py-0.5">
                          <span>{maxVal}</span>
                          <span>{Math.round(maxVal * 0.66)}</span>
                          <span>{Math.round(maxVal * 0.33)}</span>
                          <span>0</span>
                        </div>
                        
                        {/* Chart */}
                        <div className="flex-1 relative">
                          <div className={`relative h-[100px] border-l-2 border-b-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}>
                            {/* Red limit line */}
                            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-red-500 z-0" />
                            
                            {/* Grid */}
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '33.33%' }} />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '66.66%' }} />
                            
                            {/* Bars container */}
                            <div className="absolute bottom-0 left-2 right-2 flex items-end justify-center gap-2 z-20">
                              {/* Arithmetic */}
                              <div className="flex flex-col items-center flex-1">
                                <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                                  {formatCor(dailyAverages.cor.arithmetic)}
                                </span>
                                <div 
                                  className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`}
                                  style={{ height: `${arithHeight}px` }}
                                />
                              </div>
                              {/* Weighted */}
                              {dailyAverages.cor.weighted !== null && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                                    {formatCor(dailyAverages.cor.weighted)}
                                  </span>
                                  <div 
                                    className="w-full rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    style={{ height: `${weightHeight}px` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* X labels */}
                          <div className="flex justify-center gap-4 mt-2 text-[9px] font-medium text-slate-400">
                            <span>Arit.</span>
                            <span>Pond.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })()}
                  
                  {/* POL Chart */}
                  {dailyAverages.pol.arithmetic !== null && (() => {
                    const maxHeight = 100
                    const minVal = qualityLimits.pol.min
                    const maxVal = qualityLimits.pol.max
                    const range = maxVal - minVal
                    const arithHeight = Math.max(4, Math.min(maxHeight, ((dailyAverages.pol.arithmetic - minVal) / range) * maxHeight))
                    const weightHeight = dailyAverages.pol.weighted !== null 
                      ? Math.max(4, Math.min(maxHeight, ((dailyAverages.pol.weighted - minVal) / range) * maxHeight))
                      : 0
                    return (
                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/40" : "bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm"}`}>
                      <p className={`text-sm font-bold mb-3 text-center ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        POL
                      </p>
                      
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-[9px] text-slate-400 h-[100px] py-0.5">
                          <span>{maxVal}</span>
                          <span>99.4</span>
                          <span>99.1</span>
                          <span>{minVal}</span>
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className={`relative h-[100px] border-l-2 border-b-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}>
                            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-red-500 z-0" />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '33.33%' }} />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '66.66%' }} />
                            
                            <div className="absolute bottom-0 left-2 right-2 flex items-end justify-center gap-2 z-20">
                              <div className="flex flex-col items-center flex-1">
                                <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                                  {formatPol(dailyAverages.pol.arithmetic)}
                                </span>
                                <div 
                                  className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`}
                                  style={{ height: `${arithHeight}px` }}
                                />
                              </div>
                              {dailyAverages.pol.weighted !== null && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                                    {formatPol(dailyAverages.pol.weighted)}
                                  </span>
                                  <div 
                                    className="w-full rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    style={{ height: `${weightHeight}px` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-4 mt-2 text-[9px] font-medium text-slate-400">
                            <span>Arit.</span>
                            <span>Pond.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })()}
                  
                  {/* UMI Chart */}
                  {dailyAverages.umi.arithmetic !== null && (() => {
                    const maxHeight = 100
                    const maxVal = qualityLimits.um.max
                    const arithHeight = Math.max(4, Math.min(maxHeight, (dailyAverages.umi.arithmetic / maxVal) * maxHeight))
                    const weightHeight = dailyAverages.umi.weighted !== null 
                      ? Math.max(4, Math.min(maxHeight, (dailyAverages.umi.weighted / maxVal) * maxHeight))
                      : 0
                    return (
                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/40" : "bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm"}`}>
                      <p className={`text-sm font-bold mb-3 text-center ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        UMI
                      </p>
                      
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-[9px] text-slate-400 h-[100px] py-0.5">
                          <span>{maxVal.toFixed(2)}</span>
                          <span>{(maxVal * 0.66).toFixed(2)}</span>
                          <span>{(maxVal * 0.33).toFixed(2)}</span>
                          <span>0</span>
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className={`relative h-[100px] border-l-2 border-b-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}>
                            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-red-500 z-0" />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '33.33%' }} />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '66.66%' }} />
                            
                            <div className="absolute bottom-0 left-2 right-2 flex items-end justify-center gap-2 z-20">
                              <div className="flex flex-col items-center flex-1">
                                <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                                  {formatUmi(dailyAverages.umi.arithmetic)}
                                </span>
                                <div 
                                  className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`}
                                  style={{ height: `${arithHeight}px` }}
                                />
                              </div>
                              {dailyAverages.umi.weighted !== null && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                                    {formatUmi(dailyAverages.umi.weighted)}
                                  </span>
                                  <div 
                                    className="w-full rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    style={{ height: `${weightHeight}px` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-4 mt-2 text-[9px] font-medium text-slate-400">
                            <span>Arit.</span>
                            <span>Pond.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })()}
                  
                  {/* CIN Chart */}
                  {dailyAverages.cin.arithmetic !== null && (() => {
                    const maxHeight = 100
                    const maxVal = qualityLimits.cin.max
                    const arithHeight = Math.max(4, Math.min(maxHeight, (dailyAverages.cin.arithmetic / maxVal) * maxHeight))
                    const weightHeight = dailyAverages.cin.weighted !== null 
                      ? Math.max(4, Math.min(maxHeight, (dailyAverages.cin.weighted / maxVal) * maxHeight))
                      : 0
                    return (
                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/40" : "bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm"}`}>
                      <p className={`text-sm font-bold mb-3 text-center ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        CIN
                      </p>
                      
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-[9px] text-slate-400 h-[100px] py-0.5">
                          <span>{maxVal.toFixed(2)}</span>
                          <span>{(maxVal * 0.66).toFixed(2)}</span>
                          <span>{(maxVal * 0.33).toFixed(2)}</span>
                          <span>0</span>
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className={`relative h-[100px] border-l-2 border-b-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}>
                            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-red-500 z-0" />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '33.33%' }} />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '66.66%' }} />
                            
                            <div className="absolute bottom-0 left-2 right-2 flex items-end justify-center gap-2 z-20">
                              <div className="flex flex-col items-center flex-1">
                                <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                                  {formatCin(dailyAverages.cin.arithmetic)}
                                </span>
                                <div 
                                  className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`}
                                  style={{ height: `${arithHeight}px` }}
                                />
                              </div>
                              {dailyAverages.cin.weighted !== null && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                                    {formatCin(dailyAverages.cin.weighted)}
                                  </span>
                                  <div 
                                    className="w-full rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    style={{ height: `${weightHeight}px` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-4 mt-2 text-[9px] font-medium text-slate-400">
                            <span>Arit.</span>
                            <span>Pond.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })()}
                  
                  {/* RI Chart */}
                  {dailyAverages.ri.arithmetic !== null && (() => {
                    const maxHeight = 100
                    const maxVal = qualityLimits.ri.max
                    const arithHeight = Math.max(4, Math.min(maxHeight, (dailyAverages.ri.arithmetic / maxVal) * maxHeight))
                    const weightHeight = dailyAverages.ri.weighted !== null 
                      ? Math.max(4, Math.min(maxHeight, (dailyAverages.ri.weighted / maxVal) * maxHeight))
                      : 0
                    return (
                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/40" : "bg-gradient-to-b from-white to-slate-50 border-slate-200 shadow-sm"}`}>
                      <p className={`text-sm font-bold mb-3 text-center ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        RI
                      </p>
                      
                      <div className="flex gap-2">
                        <div className="flex flex-col justify-between text-[9px] text-slate-400 h-[100px] py-0.5">
                          <span>{maxVal}</span>
                          <span>{Math.round(maxVal * 0.66)}</span>
                          <span>{Math.round(maxVal * 0.33)}</span>
                          <span>0</span>
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className={`relative h-[100px] border-l-2 border-b-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`}>
                            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-red-500 z-0" />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '33.33%' }} />
                            <div className={`absolute left-0 right-0 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`} style={{ top: '66.66%' }} />
                            
                            <div className="absolute bottom-0 left-2 right-2 flex items-end justify-center gap-2 z-20">
                              <div className="flex flex-col items-center flex-1">
                                <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                                  {formatRi(dailyAverages.ri.arithmetic)}
                                </span>
                                <div 
                                  className={`w-full rounded-t-sm transition-all duration-700 ease-out ${isDarkMode ? "bg-gradient-to-t from-blue-600 to-blue-400" : "bg-gradient-to-t from-blue-500 to-blue-400"}`}
                                  style={{ height: `${arithHeight}px` }}
                                />
                              </div>
                              {dailyAverages.ri.weighted !== null && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className={`text-[9px] font-bold mb-1 relative z-30 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                                    {formatRi(dailyAverages.ri.weighted)}
                                  </span>
                                  <div 
                                    className="w-full rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    style={{ height: `${weightHeight}px` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-4 mt-2 text-[9px] font-medium text-slate-400">
                            <span>Arit.</span>
                            <span>Pond.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Popup */}
      {historyPopup && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[110]" onClick={() => setHistoryPopup(null)} />

          {/* Popup */}
          <div
            className={`fixed z-[120] w-[380px] max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl border ${
              isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
            style={{
              left: (() => {
                const popupWidth = 380
                const margin = 16 // Margem da borda da tela
                let leftPos = historyPopup.x - popupWidth / 2
                
                // Se sair pela direita, ajusta
                if (leftPos + popupWidth + margin > window.innerWidth) {
                  leftPos = window.innerWidth - popupWidth - margin
                }
                
                // Se sair pela esquerda, ajusta
                if (leftPos < margin) {
                  leftPos = margin
                }
                
                return leftPos
              })(),
              top: (() => {
                const margin = 16 // Margem da borda da tela
                const estimatedHeight = 500 // Altura estimada do popup
                let topPos = historyPopup.y + 8
                
                // Se sair por baixo, posiciona acima do botão
                if (topPos + estimatedHeight > window.innerHeight - margin) {
                  topPos = historyPopup.y - estimatedHeight - 8
                  
                  // Se ainda sair por cima, centraliza verticalmente
                  if (topPos < margin) {
                    topPos = Math.max(margin, (window.innerHeight - estimatedHeight) / 2)
                  }
                }
                
                return topPos
              })(),
            }}
          >
            {/* Popup Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <History className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                <span className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Histórico - {historyPopup.truck.licensePlate}
                </span>
              </div>
              <button
                onClick={() => setHistoryPopup(null)}
                className={`p-1 rounded hover:bg-slate-100 ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "text-slate-500"}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Popup Content */}
            <div className="p-5">
              {hasIncompleteDoublecheck(historyPopup.truck) ? (
                // CASO 2: Doublecheck incompleto (sem valores _anterior mas com valores fora de spec)
                <div className="relative">
                  <div
                    className={`absolute left-[22px] top-[52px] bottom-[52px] w-0.5 ${
                      isDarkMode ? "bg-slate-700" : "bg-slate-200"
                    }`}
                  />
                  <div className="space-y-6">
                    {/* ETAPA 1: NIR detectou */}
                    <div className="relative flex gap-4">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center z-10 ${
                          isDarkMode ? "bg-slate-800 border-2 border-blue-500/30" : "bg-white border-2 border-blue-200"
                        }`}
                      >
                        <Scan className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            NIR - Análise Inicial
                          </h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            Fora de Spec
                          </span>
                        </div>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mb-2`}>
                          {formattedDate}
                        </p>
                        <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"} mb-2`}>
                          Detectado parâmetros fora de especificação
                        </p>
                        {formatOutOfSpecValuesLab(historyPopup.truck) && (
                          <div
                            className={`px-3 py-2 rounded-lg text-xs font-mono ${
                              isDarkMode ? "bg-slate-800/60 text-slate-400" : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {formatOutOfSpecValuesLab(historyPopup.truck)}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* ETAPA 2: Erro de dados */}
                    <div className="relative flex gap-4 items-center">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center z-10 ${
                          isDarkMode ? "bg-slate-800 border-2 border-green-500/30" : "bg-white border-2 border-green-200"
                        }`}
                      >
                        <CheckCircle2 className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          Liberado pelo terminal
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !hasDoublecheck(historyPopup.truck) ? (
                // CASO 1: Aprovado diretamente pelo NIR
                <div className="flex flex-col items-center justify-center py-8">
                  <div className={`p-4 rounded-full ${isDarkMode ? "bg-green-500/20" : "bg-green-100"} mb-3`}>
                    <CheckCircle2 className={`h-8 w-8 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                  </div>
                  <p className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Aprovado diretamente pelo NIR
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1`}>
                    Todos os parâmetros dentro da especificação
                  </p>
                </div>
              ) : (
                // Caminhões COM doublecheck: Timeline com 2 etapas (NIR + Laboratório)
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div
                    className={`absolute left-[22px] top-[52px] bottom-[52px] w-0.5 ${
                      isDarkMode ? "bg-slate-700" : "bg-slate-200"
                    }`}
                  />

                  <div className="space-y-6">
                    {/* ETAPA 1: NIR detectou parâmetros fora de especificação */}
                    <div className="relative flex gap-4">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center z-10 ${
                          isDarkMode ? "bg-slate-800 border-2 border-blue-500/30" : "bg-white border-2 border-blue-200"
                        }`}
                      >
                        <Scan className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 pt-1">
                        <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          Análise com tecnologia NIR
                        </h4>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mb-3`}>
                          {formatDateTimePtBr(selectedDay.toISOString())}
                        </p>
                        
                        {/* Display NIR results that were out of spec */}
                        {getNIRResultsArray(historyPopup.truck).length > 0 && (
                          <div className="space-y-1.5">
                            {getNIRResultsArray(historyPopup.truck).map((result) => (
                              <div
                                key={result.metric}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  isDarkMode
                                    ? "bg-amber-500/20 text-amber-200"
                                    : "bg-amber-50 text-amber-900"
                                }`}
                              >
                                <span>{result.metric} APONTADA: {result.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ETAPA 2: Laboratório realizou doublecheck */}
                    <div className="relative flex gap-4">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center z-10 ${
                          isDarkMode ? "bg-slate-800 border-2 border-purple-500/30" : "bg-white border-2 border-purple-200"
                        }`}
                      >
                        <Beaker className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              Reanálise em laboratório
                            </h4>
                          {/* Display date from any available metric data */}
                          {(historyPopup.truck.corData || historyPopup.truck.polData || historyPopup.truck.umiData || historyPopup.truck.cinData || historyPopup.truck.riData) && (
                            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1`}>
                              {formatDateTimePtBr(historyPopup.truck.corData || historyPopup.truck.polData || historyPopup.truck.umiData || historyPopup.truck.cinData || historyPopup.truck.riData)}
                            </p>
                          )}
                          </div>
                          {/* Document buttons */}
                          <div className="flex gap-1.5">
                            {historyPopup.truck.linkBoletimDb && (
                              <a
                                href={updateBoletimToken(historyPopup.truck.linkBoletimDb)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs font-medium ${
                                  isDarkMode
                                    ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                }`}
                                title="Ver boletim Doublecheck"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Ver boletim
                              </a>
                            )}
                            {historyPopup.truck.linkBoletimB7 && (
                              <a
                                href={historyPopup.truck.linkBoletimB7}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                  isDarkMode
                                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                }`}
                                title="Ver boletim Bola 7"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* Display lab results for metrics that were out of spec in NIR */}
                        {getLabResultsArray(historyPopup.truck).length > 0 && (
                          <div className="space-y-1.5">
                            {getLabResultsArray(historyPopup.truck).map((result) => (
                              <div
                                key={result.metric}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  isDarkMode
                                    ? "bg-purple-500/20 text-purple-200"
                                    : "bg-purple-50 text-purple-900"
                                }`}
                              >
                                <span>{result.metric} REVISADA: {result.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ETAPA 3: Status de Liberação */}
                    <div className="relative flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center z-10 ${
                          historyPopup.truck.autorizacao === "APROVADO" || historyPopup.truck.status === "approved"
                            ? isDarkMode
                              ? "bg-slate-800 border-2 border-green-500/30"
                              : "bg-white border-2 border-green-200"
                            : historyPopup.truck.autorizacao === "RECUSADO"
                              ? isDarkMode
                                ? "bg-slate-800 border-2 border-rose-500/30"
                                : "bg-white border-2 border-rose-200"
                              : isDarkMode
                                ? "bg-slate-800 border-2 border-slate-600"
                                : "bg-white border-2 border-slate-300"
                        }`}
                      >
                        {historyPopup.truck.autorizacao === "APROVADO" || historyPopup.truck.status === "approved" ? (
                          <CheckCircle2 className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                        ) : historyPopup.truck.autorizacao === "RECUSADO" ? (
                          <XCircle className={`h-5 w-5 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`} />
                        ) : (
                          <Clock className={`h-5 w-5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {getFinalDecisionTextHistory(historyPopup.truck)}
                        </h4>
                        {historyPopup.truck.dataAutorizacao && 
                         (historyPopup.truck.autorizacao === "APROVADO" || 
                          historyPopup.truck.autorizacao === "RECUSADO" || 
                          (historyPopup.truck.status === "approved" && !hasDoublecheck(historyPopup.truck))) && (
                          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1`}>
                            {formatDateTimePtBr(historyPopup.truck.dataAutorizacao)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
