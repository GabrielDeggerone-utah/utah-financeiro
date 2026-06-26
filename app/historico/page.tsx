import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import HistoricoClient from './HistoricoClient'

export default async function HistoricoPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role === 'master') redirect('/master')

  const { data: receitas } = await supabase
    .from('receitas')
    .select(`id, data, volume, receita, cliente_nome, cliente_conta, observacao, created_at,
             instituicoes(nome), produtos(nome)`)
    .eq('assessor_id', user.id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  return <HistoricoClient nome={profile?.nome ?? ''} role="assessor" receitas={receitas ?? []} />
}
