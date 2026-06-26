import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import LancarClient from './LancarClient'

export default async function LancarPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, instituicoesRes, produtosRes] = await Promise.all([
    supabase.from('profiles').select('nome,role').eq('id', user.id).single(),
    supabase.from('instituicoes').select('id,nome').eq('ativo', true).order('nome'),
    supabase.from('produtos').select('id,nome').eq('ativo', true).order('nome'),
  ])

  if (profileRes.data?.role === 'master') redirect('/master')

  return (
    <LancarClient
      nome={profileRes.data?.nome ?? ''}
      role="assessor"
      instituicoes={instituicoesRes.data ?? []}
      produtos={produtosRes.data ?? []}
    />
  )
}
