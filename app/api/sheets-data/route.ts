import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

// Token simples para proteger o endpoint
// Configure este valor no Vercel: SHEETS_SECRET=uma_senha_qualquer
const SHEETS_SECRET = process.env.SHEETS_SECRET || 'utah-sheets-2024'

export async function GET(req: NextRequest) {
  // Autenticação por token
  const token = req.nextUrl.searchParams.get('token')
  if (token !== SHEETS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mes = req.nextUrl.searchParams.get('mes') || (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  const ini = `${mes}-01`
  const lastDay = new Date(Number(mes.split('-')[0]), Number(mes.split('-')[1]), 0).getDate()
  const fim = `${mes}-${String(lastDay).padStart(2, '0')}`

  const admin = createAdminSupabase()

  const [
    { data: perfis },
    { data: receitas },
    { data: captacoes },
    { data: metas },
    { data: contas },
  ] = await Promise.all([
    admin.from('profiles').select('id, nome').eq('role', 'assessor').eq('ativo', true).order('nome'),
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
