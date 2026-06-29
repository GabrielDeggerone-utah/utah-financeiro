import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function getCtx() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: p?.role as 'master' | 'assessor' | undefined }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, data, captacao_bruta, saidas, observacao } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminSupabase()
  if (ctx.role !== 'master') {
    const { data: rec } = await admin.from('captacoes').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await admin.from('captacoes').update({
    data, captacao_bruta, saidas: saidas ?? 0, observacao: observacao || null,
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
    const { data: rec } = await admin.from('captacoes').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await admin.from('captacoes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
