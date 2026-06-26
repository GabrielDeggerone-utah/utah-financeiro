import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import AssessoresClient from './AssessoresClient'

export default async function AssessoresPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role !== 'master') redirect('/lancar')

  const { data: assessores } = await supabase
    .from('profiles')
    .select('id,nome,email,role,ativo,created_at')
    .order('nome')

  return <AssessoresClient nome={profile?.nome ?? ''} assessores={assessores ?? []} />
}
