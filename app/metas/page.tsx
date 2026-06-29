import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import MetasClient from './MetasClient'

function getMes6() {
  const meses = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

export default async function MetasPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome,role').eq('id', user.id).single()

  const meses = getMes6()
  const mesInicio = `${meses[0]}-01`

  const [{ data: metas }, { data: receitas }, { data: captacoes }, { data: contas }] = await Promise.all([
    supabase.from('metas').select('*').eq('assessor_id', user.id).in('mes', meses),
    supabase.from('receitas').select('data,volume,receita,produtos(nome),instituicoes(nome)').eq('assessor_id', user.id).gte('data', mesInicio).order('data'),
    supabase.from('captacoes').select('data,captacao_bruta,saidas').eq('assessor_id', user.id).gte('data', mesInicio).order('data'),
    supabase.from('contas_mes').select('mes,contas_abertas,contas_ativas').eq('assessor_id', user.id).in('mes', meses),
  ])

  return (
    <MetasClient
      nome={profile?.nome ?? ''}
      role={(profile?.role as 'assessor' | 'master') ?? 'assessor'}
      meses={meses}
      metas={metas ?? []}
      receitas={receitas ?? []}
      captacoes={captacoes ?? []}
      contas={contas ?? []}
    />
  )
}
