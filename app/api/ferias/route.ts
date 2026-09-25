import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function verificarMaster() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'master') return null
  return user
}

// POST: create periodo or uso
export async function POST(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminSupabase()

  if (body.tipo === 'periodo') {
    const { funcionario_id, ano, dias_direito, observacao } = body
    if (!funcionario_id || !ano) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

    const { data, error } = await admin
      .from('periodos_ferias')
      .upsert({ funcionario_id, ano, dias_direito: dias_direito ?? 30, observacao: observacao || null }, { onConflict: 'funcionario_id,ano' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  if (body.tipo === 'uso') {
    const { funcionario_id, data_inicio, data_fim, dias_uteis, observacao } = body
    if (!funcionario_id || !data_inicio || !data_fim || dias_uteis === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('usos_ferias')
      .insert({ funcionario_id, data_inicio, data_fim, dias_uteis, observacao: observacao || null })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminSupabase()

  if (body.tipo === 'periodo') {
    const { id, dias_direito, observacao } = body
    const { error } = await admin.from('periodos_ferias').update({ dias_direito, observacao }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.tipo === 'uso') {
    const { id, data_inicio, data_fim, dias_uteis, observacao } = body
    const { error } = await admin.from('usos_ferias').update({ data_inicio, data_fim, dias_uteis, observacao }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id, tipo } = await req.json()
  const admin = createAdminSupabase()
  const table = tipo === 'periodo' ? 'periodos_ferias' : 'usos_ferias'
  await admin.from(table).delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
