import { redirect } from 'next/navigation'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import MasterClient from './MasterClient'

export default async function MasterPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role !== 'master') redirect('/lancar')

  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const mesPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  const inicioRange = `${mesPrev}-01`

  const admin = createAdminSupabase()

  const [
    { data: receitas },
    { data: backups },
    { data: instituicoes },
    { data: produtos },
    { data: captacoes },
    { data: contas },
    { data: metas },
    { data: assessores },
  ] = await Promise.all([
    admin
      .from('receitas')
      .select(`id, data, volume, roa, receita, cliente_nome, cliente_conta, observacao, created_at,
               assessor_id, instituicao_id, produto_id, profiles(nome), instituicoes(nome), produtos(nome)`)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    admin
      .from('backups')
      .select('id, nome_arquivo, tipo, total_registros, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('instituicoes').select('id, nome').eq('ativo', true).order('nome'),
    admin.from('produtos').select('id, nome').eq('ativo', true).order('nome'),
    admin
      .from('captacoes')
      .select('id, data, captacao_bruta, saidas, observacao, created_at, assessor_id, profiles!captacoes_assessor_id_fkey(nome)')
      .gte('data', inicioRange)
      .order('data', { ascending: false }),
    admin
      .from('contas_mes')
      .select('id, mes, contas_abertas, contas_ativas, observacao, assessor_id, profiles!contas_mes_assessor_id_fkey(nome)')
      .order('mes', { ascending: false }),
    admin
      .from('metas')
      .select('*')
      .eq('mes', mesAtual),
    admin.from('profiles').select('id, nome').order('nome'),
  ])

  return (
    <MasterClient
      nome={profile?.nome ?? ''}
      mesAtual={mesAtual}
      mesPrev={mesPrev}
      receitas={receitas ?? []}
      backups={backups ?? []}
      instituicoes={instituicoes ?? []}
      produtos={produtos ?? []}
      captacoes={captacoes ?? []}
      contas={contas ?? []}
      metas={metas ?? []}
      assessores={assessores ?? []}
    />
  )
}
