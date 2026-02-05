import useSWR from "swr"
import type { ShipsByDate } from "@/lib/load-ships"

interface ShipsResponse {
  shipsByDate: ShipsByDate
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const fetcher = async (url: string): Promise<ShipsResponse> => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to fetch ships")
  }
  return response.json()
}

/**
 * Hook SWR para buscar navios com cache automático
 * @param year Ano
 * @param month Mês (1-12)
 * @param page Número da página (opcional)
 * @param limit Limite por página (opcional)
 */
export function useShips(
  year: number,
  month: number,
  page?: number,
  limit?: number
) {
  let url = `/api/ships?year=${year}&month=${month}`
  if (page) url += `&page=${page}`
  if (limit) url += `&limit=${limit}`

  const { data, error, isLoading, mutate } = useSWR<ShipsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache por 60 segundos
      refreshInterval: 300000, // Auto-refresh a cada 5 minutos
    }
  )

  return {
    ships: data?.shipsByDate,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
