import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

async function getSupabaseMaster() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'master') return null
  return supabase
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseMaster()
  if (!supabase) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  const { nome } = await req.json()
  const { data, error } = await supabase.from('instituicoes').insert({ nome }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseMaster()
  if (!supabase) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  const { id, ativo } = await req.json()
  await supabase.from('instituicoes').update({ ativo }).eq('id', id)
  return NextResponse.json({ ok: true })
}
