import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import ConfigClient from './ConfigClient'

export default async function ConfigPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role !== 'master') redirect('/lancar')

  const [{ data: instituicoes }, { data: produtos }] = await Promise.all([
    supabase.from('instituicoes').select('id,nome,ativo').order('nome'),
    supabase.from('produtos').select('id,nome,ativo').order('nome'),
  ])

  return <ConfigClient nome={profile?.nome ?? ''} instituicoes={instituicoes ?? []} produtos={produtos ?? []} />
}
