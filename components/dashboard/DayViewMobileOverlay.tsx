"use client"

import { useState, useEffect, useMemo } from "react"
import {
  X,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Clock,
  Search,
  History,
  Beaker,
  Scan,
  CheckCircle2,
  ChevronLeft,
  FileText,
} from "lucide-react"
import { formatCor, formatPol, formatUmi, formatCin, formatRi, formatDateTimePtBr, formatWeight } from "@/lib/utils"

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

interface DayViewMobileOverlayProps {
  selectedDay: Date
  isDarkMode: boolean
  trucksByDate: Record<string, TruckData[]>
  onClose: () => void
  initialSearchTerm?: string // Initial search term to filter trucks
  onPreviousDay?: () => void
  onNextDay?: () => void
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

// Helper function to format only out-of-spec values
const formatOutOfSpecValues = (truck: TruckData): string => {
  if (truck.houveDoublecheck) {
    return formatOutOfSpecValuesLab(truck)
  } else {
    return formatOutOfSpecValuesNIR(truck)
  }
}

export function DayViewMobileOverlay({ 
  selectedDay, 
  isDarkMode, 
  trucksByDate, 
  onClose, 
  initialSearchTerm = "",
  onPreviousDay,
  onNextDay
}: DayViewMobileOverlayProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "apurado" | "rejected">("all")
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [expandedTrucks, setExpandedTrucks] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [showSearch, setShowSearch] = useState(!!initialSearchTerm) // Show search if there's an initial term
  const [historyTruck, setHistoryTruck] = useState<TruckData | null>(null)

  // Reset when day changes, but keep initialSearchTerm
  useEffect(() => {
    setFilterStatus("all")
    setShowOnlyIncomplete(false)
    setExpandedTrucks(new Set())
    setSearchTerm(initialSearchTerm)
    setShowSearch(!!initialSearchTerm)
    setHistoryTruck(null)
  }, [selectedDay, initialSearchTerm])

  const formattedDate = `${selectedDay.getDate()} de ${months[selectedDay.getMonth()]} de ${selectedDay.getFullYear()}`

  // Get trucks for the selected day
  const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
  const dayTrucks = useMemo(() => trucksByDate[dateStr] || [], [trucksByDate, dateStr])

  // Derived lists
  const incompleteTrucks = useMemo(() => dayTrucks.filter(hasIncompleteData), [dayTrucks])
  const completeTrucks = useMemo(() => dayTrucks.filter((t) => !hasIncompleteData(t)), [dayTrucks])

  // KPIs
  const kpis = useMemo(
    () => ({
      total: dayTrucks.length,
      approved: completeTrucks.filter((t) => t.status === "approved").length,
      apurado: completeTrucks.filter((t) => t.status === "apurado").length,
      rejected: completeTrucks.filter((t) => t.status === "rejected").length,
      awaiting: incompleteTrucks.length,
      totalTonnage: dayTrucks.reduce((acc, t) => acc + (t.grossWeight || 0), 0),
      approvedTonnage: completeTrucks
        .filter((t) => t.status === "approved")
        .reduce((acc, t) => acc + (t.grossWeight || 0), 0),
      apuradoTonnage: completeTrucks
        .filter((t) => t.status === "apurado")
        .reduce((acc, t) => acc + (t.grossWeight || 0), 0),
      rejectedTonnage: completeTrucks
        .filter((t) => t.status === "rejected")
        .reduce((acc, t) => acc + (t.grossWeight || 0), 0),
    }),
    [dayTrucks, completeTrucks, incompleteTrucks],
  )

  // Filtered trucks
  const filteredTrucks = useMemo(() => {
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

  const toggleTruckExpand = (truckId: string) => {
    setExpandedTrucks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(truckId)) newSet.delete(truckId)
      else newSet.add(truckId)
      return newSet
    })
  }

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

  return (
    <div className={`fixed inset-0 z-[9997] flex flex-col ${isDarkMode ? "bg-[#0a0f1a]" : "bg-slate-50"}`}>
      {/* Header (Mobile) - alinhado com a identidade do calendário */}
      <header
        className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? "border-slate-800 bg-[#0d1220]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium ${
              isDarkMode
                ? "text-slate-300 hover:text-white hover:bg-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Retornar
          </button>

          <div className={`h-6 w-px ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />

          <div className="flex items-center gap-1">
            <button
              onClick={onPreviousDay}
              className={`p-1.5 rounded-full ${
                isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
              title="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-[110px]">
              <h2 className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {selectedDay.getDate()} de {months[selectedDay.getMonth()]}
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{dayTrucks.length} caminhões</p>
            </div>
            <button
              onClick={onNextDay}
              className={`p-1.5 rounded-full ${
                isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
              title="Próximo dia"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full ${
              isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
            }`}
            title={showSearch ? "Fechar busca" : "Buscar"}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search bar (conditionally shown) */}
      {showSearch && (
        <div
          className={`px-4 py-3 border-b ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"}`}
        >
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
            />
            <input
              type="text"
              placeholder="Buscar placa, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm ${
                isDarkMode
                  ? "bg-slate-800 text-white placeholder-slate-500 border border-slate-700"
                  : "bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200"
              }`}
            />
          </div>
        </div>
      )}

      {kpis.awaiting > 0 && (
        <div
          className={`mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg text-xs ${
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
          <div className="flex-1 min-w-0">
            {isRecentDay ? (
              <>
                <p className="text-xs font-medium">Aguardando compilação de dados.</p>
                <button
                  onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                  className={`text-[11px] mt-0.5 hover:underline ${showOnlyIncomplete ? "font-semibold underline" : ""}`}
                >
                  {kpis.awaiting} {kpis.awaiting === 1 ? "caminhão aguardando" : "caminhões aguardando"}.
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-medium">Dados já deveriam ter sido compilados.</p>
                <button
                  onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                  className={`text-[11px] mt-0.5 hover:underline ${showOnlyIncomplete ? "font-semibold underline" : ""}`}
                >
                  {kpis.awaiting} com dados incompletos.
                </button>
              </>
            )}
          </div>
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
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Cards de estatísticas (Mobile) - mais legíveis e sem scroll horizontal */}
      {!showOnlyIncomplete && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "TOTAL",
                value: kpis.total,
                tonnage: kpis.totalTonnage,
                icon: Truck,
                bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-50",
                border: isDarkMode ? "border-blue-800/40" : "border-blue-200",
                iconBg: isDarkMode ? "bg-blue-900/30" : "bg-blue-100",
                iconColor: isDarkMode ? "text-blue-300" : "text-blue-600",
                textColor: isDarkMode ? "text-blue-300" : "text-blue-700",
                filter: "all" as const,
              },
              {
                label: "APROVADOS",
                value: kpis.approved,
                tonnage: kpis.approvedTonnage,
                icon: CheckCircle,
                bg: isDarkMode ? "bg-green-950/40" : "bg-green-50",
                border: isDarkMode ? "border-green-800/40" : "border-green-200",
                iconBg: isDarkMode ? "bg-green-900/30" : "bg-green-100",
                iconColor: isDarkMode ? "text-green-300" : "text-green-600",
                textColor: isDarkMode ? "text-green-300" : "text-green-700",
                filter: "approved" as const,
              },
              {
                label: "APONTADOS",
                value: kpis.apurado,
                tonnage: kpis.apuradoTonnage,
                icon: AlertTriangle,
                bg: isDarkMode ? "bg-amber-950/40" : "bg-amber-50",
                border: isDarkMode ? "border-amber-800/40" : "border-amber-200",
                iconBg: isDarkMode ? "bg-amber-900/30" : "bg-amber-100",
                iconColor: isDarkMode ? "text-amber-300" : "text-amber-600",
                textColor: isDarkMode ? "text-amber-300" : "text-amber-700",
                filter: "apurado" as const,
              },
              {
                label: "RECUSADOS",
                value: kpis.rejected,
                tonnage: kpis.rejectedTonnage,
                icon: XCircle,
                bg: isDarkMode ? "bg-rose-950/40" : "bg-rose-50",
                border: isDarkMode ? "border-rose-800/40" : "border-rose-200",
                iconBg: isDarkMode ? "bg-rose-900/30" : "bg-rose-100",
                iconColor: isDarkMode ? "text-rose-300" : "text-rose-600",
                textColor: isDarkMode ? "text-rose-300" : "text-rose-700",
                filter: "rejected" as const,
              },
            ].map((card) => {
              const isActive = filterStatus === card.filter
              return (
                <button
                  key={card.label}
                  onClick={() => setFilterStatus(card.filter)}
                  className={`relative rounded-xl border ${card.bg} ${card.border} p-3.5 text-left transition-all active:scale-[0.99] ${
                    isActive
                      ? "ring-2 ring-sky-500 ring-offset-1 " +
                        (isDarkMode ? "ring-offset-slate-900" : "ring-offset-white")
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {card.label}
                      </p>
                      <p className={`mt-1 text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                      <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {formatWeight(card.tonnage)} toneladas
                      </p>
                    </div>
                    <div className={`${card.iconBg} rounded-lg p-2 shrink-0`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de caminhoes */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredTrucks.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {showOnlyIncomplete ? "Todos os caminhões já possuem análises." : "Nenhum caminhão encontrado"}
            </div>
          ) : (
            filteredTrucks.map((truck) => {
              const isExpanded = expandedTrucks.has(truck.id)
              const isIncomplete = hasIncompleteData(truck)
              
              // Check if there was doublecheck (lab re-analysis)
              const hadDoublecheck = hasDoublecheck(truck)
              
              // Determine which values to display: lab results if doublecheck, else NIR results
              const displayCor = truck.cor
              const displayPol = truck.pol
              const displayUmi = truck.umi
              const displayCin = truck.cin
              const displayRi = truck.ri
              
              // Check if each metric had doublecheck
              const corIsFromLab = metricHadDoublecheck(truck, "cor")
              const polIsFromLab = metricHadDoublecheck(truck, "pol")
              const umiIsFromLab = metricHadDoublecheck(truck, "umi")
              const cinIsFromLab = metricHadDoublecheck(truck, "cin")
              const riIsFromLab = metricHadDoublecheck(truck, "ri")
              
              // For NIR values (without doublecheck), check if out of spec
              const isCorOut = !corIsFromLab && displayCor !== null && isOutOfSpec("cor", displayCor)
              const isPolOut = !polIsFromLab && displayPol !== null && isOutOfSpec("pol", displayPol)
              const isUmiOut = !umiIsFromLab && displayUmi !== null && isOutOfSpec("um", displayUmi)
              const isCinOut = !cinIsFromLab && displayCin !== null && isOutOfSpec("cin", displayCin)
              const isRiOut = !riIsFromLab && displayRi !== null && isOutOfSpec("ri", displayRi)
              
              // Purple color indicator for doublecheck results
              const isDoublecheckApproved = hadDoublecheck

              return (
                <div
                  key={truck.id}
                  className={`rounded-xl overflow-hidden ${
                    isDarkMode ? "bg-slate-800/50 border border-slate-700/50" : "bg-white border border-slate-200"
                  }`}
                >
                  <button
                    onClick={() => toggleTruckExpand(truck.id)}
                    className={`w-full p-3 flex items-center justify-between ${
                      isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""} ${
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-mono font-semibold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
                        >
                          {truck.licensePlate || "-"}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {getShortName(truck.client)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {formatPeso(truck.grossWeight)} T
                      </span>
                      
                      {/* Botão Histórico */}
                      {hasCompleteHistoryData(truck) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setHistoryTruck(truck)
                          }}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            isDarkMode
                              ? "bg-blue-500/20 text-blue-300 active:bg-blue-500/30"
                              : "bg-blue-100 text-blue-700 active:bg-blue-200"
                          }`}
                          title="Ver histórico"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      )}
                      
                      {/* Botão Doublecheck */}
                      {truck.linkBoletimDb && (
                        <a
                          href={truck.linkBoletimDb}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            isDarkMode
                              ? "bg-purple-500/20 text-purple-300 active:bg-purple-500/30"
                              : "bg-purple-100 text-purple-700 active:bg-purple-200"
                          }`}
                          title="Ver boletim Doublecheck"
                        >
                          <Beaker className="h-3.5 w-3.5" />
                        </a>
                      )}
                      
                      {/* Botão Bola 7 */}
                      {truck.linkBoletimB7 && (
                        <a
                          href={truck.linkBoletimB7}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            isDarkMode
                              ? "bg-amber-500/20 text-amber-300 active:bg-amber-500/30"
                              : "bg-amber-100 text-amber-700 active:bg-amber-200"
                          }`}
                          title="Ver boletim Bola 7"
                        >
                          <Scan className="h-3.5 w-3.5" />
                        </a>
                      )}
                      
                      {/* Status Icon */}
                      {isIncomplete ? (
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded ${
                            isDarkMode
                              ? "bg-slate-700/40 text-slate-400"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded ${
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
                                : // Apurado/Rejected awaiting lab (null authorization)
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
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (truck.status === "apurado" || truck.status === "rejected") &&
                            truck.autorizacao === "APROVADO" ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (truck.status === "apurado" || truck.status === "rejected") &&
                            truck.autorizacao === null ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className={`px-3 pb-3 pt-1 border-t ${isDarkMode ? "border-slate-700/50 bg-slate-900/30" : "border-slate-100 bg-slate-50"}`}
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Nota Fiscal</p>
                          <p className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{truck.nfNumber || "-"}</p>
                        </div>
                        <div>
                          <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Fornecedor</p>
                          <p className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                            {getShortName(truck.supplier)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status with text */}
                      {!isIncomplete && (
                        <div className="mb-2">
                          <p className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Status</p>
                          <p className={`text-xs font-medium ${
                            isMissingInfo(truck)
                              ? isDarkMode ? "text-slate-400" : "text-slate-600"
                              : truck.status === "approved" || hasIncompleteDoublecheck(truck)
                                ? isDarkMode ? "text-green-300" : "text-green-700"
                                : (truck.status === "apurado" || truck.status === "rejected") && truck.autorizacao === "APROVADO"
                                  ? isDarkMode ? "text-green-300" : "text-green-700"
                                  : (truck.status === "apurado" || truck.status === "rejected") && truck.autorizacao === null
                                    ? isDarkMode ? "text-amber-300" : "text-amber-700"
                                    : isDarkMode ? "text-rose-300" : "text-rose-700"
                          }`}>
                            {getFinalDecisionText(truck)}
                          </p>
                        </div>
                      )}

                      {!isIncomplete && (
                        <div
                          className={`mt-3 pt-3 border-t ${isDarkMode ? "border-slate-700/50" : "border-slate-200"}`}
                        >
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                          >
                            Indicadores
                          </p>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: "COR", value: displayCor, format: formatCor, isFromLab: corIsFromLab, outOfSpec: isCorOut, date: truck.corData, analyst: truck.corAnalista },
                              { label: "POL", value: displayPol, format: formatPol, isFromLab: polIsFromLab, outOfSpec: isPolOut, date: truck.polData, analyst: truck.polAnalista },
                              { label: "UMI", value: displayUmi, format: formatUmi, isFromLab: umiIsFromLab, outOfSpec: isUmiOut, date: truck.umiData, analyst: truck.umiAnalista },
                              { label: "CIN", value: displayCin, format: formatCin, isFromLab: cinIsFromLab, outOfSpec: isCinOut, date: truck.cinData, analyst: truck.cinAnalista },
                              { label: "RI", value: displayRi, format: formatRi, isFromLab: riIsFromLab, outOfSpec: isRiOut, date: truck.riData, analyst: truck.riAnalista },
                            ].map((ind) => (
                              <div key={ind.label} className="text-center">
                                <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                  {ind.label}
                                </p>
                                <p
                                  className={`text-xs font-medium cursor-help ${
                                    ind.isFromLab
                                      ? isDarkMode
                                        ? "text-purple-400"
                                        : "text-purple-600"
                                      : ind.outOfSpec
                                        ? ind.label === "RI"
                                          ? "text-red-400"
                                          : "text-amber-400"
                                        : isDarkMode
                                          ? "text-slate-200"
                                          : "text-slate-700"
                                  }`}
                                  title={`Resultado: ${ind.value !== null ? ind.format(ind.value) : "N/A"}\nData: ${ind.date || "N/A"}\n${ind.analyst && ind.analyst !== "robo_lab" ? `Analista: ${ind.analyst}` : ""}`}
                                >
                                  {ind.value !== null ? ind.format(ind.value) : "-"}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* History Button */}
                          {hasCompleteHistoryData(truck) && (
                            <button
                              onClick={() => setHistoryTruck(truck)}
                              className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                                isDarkMode
                                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <History className="h-3.5 w-3.5" />
                              Ver histórico de análise
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* History Sheet (Mobile fullscreen) */}
      {historyTruck && (
        <div className={`fixed inset-0 z-[9998] flex flex-col ${isDarkMode ? "bg-[#0a0f1a]" : "bg-slate-50"}`}>
          {/* Header */}
          <header
            className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${
              isDarkMode ? "border-slate-800 bg-[#0d1220]" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <History className={`h-5 w-5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
              <div>
                <h2 className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Histórico
                </h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {historyTruck.licensePlate}
                </p>
              </div>
            </div>
            <button
              onClick={() => setHistoryTruck(null)}
              className={`p-2 rounded-full ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {hasIncompleteDoublecheck(historyTruck) ? (
              // CASO 2: Doublecheck incompleto (sem valores _anterior mas com valores fora de spec)
              <div className="relative pb-2">
                <div
                  className={`absolute left-[26px] top-[60px] bottom-[60px] w-0.5 ${
                    isDarkMode ? "bg-slate-700" : "bg-slate-200"
                  }`}
                />
                <div className="space-y-6">
                  {/* ETAPA 1: NIR detectou */}
                  <div className="relative flex gap-4">
                    <div
                      className={`flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center z-10 ${
                        isDarkMode ? "bg-slate-800 border-2 border-blue-500/30" : "bg-white border-2 border-blue-200"
                      }`}
                    >
                      <Scan className={`h-6 w-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
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
                      {formatOutOfSpecValuesLab(historyTruck) && (
                        <div
                          className={`px-3 py-2 rounded-lg text-xs font-mono ${
                            isDarkMode ? "bg-slate-800/60 text-slate-400" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {formatOutOfSpecValuesLab(historyTruck)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* ETAPA 2: Erro de dados */}
                  <div className="relative flex gap-4 items-center">
                    <div
                      className={`flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center z-10 ${
                        isDarkMode ? "bg-slate-800 border-2 border-green-500/30" : "bg-white border-2 border-green-200"
                      }`}
                    >
                      <CheckCircle2 className={`h-6 w-6 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        Liberado pelo terminal
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasDoublecheck(historyTruck) ? (
              // CASO 1: Aprovado diretamente pelo NIR
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`p-4 rounded-full ${isDarkMode ? "bg-green-500/20" : "bg-green-100"} mb-3`}>
                  <CheckCircle2 className={`h-10 w-10 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                </div>
                <p className={`text-base font-medium ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Aprovado diretamente pelo NIR
                </p>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1 text-center px-4`}>
                  Todos os parâmetros dentro da especificação
                </p>
              </div>
                ) : (
                  // Caminhões COM doublecheck: Timeline com 2 etapas (NIR + Laboratório)
                  <div className="relative pb-2">
                    {/* Timeline vertical line */}
                    <div
                      className={`absolute left-[26px] top-[60px] bottom-[60px] w-0.5 ${
                        isDarkMode ? "bg-slate-700" : "bg-slate-200"
                      }`}
                    />

                <div className="space-y-6">
                  {/* ETAPA 1: NIR detectou parâmetros fora de especificação */}
                  <div className="relative flex gap-4">
                    <div
                      className={`flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center z-10 ${
                        isDarkMode ? "bg-slate-800 border-2 border-blue-500/30" : "bg-white border-2 border-blue-200"
                      }`}
                    >
                      <Scan className={`h-6 w-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    </div>
                    <div className="flex-1 pt-2">
                      <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        Análise com tecnologia NIR
                      </h4>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mb-3`}>
                        {formattedDate}
                      </p>
                      
                      {/* Display NIR results that were out of spec */}
                      {getNIRResultsArray(historyTruck).length > 0 && (
                        <div className="space-y-1.5">
                          {getNIRResultsArray(historyTruck).map((result) => (
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
                      className={`flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center z-10 ${
                        isDarkMode ? "bg-slate-800 border-2 border-purple-500/30" : "bg-white border-2 border-purple-200"
                      }`}
                    >
                      <Beaker className={`h-6 w-6 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                    </div>
                  <div className="flex-1 pt-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          Reanálise em laboratório
                        </h4>
                        {/* Display date from any available metric data */}
                        {(historyTruck.corData || historyTruck.polData || historyTruck.umiData || historyTruck.cinData || historyTruck.riData) && (
                          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1`}>
                            {formatDateTimePtBr(historyTruck.corData || historyTruck.polData || historyTruck.umiData || historyTruck.cinData || historyTruck.riData)}
                          </p>
                        )}
                      </div>
                      {/* Document buttons */}
                      <div className="flex gap-1.5">
                        {historyTruck.linkBoletimDb && (
                          <a
                            href={historyTruck.linkBoletimDb}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                              isDarkMode
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-purple-100 text-purple-700"
                            }`}
                            title="Ver boletim Doublecheck"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {historyTruck.linkBoletimB7 && (
                          <a
                            href={historyTruck.linkBoletimB7}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                              isDarkMode
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            title="Ver boletim Bola 7"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                      
                      {/* Display lab results for metrics that were out of spec in NIR */}
                      {getLabResultsArray(historyTruck).length > 0 && (
                        <div className="space-y-1.5">
                          {getLabResultsArray(historyTruck).map((result) => (
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
                      className={`flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center z-10 ${
                        historyTruck.autorizacao === "APROVADO" || historyTruck.status === "approved"
                          ? isDarkMode
                            ? "bg-slate-800 border-2 border-green-500/30"
                            : "bg-white border-2 border-green-200"
                          : historyTruck.autorizacao === "RECUSADO"
                            ? isDarkMode
                              ? "bg-slate-800 border-2 border-rose-500/30"
                              : "bg-white border-2 border-rose-200"
                            : isDarkMode
                              ? "bg-slate-800 border-2 border-slate-600"
                              : "bg-white border-2 border-slate-300"
                      }`}
                    >
                      {historyTruck.autorizacao === "APROVADO" || historyTruck.status === "approved" ? (
                        <CheckCircle2 className={`h-6 w-6 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                      ) : historyTruck.autorizacao === "RECUSADO" ? (
                        <XCircle className={`h-6 w-6 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`} />
                      ) : (
                        <Clock className={`h-6 w-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {getFinalDecisionTextHistory(historyTruck)}
                      </h4>
                      {historyTruck.dataAutorizacao && 
                       (historyTruck.autorizacao === "APROVADO" || 
                        historyTruck.autorizacao === "RECUSADO" || 
                        (historyTruck.status === "approved" && !hasDoublecheck(historyTruck))) && (
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-1`}>
                          {formatHistoryDate(historyTruck.dataAutorizacao)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
