// Lê dados de navios do Supabase
import { createClient } from '@supabase/supabase-js'
import type { Ship, ShipsByDate } from '../load-ships'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Carrega todos os navios de um mês específico do Supabase
 */
export async function loadShipsFromSupabase(year: number, month: number): Promise<ShipsByDate> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`

    console.log('[v0] Carregando navios do Supabase para:', startDate)

    // Query do Supabase
    const { data, error } = await supabase
      .from('navios')
      .select('*')
      .gte('data_embarque', startDate)
      .lte('data_embarque', endDate)
      .order('data_embarque', { ascending: true })

    if (error) {
      console.error('[v0] Erro ao carregar navios do Supabase:', error)
      return {}
    }

    if (!data || data.length === 0) {
      console.log('[v0] Nenhum navio encontrado para o período')
      return {}
    }

    // Agrupa navios por data
    const shipsByDate: ShipsByDate = {}

    data.forEach((row: any) => {
      const dateKey = row.data_embarque // Supabase retorna em formato YYYY-MM-DD

      if (!shipsByDate[dateKey]) {
        shipsByDate[dateKey] = []
      }

      const ship: Ship = {
        id: row.id,
        navio: row.navio,
        processo: row.processo || '',
        quantidade: row.quantidade,
        destino: row.destino || '',
        dataPrevista: row.data_prevista || row.data_embarque,
        cor: row.cor,
        pol: row.pol,
        umi: row.umi,
        cin: row.cin,
        ri: row.ri,
        date: dateKey,
      }

      shipsByDate[dateKey].push(ship)
    })

    console.log('[v0] Navios carregados:', Object.keys(shipsByDate).length, 'datas')
    return shipsByDate
  } catch (error) {
    console.error('[v0] Erro ao carregar navios do Supabase:', error)
    return {}
  }
}

/**
 * Insere um navio no Supabase
 */
export async function insertShip(ship: Omit<Ship, 'id' | 'date'> & { data_embarque: string }): Promise<Ship | null> {
  try {
    const { data, error } = await supabase
      .from('navios')
      .insert({
        navio: ship.navio,
        processo: ship.processo,
        quantidade: ship.quantidade,
        destino: ship.destino,
        data_embarque: ship.data_embarque,
        data_prevista: ship.dataPrevista,
        cor: ship.cor,
        pol: ship.pol,
        umi: ship.umi,
        cin: ship.cin,
        ri: ship.ri,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Erro ao inserir navio:', error)
      return null
    }

    return {
      id: data.id,
      navio: data.navio,
      processo: data.processo,
      quantidade: data.quantidade,
      destino: data.destino,
      dataPrevista: data.data_prevista,
      cor: data.cor,
      pol: data.pol,
      umi: data.umi,
      cin: data.cin,
      ri: data.ri,
      date: data.data_embarque,
    }
  } catch (error) {
    console.error('[v0] Erro ao inserir navio:', error)
    return null
  }
}

/**
 * Atualiza um navio no Supabase
 */
export async function updateShip(id: string, updates: Partial<Ship>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('navios')
      .update({
        navio: updates.navio,
        processo: updates.processo,
        quantidade: updates.quantidade,
        destino: updates.destino,
        data_prevista: updates.dataPrevista,
        cor: updates.cor,
        pol: updates.pol,
        umi: updates.umi,
        cin: updates.cin,
        ri: updates.ri,
      })
      .eq('id', id)

    if (error) {
      console.error('[v0] Erro ao atualizar navio:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Erro ao atualizar navio:', error)
    return false
  }
}
