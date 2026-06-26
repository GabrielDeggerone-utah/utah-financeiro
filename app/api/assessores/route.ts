import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function verificarMaster() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'master') return null
  return user
}

export async function POST(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { nome, email, senha, role } = await req.json()
  if (!nome || !email || !senha) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role: role || 'assessor' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const master = await verificarMaster()
  if (!master) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id, ativo } = await req.json()
  const admin = createAdminSupabase()
  await admin.from('profiles').update({ ativo }).eq('id', id)
  return NextResponse.json({ ok: true })
}
