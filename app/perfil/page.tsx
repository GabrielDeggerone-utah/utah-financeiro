import { redirect } from 'next/navigation'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import PerfilClient from './PerfilClient'

export default async function PerfilPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()

  let assessores: { id: string; nome: string; email: string }[] = []
  if (profile?.role === 'master') {
    const admin = createAdminSupabase()
    const { data: profiles } = await admin.from('profiles').select('id, nome').order('nome')
    const { data: { users } } = await admin.auth.admin.listUsers()
    assessores = (profiles ?? []).map(p => ({
      id: p.id,
      nome: p.nome,
      email: users.find(u => u.id === p.id)?.email ?? '',
    }))
  }

  return (
    <PerfilClient
      nome={profile?.nome ?? ''}
      role={(profile?.role as 'assessor' | 'master') ?? 'assessor'}
      email={user.email ?? ''}
      userId={user.id}
      assessores={assessores}
    />
  )
}
