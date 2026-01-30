// Adapter que permite ler de Blob OU Supabase dinamicamente
import type { ShipsByDate, Ship } from './load-ships'
import type { Truck } from './load-trucks'

// Flag para controlar qual fonte usar
// Pode ser uma env var: process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE
const USE_SUPABASE = false // Mude para true quando estiver pronto

export type StorageSource = 'blob' | 'supabase'

/**
 * Determina qual fonte usar baseado na env var ou flag
 */
function getStorageSource(): StorageSource {
  return USE_SUPABASE ? 'supabase' : 'blob'
}

/**
 * Carrega navios de uma data específica
 * Usa Blob ou Supabase dependendo da configuração
 */
export async function loadShipsForMonth(year: number, month: number): Promise<ShipsByDate> {
  const source = getStorageSource()

  console.log(`[v0] Carregando navios da fonte: ${source}`)

  if (source === 'supabase') {
    const { loadShipsFromSupabase } = await import('./supabase/ships-storage')
    return await loadShipsFromSupabase(year, month)
  } else {
    // Blob (código existente)
    const { loadAllShipsFromBlob } = await import('./load-ships')
    return await loadAllShipsFromBlob()
  }
}

/**
 * Carrega caminhões de uma data específica
 * Usa Blob ou Supabase dependendo da configuração
 */
export async function loadTrucksForDateAdapter(dateISO: string): Promise<Truck[] | null> {
  const source = getStorageSource()

  console.log(`[v0] Carregando caminhões da fonte: ${source}`)

  if (source === 'supabase') {
    const { loadTrucksFromSupabase } = await import('./supabase/trucks-storage')
    const trucks = await loadTrucksFromSupabase(dateISO)
    return trucks.length > 0 ? trucks : null
  } else {
    // Blob (código existente)
    const { loadTrucksForDate } = await import('./load-trucks')
    return await loadTrucksForDate(dateISO)
  }
}

/**
 * Insere um navio
 */
export async function insertShipAdapter(ship: Omit<Ship, 'id' | 'date'> & { data_embarque: string }): Promise<Ship | null> {
  const source = getStorageSource()

  if (source === 'supabase') {
    const { insertShip } = await import('./supabase/ships-storage')
    return await insertShip(ship)
  } else {
    // Para Blob, você precisa fazer upload do CSV
    console.warn('[v0] Inserção via Blob não implementada - use Supabase')
    return null
  }
}

/**
 * Insere um caminhão
 */
export async function insertTruckAdapter(truck: Omit<Truck, 'dataAutorizacaoFormatada'>): Promise<Truck | null> {
  const source = getStorageSource()

  if (source === 'supabase') {
    const { insertTruck } = await import('./supabase/trucks-storage')
    return await insertTruck(truck)
  } else {
    // Para Blob, você precisa fazer upload do CSV
    console.warn('[v0] Inserção via Blob não implementada - use Supabase')
    return null
  }
}

/**
 * Atualiza um navio
 */
export async function updateShipAdapter(id: string, updates: Partial<Ship>): Promise<boolean> {
  const source = getStorageSource()

  if (source === 'supabase') {
    const { updateShip } = await import('./supabase/ships-storage')
    return await updateShip(id, updates)
  } else {
    console.warn('[v0] Atualização via Blob não implementada - use Supabase')
    return false
  }
}

/**
 * Atualiza um caminhão
 */
export async function updateTruckAdapter(id: number, updates: Partial<Truck>): Promise<boolean> {
  const source = getStorageSource()

  if (source === 'supabase') {
    const { updateTruck } = await import('./supabase/trucks-storage')
    return await updateTruck(id, updates)
  } else {
    console.warn('[v0] Atualização via Blob não implementada - use Supabase')
    return false
  }
}
