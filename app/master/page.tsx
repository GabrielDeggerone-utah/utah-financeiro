import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import MasterClient from './MasterClient'

export default async function MasterPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role !== 'master') redirect('/lancar')

  const [
    { data: receitas },
    { data: backups },
    { data: instituicoes },
    { data: produtos },
  ] = await Promise.all([
    supabase
      .from('receitas')
      .select(`id, data, volume, receita, cliente_nome, cliente_conta, observacao, created_at,
               assessor_id, instituicao_id, produto_id, profiles(nome), instituicoes(nome), produtos(nome)`)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('backups')
      .select('id, nome_arquivo, tipo, total_registros, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('instituicoes').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('produtos').select('id, nome').eq('ativo', true).order('nome'),
  ])

  return (
    <MasterClient
      nome={profile?.nome ?? ''}
      receitas={receitas ?? []}
      backups={backups ?? []}
      instituicoes={instituicoes ?? []}
      produtos={produtos ?? []}
    />
  )
}
