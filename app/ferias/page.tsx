import { redirect } from 'next/navigation'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import FeriasClient from './FeriasClient'

export default async function FeriasPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const admin = createAdminSupabase()

  const { data: funcionarios } = await admin
    .from('funcionarios')
    .select('*')
    .order('nome')

  const { data: periodos } = await admin
    .from('periodos_ferias')
    .select('*')
    .order('ano')

  const { data: usos } = await admin
    .from('usos_ferias')
    .select('*')
    .order('data_inicio', { ascending: false })

  return (
    <FeriasClient
      nome={profile.nome}
      role={profile.role}
      funcionarios={funcionarios ?? []}
      periodos={periodos ?? []}
      usos={usos ?? []}
    />
  )
}
