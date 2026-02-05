"use client"

import { SWRConfig } from "swr"
import type { ReactNode } from "react"

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Provider global do SWR para configuração de cache
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Configurações globais do SWR
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        dedupingInterval: 2000,
        // Opções de cache
        provider: () => new Map(),
        // Configuração de erro padrão
        onError: (error, key) => {
          console.error(`SWR Error for key ${key}:`, error)
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
