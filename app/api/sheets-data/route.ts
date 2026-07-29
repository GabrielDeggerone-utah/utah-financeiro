import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

const SHEETS_SECRET = process.env.SHEETS_SECRET || 'utah-sheets-2024'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== SHEETS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabase()
  const historico = req.nextUrl.searchParams.get('historico') === 'true'

  // ── Modo histórico: retorna todos os meses ──────────────────
  if (historico) {
    const [
      { data: perfis },
      { data: receitas },
      { data: captacoes },
      { data: metas },
      { data: contas },
    ] = await Promise.all([
      admin.from('profiles').select('id, nome').eq('ativo', true).order('nome'),
      admin.from('receitas').select('assessor_id, receita, volume, data'),
      admin.from('captacoes').select('assessor_id, captacao_bruta, tipo, data'),
      admin.from('metas').select('assessor_id, mes, meta_receita, meta_captacao_net, meta_contas_abertas, meta_pontos'),
      admin.from('contas').select('assessor_id, mes, pontos'),
    ])

    return NextResponse.json({
      historico: true,
      perfis:    perfis    ?? [],
      receitas:  receitas  ?? [],
      captacoes: captacoes ?? [],
      metas:     metas     ?? [],
      contas:    contas    ?? [],
    })
  }

  // ── Modo normal: mês atual ou mês especificado ──────────────
  const mes = req.nextUrl.searchParams.get('mes') || (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  const ini = `${mes}-01`
  const lastDay = new Date(Number(mes.split('-')[0]), Number(mes.split('-')[1]), 0).getDate()
  const fim = `${mes}-${String(lastDay).padStart(2, '0')}`

  const [
    { data: perfis },
    { data: receitas },
    { data: captacoes },
    { data: metas },
    { data: contas },
  ] = await Promise.all([
    admin.from('profiles').select('id, nome').eq('ativo', true).order('nome'),
    admin.from('receitas').select('assessor_id, receita, volume').gte('data', ini).lte('data', fim),
    admin.from('captacoes').select('assessor_id, captacao_bruta, tipo').gte('data', ini).lte('data', fim),
    admin.from('metas').select('assessor_id, meta_receita, meta_captacao_net, meta_contas_abertas, meta_pontos').eq('mes', mes),
    admin.from('contas').select('assessor_id, pontos').eq('mes', mes),
  ])

  return NextResponse.json({
    mes,
    perfis:    perfis    ?? [],
    receitas:  receitas  ?? [],
    captacoes: captacoes ?? [],
    metas:     metas     ?? [],
    contas:    contas    ?? [],
  })
}
