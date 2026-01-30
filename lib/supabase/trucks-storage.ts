// Lê dados de caminhões do Supabase
import { createClient } from '@supabase/supabase-js'
import type { Truck } from '../load-trucks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Carrega todos os caminhões de uma data do Supabase
 */
export async function loadTrucksFromSupabase(dateISO: string): Promise<Truck[]> {
  try {
    console.log('[v0] Carregando caminhões do Supabase para:', dateISO)

    // Query do Supabase - adicione a lógica de filtro por data conforme necessário
    const { data, error } = await supabase
      .from('caminhoes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Erro ao carregar caminhões do Supabase:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('[v0] Nenhum caminhão encontrado')
      return []
    }

    // Mapeia dados do Supabase para o tipo Truck
    const trucks: Truck[] = data.map((row: any) => ({
      id: row.id,
      licensePlate: row.placa,
      nfNumber: row.nf_number || '',
      client: row.cliente || '',
      supplier: row.fornecedor || '',
      autorizacao: row.autorizacao as 'APROVADO' | 'RECUSADO' | null,
      dataAutorizacao: row.data_autorizacao,
      dataAutorizacaoFormatada: row.data_autorizacao 
        ? new Date(row.data_autorizacao).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null,
      nomeUsuarioAutorizacao: row.nome_usuario_autorizacao,
      grossWeight: row.peso_liquido || 0,
      cor: row.cor,
      pol: row.pol,
      umi: row.umi,
      cin: row.cin,
      ri: row.ri,
      corAnterior: row.cor_anterior,
      polAnterior: row.pol_anterior,
      umiAnterior: row.umi_anterior,
      cinAnterior: row.cin_anterior,
      riAnterior: row.ri_anterior,
      status: row.status as 'approved' | 'apurado' | 'rejected',
      isRepeated: false,
      hasOtherOutOfSpec: false,
      houveDoublecheck: row.autorizacao !== null || row.data_autorizacao !== null,
    }))

    console.log('[v0] Caminhões carregados:', trucks.length)
    return trucks
  } catch (error) {
    console.error('[v0] Erro ao carregar caminhões do Supabase:', error)
    return []
  }
}

/**
 * Insere um caminhão no Supabase
 */
export async function insertTruck(truck: Omit<Truck, 'dataAutorizacaoFormatada'>): Promise<Truck | null> {
  try {
    const { data, error } = await supabase
      .from('caminhoes')
      .insert({
        placa: truck.licensePlate,
        nf_number: truck.nfNumber,
        cliente: truck.client,
        fornecedor: truck.supplier,
        autorizacao: truck.autorizacao,
        data_autorizacao: truck.dataAutorizacao,
        nome_usuario_autorizacao: truck.nomeUsuarioAutorizacao,
        peso_liquido: truck.grossWeight,
        cor: truck.cor,
        pol: truck.pol,
        umi: truck.umi,
        cin: truck.cin,
        ri: truck.ri,
        cor_anterior: truck.corAnterior,
        pol_anterior: truck.polAnterior,
        umi_anterior: truck.umiAnterior,
        cin_anterior: truck.cinAnterior,
        ri_anterior: truck.riAnterior,
        status: truck.status,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Erro ao inserir caminhão:', error)
      return null
    }

    return {
      ...truck,
      id: data.id,
      dataAutorizacaoFormatada: truck.dataAutorizacao
        ? new Date(truck.dataAutorizacao).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null,
    }
  } catch (error) {
    console.error('[v0] Erro ao inserir caminhão:', error)
    return null
  }
}

/**
 * Atualiza um caminhão no Supabase
 */
export async function updateTruck(id: number, updates: Partial<Truck>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('caminhoes')
      .update({
        placa: updates.licensePlate,
        nf_number: updates.nfNumber,
        cliente: updates.client,
        fornecedor: updates.supplier,
        autorizacao: updates.autorizacao,
        data_autorizacao: updates.dataAutorizacao,
        nome_usuario_autorizacao: updates.nomeUsuarioAutorizacao,
        peso_liquido: updates.grossWeight,
        cor: updates.cor,
        pol: updates.pol,
        umi: updates.umi,
        cin: updates.cin,
        ri: updates.ri,
        cor_anterior: updates.corAnterior,
        pol_anterior: updates.polAnterior,
        umi_anterior: updates.umiAnterior,
        cin_anterior: updates.cinAnterior,
        ri_anterior: updates.riAnterior,
        status: updates.status,
      })
      .eq('id', id)

    if (error) {
      console.error('[v0] Erro ao atualizar caminhão:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Erro ao atualizar caminhão:', error)
    return false
  }
}
