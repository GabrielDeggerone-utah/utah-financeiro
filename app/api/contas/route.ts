import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function getCtx() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: p?.role as 'master' | 'assessor' | undefined }
}

function calcPontos(valor: number): number {
  if (valor >= 1000000) return 2
  if (valor >= 300000) return 1
  if (valor >= 100000) return 0.5
  return 0
}

export async function POST(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { mes, tipo, numero_conta, nome_cliente, valor_ativacao, observacao } = await req.json()
  const pontos = calcPontos(Number(valor_ativacao) || 0)

  const supabase = createAdminSupabase()
  const { data, error } = await supabase.from('contas').insert({
    assessor_id: ctx.user.id, mes, tipo, numero_conta: numero_conta || null,
    nome_cliente: nome_cliente || null, valor_ativacao: Number(valor_ativacao) || 0,
    pontos, observacao: observacao || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ conta: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, mes, tipo, numero_conta, nome_cliente, valor_ativacao, observacao } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminSupabase()
  if (ctx.role !== 'master') {
    const { data: rec } = await admin.from('contas').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const pontos = calcPontos(Number(valor_ativacao) || 0)
  const { error } = await admin.from('contas').update({
    mes, tipo, numero_conta: numero_conta || null, nome_cliente: nome_cliente || null,
    valor_ativacao: Number(valor_ativacao) || 0, pontos, observacao: observacao || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  const admin = createAdminSupabase()

  if (ctx.role !== 'master') {
    const { data: rec } = await admin.from('contas').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await admin.from('contas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
