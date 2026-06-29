import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function verificarMaster() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'master') return null
  return user
}

// GET: buscar metas de todos os assessores para um mês
export async function GET(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes')

  const admin = createAdminSupabase()
  let query = admin.from('metas').select('*, profiles(nome)')
  if (mes) query = query.eq('mes', mes)

  const { data } = await query
  return NextResponse.json({ metas: data ?? [] })
}

// POST: upsert meta de um assessor (master only)
export async function POST(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const { assessor_id, mes, meta_producao, meta_captacao_bruta, meta_captacao_net, meta_contas_abertas, meta_contas_ativas } = body

  if (!assessor_id || !mes) return NextResponse.json({ error: 'assessor_id e mes obrigatórios' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data, error } = await admin.from('metas').upsert({
    assessor_id, mes,
    meta_producao:       meta_producao       ?? 0,
    meta_captacao_bruta: meta_captacao_bruta ?? 0,
    meta_captacao_net:   meta_captacao_net   ?? 0,
    meta_contas_abertas: meta_contas_abertas ?? 0,
    meta_contas_ativas:  meta_contas_ativas  ?? 0,
  }, { onConflict: 'assessor_id,mes' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ meta: data })
}
