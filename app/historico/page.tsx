import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import HistoricoClient from './HistoricoClient'

export default async function HistoricoPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()

  const [{ data: receitas }, { data: instituicoes }, { data: produtos }, { data: captacoes }, { data: contas }] = await Promise.all([
    supabase
      .from('receitas')
      .select(`id, data, volume, roa, receita, cliente_nome, cliente_conta, observacao, created_at,
               instituicao_id, produto_id, instituicoes(nome), produtos(nome)`)
      .eq('assessor_id', user.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('instituicoes').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('produtos').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('captacoes').select('id, data, captacao_bruta, saidas, observacao, created_at')
      .eq('assessor_id', user.id).order('data', { ascending: false }),
    supabase.from('contas_mes').select('id, mes, contas_abertas, contas_ativas, observacao')
      .eq('assessor_id', user.id).order('mes', { ascending: false }),
  ])

  return (
    <HistoricoClient
      nome={profile?.nome ?? ''}
      role={(profile?.role as 'assessor' | 'master') ?? 'assessor'}
      receitas={receitas ?? []}
      instituicoes={instituicoes ?? []}
      produtos={produtos ?? []}
      captacoes={captacoes ?? []}
      contas={contas ?? []}
    />
  )
}
