import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function getUsuario() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: profile?.role as 'master' | 'assessor' | undefined }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUsuario()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, data, volume, receita, instituicao_id, produto_id, cliente_nome, cliente_conta, observacao } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminSupabase()

  // Assessor só pode editar os próprios; master pode qualquer um
  if (ctx.role !== 'master') {
    const { data: rec } = await admin.from('receitas').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await admin.from('receitas').update({
    data, volume, receita: receita || null,
    instituicao_id, produto_id,
    cliente_nome: cliente_nome || null,
    cliente_conta: cliente_conta || null,
    observacao: observacao || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUsuario()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminSupabase()

  // Assessor só pode excluir os próprios; master pode qualquer um
  if (ctx.role !== 'master') {
    const { data: rec } = await admin.from('receitas').select('assessor_id').eq('id', id).single()
    if (rec?.assessor_id !== ctx.user.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await admin.from('receitas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
