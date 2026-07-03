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
  const meses = getMeses()

  const [{ data: assessores }, { data: todasMetas }, { data: receitas }, { data: captacoes }, { data: contas }] = await Promise.all([
    admin.from('profiles').select('id, nome').order('nome'),
    admin.from('metas').select('assessor_id,mes,meta_receita,meta_captacao_net,meta_contas_abertas,meta_pontos'),
    admin.from('receitas').select('assessor_id, data, receita').gte('data', `${meses[0]}-01`),
    admin.from('captacoes').select('assessor_id, data, captacao_bruta').gte('data', `${meses[0]}-01`),
    admin.from('contas').select('assessor_id, mes, pontos').in('mes', meses),
  ])

  return (
    <MetasMasterClient
      nome={profile?.nome ?? ''}
      mesAtual={mesAtual}
      meses={meses}
      assessores={assessores ?? []}
      todasMetas={todasMetas ?? []}
      receitas={receitas ?? []}
      captacoes={captacoes ?? []}
      contas={contas ?? []}
    />
  )
}
