import { redirect } from 'next/navigation'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import MetasMasterClient from './MetasMasterClient'

export default async function MetasMasterPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()
  if (profile?.role !== 'master') redirect('/metas')

  const mesAtual = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  function getMeses() {
    const arr = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  }

  const admin = createAdminSupabase()
  const [{ data: assessores }, { data: todasMetas }, { data: receitas }, { data: captacoes }, { data: contas }] = await Promise.all([
    admin.from('profiles').select('id, nome').eq('ativo', true).order('nome'),
    admin.from('metas').select('*'),
    admin.from('receitas').select('assessor_id, data, volume').gte('data', `${getMeses()[0]}-01`),
    admin.from('captacoes').select('assessor_id, data, captacao_bruta, saidas').gte('data', `${getMeses()[0]}-01`),
    admin.from('contas_mes').select('*'),
  ])

  return (
    <MetasMasterClient
      nome={profile?.nome ?? ''}
      mesAtual={mesAtual}
      meses={getMeses()}
      assessores={assessores ?? []}
      todasMetas={todasMetas ?? []}
      receitas={receitas ?? []}
      captacoes={captacoes ?? []}
      contas={contas ?? []}
    />
  )
}
