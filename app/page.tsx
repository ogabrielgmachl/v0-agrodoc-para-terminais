"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop"
import { DashboardMobile } from "@/components/dashboard/DashboardMobile"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatInteger, formatCor, formatPol, formatUmi, formatCin, formatRi } from "@/lib/utils"
import { loadTrucksForDate, clearTruckCache } from "@/lib/load-trucks"
import { type ShipsByDate } from "@/lib/load-ships"
import { createClient } from "@/lib/supabase/client"
import { loadAllShips, clearShipCache } from "@/lib/load-ships" // Import loadAllShips and clearShipCache
import { calculateEmbarqueMonthStats } from "@/lib/embarque-stats"

type TruckData = {
  id: string
  licensePlate: string
  grossWeight: number | null
  // Campos de autorização (doublecheck do laboratório)
  autorizacao: "APROVADO" | "RECUSADO" | null // null = aguardando
  dataAutorizacao: string | null
  dataAutorizacaoFormatada: string | null
  nomeUsuarioAutorizacao: string | null
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
  // Analistas anteriores (NIR se houve doublecheck)
  corAnalistaAnterior: string | null
  polAnalistaAnterior: string | null
  umiAnalistaAnterior: string | null
  cinAnalistaAnterior: string | null
  riAnalistaAnterior: string | null
  // Links para boletins
  linkBoletimDb: string | null // Link do doublecheck
  linkBoletimB7: string | null // Link do Bola 7
  status: string
  client: string
  supplier: string
  nfNumber: string | null
  isRepeated: boolean
  hasOtherOutOfSpec: boolean
  // Indica se houve doublecheck (tem algum valor _anterior)
  houveDoublecheck: boolean
  // Indica se é um caminhão Bola 7
  isBola7: boolean
}

const qualityLimits = {
  pol: { min: 98.9, max: 99.6 },
  cor: { max: 1250 },
  cin: { max: 0.2 },
  ri: { max: 500 },
  umi: { max: 0.2 },
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
    case "umi":
      return value > qualityLimits.umi.max
    default:
      return false
  }
}

const truckDataNovember2025: Record<number, number> = {}
const tonnageDataNovember2025: Record<number, number> = {}

const truckDataDecember2025: Record<number, number> = {}
const tonnageDataDecember2025: Record<number, number> = {}

const shouldHaveData = (date: Date, referenceDate: Date) => {
  // Dados são publicados toda segunda-feira para a semana anterior (seg a dom)
  // Se hoje é dia 24 de novembro de 2025 (segunda), temos dados até dia 23
  return date < referenceDate
}

const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days = []

  // Dias do mês anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      month: "prev" as const,
      date: new Date(year, month - 1, prevMonthLastDay - i),
    })
  }

  // Dias do mês atual
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      month: "current" as const,
      date: new Date(year, month, day),
    })
  }

  // Dias do próximo mês
  const remainingCells = 42 - days.length // 6 rows x 7 columns
  for (let day = 1; day <= remainingCells; day++) {
    days.push({
      day,
      month: "next" as const,
      date: new Date(year, month + 1, day),
    })
  }

  return days
}

export default function DashboardPage() {
  const router = useRouter()
  const now = new Date()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonthIndex, setCurrentMonthIndex] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme")
      return saved === "dark"
    }
    return false
  })
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false)
  const [detailsSidebarOpen, setDetailsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "apurado" | "rejected">("all")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const itemsPerPage = 50

  const [showLogoutMenu, setShowLogoutMenu] = useState(false)

  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [trucksByDate, setTrucksByDate] = useState<Record<string, TruckData[]>>({})
  const [dayStatsByDate, setDayStatsByDate] = useState<Record<string, any>>({})

  // Refs para evitar re-download em loop e permitir modo "light"
  const trucksByDateRef = useRef<Record<string, TruckData[]>>({})
  useEffect(() => {
    trucksByDateRef.current = trucksByDate
  }, [trucksByDate])

  const dayStatsByDateRef = useRef<Record<string, any>>({})
  useEffect(() => {
    dayStatsByDateRef.current = dayStatsByDate
  }, [dayStatsByDate])

  const [showDayAverageDialog, setShowDayAverageDialog] = useState(false)
  const [showAverageCards, setShowAverageCards] = useState(false)
  const [tableViewMode, setTableViewMode] = useState<"main" | "by-client">("main")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  const [currentModule, setCurrentModule] = useState<"recepcao" | "embarque">("recepcao")
  const [currentProduct, setCurrentProduct] = useState<"acucar" | "soja" | "milho">("acucar")
  const [recepcaoMenuExpanded, setRecepcaoMenuExpanded] = useState(true)
  const [navigationExpanded, setNavigationExpanded] = useState(true)

  const [showRotativeStock, setShowRotativeStock] = useState(false)
  const trucksPerPage = 10

  const [shipsByDate, setShipsByDate] = useState<ShipsByDate>({})

  const lastLoadTimestamp = useRef<number>(Date.now())

  // Persist theme to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light")
    }
  }, [isDarkMode])

  const loadData = useCallback(
    async (mode: "month" | "light" = "month") => {
      try {
        setIsLoading(true)
        lastLoadTimestamp.current = Date.now()

        const monthPrefix = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}-`

        const [datesResponse, shipsResponse] = await Promise.all([
          fetch("/api/available-dates", { cache: "no-store" }),
          fetch(`/api/ships?year=${currentYear}&month=${currentMonthIndex + 1}`, { cache: "no-store" }),
        ])

        const { dates: availableDates } = await datesResponse.json()
        const monthDates = availableDates.filter((d: string) => d.startsWith(monthPrefix))

        const alreadyLoaded = trucksByDateRef.current
        const datesToLoad = mode === "light" ? monthDates.filter((d: string) => !alreadyLoaded[d]) : monthDates

        const newTrucksByDate: Record<string, TruckData[]> = {}
        const nextDayStatsByDate: Record<string, any> = { ...dayStatsByDateRef.current }

        if (datesToLoad.length > 0) {
          console.log(`[v0] Loading trucks for ${datesToLoad.length} dates`)
          const allTrucksArrays = await Promise.all(datesToLoad.map((date: string) => loadTrucksForDate(date)))

          console.log(`[v0] Received truck data:`, allTrucksArrays.filter((t) => t && t.length > 0).length, "dates with data")

          datesToLoad.forEach((date: string, index: number) => {
            const trucksForDate = allTrucksArrays[index]
            if (trucksForDate && trucksForDate.length > 0) {
              console.log(`[v0] Processing ${trucksForDate.length} trucks for ${date}`)
              newTrucksByDate[date] = trucksForDate.map((truck: any) => ({
                id: truck.id,
                licensePlate: truck.licensePlate,
                grossWeight: truck.grossWeight,
                // Campos de autorização
                autorizacao: truck.autorizacao || null,
                dataAutorizacao: truck.dataAutorizacao || null,
                dataAutorizacaoFormatada: truck.dataAutorizacaoFormatada || null,
                nomeUsuarioAutorizacao: truck.nomeUsuarioAutorizacao || null,
                // Análises finais (resultado NIR ou Doublecheck)
                cor: truck.cor,
                pol: truck.pol,
                umi: truck.umi,
                cin: truck.cin,
                ri: truck.ri,
                // Datas das análises finais
                corData: truck.corData || null,
                polData: truck.polData || null,
                umiData: truck.umiData || null,
                cinData: truck.cinData || null,
                riData: truck.riData || null,
                // Análises anteriores (NIR se houve doublecheck)
                corAnterior: truck.corAnterior ?? null,
                polAnterior: truck.polAnterior ?? null,
                umiAnterior: truck.umiAnterior ?? null,
                cinAnterior: truck.cinAnterior ?? null,
                riAnterior: truck.riAnterior ?? null,
                // Datas NIR (sempre data original do NIR)
                corDataNir: truck.corDataNir || null,
                polDataNir: truck.polDataNir || null,
                umiDataNir: truck.umiDataNir || null,
                cinDataNir: truck.cinDataNir || null,
                riDataNir: truck.riDataNir || null,
                // Analistas (não exibir "robo_lab")
                corAnalista: truck.corAnalista || null,
                polAnalista: truck.polAnalista || null,
                umiAnalista: truck.umiAnalista || null,
                cinAnalista: truck.cinAnalista || null,
                riAnalista: truck.riAnalista || null,
                // Analistas anteriores
                corAnalistaAnterior: truck.corAnalistaAnterior || null,
                polAnalistaAnterior: truck.polAnalistaAnterior || null,
                umiAnalistaAnterior: truck.umiAnalistaAnterior || null,
                cinAnalistaAnterior: truck.cinAnalistaAnterior || null,
                riAnalistaAnterior: truck.riAnalistaAnterior || null,
                // Links para boletins
                linkBoletimDb: truck.linkBoletimDb || null,
                linkBoletimB7: truck.linkBoletimB7 || null,
                status: truck.status,
                client: truck.client,
                supplier: truck.supplier,
                nfNumber: truck.nfNumber,
                isRepeated: truck.isRepeated || false,
                hasOtherOutOfSpec: truck.hasOtherOutOfSpec || false,
                houveDoublecheck: truck.houveDoublecheck || false,
                isBola7: truck.isBola7 || false,
              }))

              // Calcula estatísticas do dia
              const dayStats = {
                totalTrucks: trucksForDate.length,
                totalTonnage: trucksForDate.reduce((sum: number, t: any) => sum + (t.grossWeight || 0), 0),
                approvedCount: trucksForDate.filter((t: any) => t.autorizacao === "APROVADO").length,
                rejectedCount: trucksForDate.filter((t: any) => t.autorizacao === "RECUSADO").length,
                pendingCount: trucksForDate.filter((t: any) => !t.autorizacao).length,
              }
              nextDayStatsByDate[date] = dayStats
            }
          })
        }

        // Atualizar state uma única vez
        setTrucksByDate((prev) => ({ ...prev, ...newTrucksByDate }))
        setDayStatsByDate(nextDayStatsByDate)

        const merged = { ...trucksByDateRef.current, ...newTrucksByDate }
        const monthTrucks = monthDates.flatMap((d: string) => merged[d] || [])
        setTrucks(monthTrucks)

        // Carregar navios do Supabase via API
        if (shipsResponse.ok) {
          try {
            const shipsJson = await shipsResponse.json()
            const loadedShips = shipsJson?.shipsByDate ?? {}
            console.log("[v0] Navios carregados do Supabase:", Object.keys(loadedShips).length, "datas")
            setShipsByDate(loadedShips)
          } catch (shipError) {
            console.error("[v0] Erro ao carregar dados de navios:", shipError)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Erro ao carregar dados:", error)
        setIsLoading(false)
      }
    },
    [currentYear, currentMonthIndex, currentProduct],
  )

  useEffect(() => {
    loadData()
  }, [currentMonthIndex, currentYear, loadData])

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if tab becomes visible
      if (!document.hidden) {
        const now = Date.now()
        const timeSinceLastLoad = now - lastLoadTimestamp.current

        // Only refresh if more than 60 seconds have passed
        if (timeSinceLastLoad > 60000) {
          console.log("[v0] Tab focused after 60s, refreshing data...")
          clearTruckCache()
          loadData("month")
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [loadData])

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

  const currentMonth = `${months[currentMonthIndex]} de ${currentYear}`

  const handlePreviousMonth = () => {
    // Block navigation before December 2025
    if (currentYear === 2025 && currentMonthIndex === 11) {
      return
    }
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonthIndex(currentMonthIndex - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonthIndex(currentMonthIndex + 1)
    }
  }

  const reports = [
    {
      id: 1,
      name: "Relatório de Novembro",
      date: "Novembro 2025",
      url: "https://drive.google.com/file/d/1aRVYUq3uVHf8RlfpltIZXhclZ7FGDT98/view",
    },
  ]

  const weekDays = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."]

  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentYear, currentMonthIndex)
  }, [currentYear, currentMonthIndex])

  const getTruckData = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    return trucksByDate[dateStr]?.length ?? 0
  }

  const getFilteredTrucks = () => {
    if (!selectedDay) return []

    const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    const trucksForDay = trucksByDate[dateStr] || []

    const filtered = trucksForDay.filter((truck) => {
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "approved" && truck.status === "approved") ||
        (filterStatus === "apurado" &&
          (truck.status === "apurado" || (truck.status === "rejected" && truck.hasOtherOutOfSpec))) ||
        (filterStatus === "rejected" && truck.status === "rejected")

      const searchMatch =
        searchQuery === "" ||
        truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.supplier.toLowerCase().includes(searchQuery.toLowerCase())

      return statusMatch && searchMatch
    })

    return filtered
  }

  const getPaginatedTrucks = () => {
    const allTrucks = getFilteredTrucks()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allTrucks.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(getFilteredTrucks().length / itemsPerPage)

  const getTruckDetailsRaw = (date: Date | null) => {
    if (!date) return []
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    return trucksByDate[dateStr] || []
  }

  const getTruckDetails = (date: Date | null) => {
    if (!date) return []

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

    const trucks = trucksByDate[dateStr] || []
    return trucks.map((truck) => {
      const isOutOfSpecValues = {
        cor: truck.cor !== null && isOutOfSpec("cor", truck.cor),
        pol: truck.pol !== null && isOutOfSpec("pol", truck.pol),
        umi: truck.umi !== null && isOutOfSpec("umi", truck.umi),
        cin: truck.cin !== null && isOutOfSpec("cin", truck.cin),
        ri: truck.ri !== null && isOutOfSpec("ri", truck.ri),
      }
      const hasOtherOutOfSpec = Object.values(isOutOfSpecValues).some((val) => val)

      return {
        ...truck,
        hasOtherOutOfSpec: hasOtherOutOfSpec,
      }
    })
  }

  const handleDayClick = (date: Date, truckCount: number) => {
    // Check if date has no truck data
    if (truckCount === 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const clickedDate = new Date(date)
      clickedDate.setHours(0, 0, 0, 0)
      
      // Show toast if clicked date has no data
      toast.error("Essa data ainda não possui dados ou não houve registro de caminhões recepcionados.")
      return
    }

    setSelectedDay(date)
    setDetailsSidebarOpen(true)
    setSearchQuery("") // Reset search query
    setIsFullscreen(false) // Reset fullscreen state when opening sidebar
    setShowAverageCards(false) // Reset to table view
    setShowRotativeStock(false) // Reset rotative stock view
    setFilterStatus("all") // Reset filter status
    setCurrentPage(1) // Reset to first page
    setTableViewMode("main") // Reset table view mode
    setExpandedGroups(new Set()) // Reset expanded groups
    setExpandedSuppliers(new Set()) // Reset expanded suppliers
  }

  const getQualityStatus = (date: Date): "complete" | "incomplete" => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const trucks = trucksByDate[dateStr] || []

    if (trucks.length === 0) return "complete"

    // Check if any truck has incomplete data
    for (const truck of trucks) {
      const isIncomplete =
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

      if (isIncomplete) {
        return "incomplete"
      }
    }

    return "complete"
  }

  const getTotalWeightByStatus = (status: "all" | "approved" | "apurado" | "rejected") => {
    const trucks = getTruckDetails(selectedDay)
    let filtered: typeof trucks = []

    if (status === "all") {
      filtered = trucks
    } else if (status === "approved") {
      filtered = trucks.filter((t) => t.status === "approved")
    } else if (status === "apurado") {
      filtered = trucks.filter((t) => t.status === "apurado" || (t.status === "rejected" && t.hasOtherOutOfSpec))
    } else if (status === "rejected") {
      filtered = trucks.filter((t) => t.status === "rejected")
    }

    return filtered.reduce((sum, t) => sum + (t.grossWeight ?? 0), 0)
  }

  const handleExportCSV = () => {
    const filtered = getFilteredTrucks()

    if (filtered.length === 0) {
      alert("Nenhum dado para exportar")
      return
    }

    const headers = [
      "Placa",
      "Nota Fiscal",
      "Cliente",
      "Fornecedor",
      "Peso (T)",
      "Status",
      "COR",
      "POL",
      "UMI",
      "CIN",
      "RI",
    ]

    const rows = filtered.map((truck) => [
      truck.licensePlate,
      truck.nfNumber || "-", // Use nfNumber for Nota Fiscal
      truck.client,
      truck.supplier,
      truck.grossWeight?.toFixed(1) || "0",
      truck.status === "approved" ? "Aprovado" : truck.status === "apurado" ? "Apontado" : "Recusado",
      truck.cor?.toFixed(2) || "-",
      truck.pol?.toFixed(2) || "-",
      truck.umi?.toFixed(2) || "-",
      truck.cin?.toFixed(2) || "-",
      truck.ri?.toFixed(2) || "-",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    const statusLabel =
      filterStatus === "all"
        ? "TODOS"
        : filterStatus === "approved"
          ? "APROVADOS"
          : filterStatus === "apurado"
            ? "APONTADOS"
            : "RECUSADOS"

    const dateStr = selectedDay
      ? `${String(selectedDay.getDate()).padStart(2, "0")}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${selectedDay.getFullYear()}`
      : ""

    link.setAttribute("download", `relatorio_${statusLabel}_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const monthStats = useMemo(() => {
    const monthKey = String(currentMonthIndex + 1).padStart(2, "0")
    const yearKey = String(currentYear)
    const prefix = `${yearKey}-${monthKey}` // ex: "2025-11" or "2025-12"

    const monthTrucksArrays = Object.entries(trucksByDate)
      .filter(([dateKey]) => dateKey.startsWith(prefix))
      .map(([, trucks]) => trucks)

    const allMonthTrucks = monthTrucksArrays.flat()

    const totalTrucks = allMonthTrucks.length
    const totalTonnage = allMonthTrucks.reduce((sum, t) => sum + (t.grossWeight ?? 0), 0)

    if (totalTrucks === 0) {
      return {
        totalTrucks: 0,
        totalTonnage: 0,
        hasData: false,
        qualityMetrics: { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 },
      }
    }

    const qualitySum = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }
    const qualityCount = { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }

    allMonthTrucks.forEach((truck) => {
      if (truck.cor !== null) {
        qualitySum.cor += truck.cor
        qualityCount.cor++
      }
      if (truck.pol !== null) {
        qualitySum.pol += truck.pol
        qualityCount.pol++
      }
      if (truck.umi !== null) {
        qualitySum.umi += truck.umi
        qualityCount.umi++
      }
      if (truck.cin !== null) {
        qualitySum.cin += truck.cin
        qualityCount.cin++
      }
      if (truck.ri !== null) {
        qualitySum.ri += truck.ri
        qualityCount.ri++
      }
    })

    const qualityMetrics = {
      cor: qualityCount.cor > 0 ? qualitySum.cor / qualityCount.cor : 0,
      pol: qualityCount.pol > 0 ? qualitySum.pol / qualityCount.pol : 0,
      umi: qualityCount.umi > 0 ? qualitySum.umi / qualityCount.umi : 0,
      cin: qualityCount.cin > 0 ? qualitySum.cin / qualityCount.cin : 0,
      ri: qualityCount.ri > 0 ? qualitySum.ri / qualityCount.ri : 0,
    }

    return {
      totalTrucks,
      totalTonnage,
      hasData: true,
      qualityMetrics,
    }
  }, [currentMonthIndex, currentYear, trucksByDate])

  const embarqueStats = useMemo(() => {
    return calculateEmbarqueMonthStats({
      shipsByDate,
      year: currentYear,
      monthIndex: currentMonthIndex,
      onlyUntilToday: true,
    })
  }, [shipsByDate, currentYear, currentMonthIndex])

  const selectedDayDateStr = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    : null

  const hasDayStats = selectedDayDateStr ? (dayStatsByDate[selectedDayDateStr]?.hasData ?? false) : false
  const statsToday = selectedDayDateStr ? dayStatsByDate[selectedDayDateStr] : { cor: 0, pol: 0, umi: 0, cin: 0, ri: 0 }

  const getLast7DaysData = useMemo(() => {
    if (!selectedDay) return []

    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDay)
      date.setDate(date.getDate() - i)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      const stats = dayStatsByDate[dateStr]

      if (stats?.hasData) {
        data.push({
          date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
          cor: Number(stats.cor.toFixed(1)),
          pol: Number(stats.pol.toFixed(2)),
          umi: Number(stats.umi.toFixed(1)),
          cin: Number(stats.cin.toFixed(1)),
          ri: Number(stats.ri.toFixed(2)),
        })
      } else {
        data.push({
          date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
          cor: null,
          pol: null,
          umi: null,
          cin: null,
          ri: null,
        })
      }
    }

    return data
  }, [selectedDay, dayStatsByDate])

  const selectedDateFormatted = selectedDay
    ? `${selectedDay.getDate()} de ${months[selectedDay.getMonth()]} de ${selectedDay.getFullYear()}`
    : ""

  const toggleSidebar = () => {
    const newState = !sidebarOpen
    setSidebarOpen(newState)
    localStorage.setItem("sidebarOpen", String(newState))
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleModuleChange = (module: "recepcao" | "embarque", product: "acucar" | "soja" | "milho") => {
    setCurrentModule(module)
    setCurrentProduct(product)
    setSelectedDay(null)
    setDetailsSidebarOpen(false)
  }

  const productNames: Record<"acucar" | "soja" | "milho", string> = {
    acucar: "Açúcar",
    soja: "Soja",
    milho: "Milho",
  }

  const getDailyAverages = (date: Date | null) => {
    if (!date) return { cor: null, pol: null, umi: null, cin: null, ri: null, totalTrucks: 0 }

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

    const trucks =
      trucksByDate[dateStr]?.map((truck) => {
        const isOutOfSpecValues = {
          cor: truck.cor !== null && isOutOfSpec("cor", truck.cor),
          pol: truck.pol !== null && isOutOfSpec("pol", truck.pol),
          umi: truck.umi !== null && isOutOfSpec("umi", truck.umi),
          cin: truck.cin !== null && isOutOfSpec("cin", truck.cin),
          ri: truck.ri !== null && isOutOfSpec("ri", truck.ri),
        }
        const hasOtherOutOfSpec = Object.values(isOutOfSpecValues).some((val) => val)
        return { ...truck, hasOtherOutOfSpec }
      }) || []

    const filteredTrucks = trucks.filter((t) => {
      if (filterStatus === "all") return true
      if (filterStatus === "approved") return t.status === "approved"
      if (filterStatus === "rejected") return t.status === "rejected"
      if (filterStatus === "apurado") return t.status === "apurado" || (t.status === "rejected" && t.hasOtherOutOfSpec)
      return true
    })

    const validTrucks = filteredTrucks.filter(
      (t) => t.cor !== null || t.pol !== null || t.umi !== null || t.cin !== null || t.ri !== null,
    )

    const totals = {
      cor: 0,
      pol: 0,
      umi: 0,
      cin: 0,
      ri: 0,
    }

    const counts = {
      cor: 0,
      pol: 0,
      umi: 0,
      cin: 0,
      ri: 0,
    }

    validTrucks.forEach((truck) => {
      if (truck.cor !== null) {
        totals.cor += truck.cor
        counts.cor++
      }
      if (truck.pol !== null) {
        totals.pol += truck.pol
        counts.pol++
      }
      if (truck.umi !== null) {
        totals.umi += truck.umi
        counts.umi++
      }
      if (truck.cin !== null) {
        totals.cin += truck.cin
        counts.cin++
      }
      if (truck.ri !== null) {
        totals.ri += truck.ri
        counts.ri++
      }
    })

    return {
      cor: counts.cor > 0 ? totals.cor / counts.cor : null,
      pol: counts.pol > 0 ? totals.pol / counts.pol : null,
      umi: counts.umi > 0 ? totals.umi / counts.umi : null,
      cin: counts.cin > 0 ? totals.cin / counts.cin : null,
      ri: counts.ri > 0 ? totals.ri / counts.ri : null,
      totalTrucks: validTrucks.length,
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const fetchInitialData = async () => {
    setIsRefreshing(true)
    try {
      console.log("[v0] Limpando cache local...")
      clearTruckCache()
      clearShipCache()
      await loadData("month")
      console.log("[v0] Dados atualizados com sucesso!")
    } catch (error) {
      console.error("[v0] Erro ao atualizar dados:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const [username, setUsername] = useState<string>("")

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUsername(user.user_metadata?.full_name || user.email || "Usuario")
      }
    }
    fetchUser()
  }, [])

  if (isMobile) {
    return (
      <DashboardMobile
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        currentYear={currentYear}
        currentMonthIndex={currentMonthIndex}
        selectedDay={selectedDay}
        trucksByDate={trucksByDate}
        dayStatsByDate={dayStatsByDate}
        setCurrentYear={setCurrentYear}
        setCurrentMonthIndex={setCurrentMonthIndex}
        setSelectedDay={setSelectedDay}
        getTruckData={getTruckData}
        handleDayClick={handleDayClick}
        handlePreviousMonth={handlePreviousMonth}
        handleNextMonth={handleNextMonth}
        handleExportCSV={handleExportCSV}
        getFilteredTrucks={getFilteredTrucks}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        tableViewMode={tableViewMode}
        setTableViewMode={setTableViewMode}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        currentModule={currentModule}
        currentProduct={currentProduct}
        setCurrentModule={setCurrentModule}
        setCurrentProduct={setCurrentProduct}
        monthStats={monthStats}
        formatInteger={formatInteger}
        formatRi={formatRi}
        formatUmi={formatUmi}
        formatCin={formatCin}
        formatPol={formatPol}
        formatCor={formatCor}
        username={username}
        handleLogout={handleLogout}
        onTabChange={() => {}}
        shipsByDate={shipsByDate}
        embarqueStats={embarqueStats}
        onRefreshData={fetchInitialData}
      />
    )
  }

  return (
    <DashboardDesktop
      currentYear={currentYear}
      currentMonthIndex={currentMonthIndex}
      selectedDay={selectedDay}
      sidebarOpen={sidebarOpen}
      isDarkMode={isDarkMode}
      reportsMenuOpen={reportsMenuOpen}
      detailsSidebarOpen={detailsSidebarOpen}
      searchQuery={searchQuery}
      currentPage={currentPage}
      filterStatus={filterStatus}
      isFullscreen={isFullscreen}
      showLogoutMenu={showLogoutMenu}
      trucks={trucks}
      isLoading={isLoading}
      trucksByDate={trucksByDate}
      dayStatsByDate={dayStatsByDate}
      showDayAverageDialog={showDayAverageDialog}
      showAverageCards={showAverageCards}
      tableViewMode={tableViewMode}
      expandedGroups={expandedGroups}
      expandedSuppliers={expandedSuppliers}
      currentModule={currentModule}
      currentProduct={currentProduct}
      recepcaoMenuExpanded={recepcaoMenuExpanded}
      navigationExpanded={navigationExpanded}
      showRotativeStock={showRotativeStock}
      itemsPerPage={itemsPerPage}
      setCurrentYear={setCurrentYear}
      setCurrentMonthIndex={setCurrentMonthIndex}
      setSelectedDay={setSelectedDay}
      setSidebarOpen={setSidebarOpen}
      setIsDarkMode={setIsDarkMode}
      setReportsMenuOpen={setReportsMenuOpen}
      setDetailsSidebarOpen={setDetailsSidebarOpen}
      setSearchQuery={setSearchQuery}
      setCurrentPage={setCurrentPage}
      setFilterStatus={setFilterStatus}
      setIsFullscreen={setIsFullscreen}
      setShowLogoutMenu={setShowLogoutMenu}
      setShowDayAverageDialog={setShowDayAverageDialog}
      setShowAverageCards={setShowAverageCards}
      setTableViewMode={setTableViewMode}
      setExpandedGroups={setExpandedGroups}
      setExpandedSuppliers={setExpandedSuppliers}
      setCurrentModule={setCurrentModule}
      setCurrentProduct={setCurrentProduct}
      setRecepcaoMenuExpanded={setRecepcaoMenuExpanded}
      setNavigationExpanded={setNavigationExpanded}
      setShowRotativeStock={setShowRotativeStock}
      getTruckData={getTruckData}
      getFilteredTrucks={getFilteredTrucks}
      getPaginatedTrucks={getPaginatedTrucks}
      getDailyAverages={getDailyAverages}
      handleDayClick={handleDayClick}
      handlePreviousMonth={handlePreviousMonth}
      handleNextMonth={handleNextMonth}
      handleLogout={handleLogout}
      handleExportCSV={handleExportCSV}
      toggleSidebar={toggleSidebar}
      handleModuleChange={handleModuleChange}
      selectedDateFormatted={selectedDateFormatted}
      hasDayStats={hasDayStats}
      statsToday={statsToday}
      getLast7DaysData={getLast7DaysData}
      monthStats={monthStats}
      selectedDayDateStr={selectedDayDateStr}
      totalPages={totalPages}
      shipsByDate={shipsByDate}
      onRefreshData={fetchInitialData}
      isRefreshing={isRefreshing}
    />
  )
}
