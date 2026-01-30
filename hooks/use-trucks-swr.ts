import useSWR from "swr"
import { loadTrucksForDate, type Truck, type DayStatsByDate } from "@/lib/load-trucks"

/**
 * Fetcher para carregar caminhões de uma data específica
 */
const trucksFetcher = async (dateStr: string): Promise<Truck[]> => {
  return await loadTrucksForDate(dateStr)
}

/**
 * Hook SWR para buscar caminhões de uma data específica com cache automático
 * @param date Data no formato YYYY-MM-DD
 * @param enabled Se true, faz o fetch automaticamente
 */
export function useTrucks(date: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<Truck[]>(
    enabled ? `trucks-${date}` : null,
    () => trucksFetcher(date),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache por 60 segundos
      refreshInterval: 300000, // Auto-refresh a cada 5 minutos
    }
  )

  return {
    trucks: data,
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * Hook para buscar disponibilidade de datas com caminhões
 */
const availableDatesFetcher = async (): Promise<string[]> => {
  const response = await fetch("/api/available-dates", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to fetch available dates")
  }
  const data = await response.json()
  return data.dates || []
}

export function useAvailableDates() {
  const { data, error, isLoading, mutate } = useSWR<string[]>(
    "available-dates",
    availableDatesFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 120000, // Cache por 2 minutos
      refreshInterval: 600000, // Auto-refresh a cada 10 minutos
    }
  )

  return {
    dates: data,
    isLoading,
    isError: error,
    mutate,
  }
}
