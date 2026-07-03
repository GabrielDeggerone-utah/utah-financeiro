import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

async function getCtx() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: p?.role as 'master' | 'assessor' | undefined }
}

// PATCH /api/perfil — alterar própria senha OU master resetar senha de outro
export async function PATCH(req: NextRequest) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { senha, userId } = await req.json()
  if (!senha || senha.length < 6) return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })

  const admin = createAdminSupabase()

  // Master pode resetar senha de qualquer assessor
  if (userId && userId !== ctx.user.id) {
    if (ctx.role !== 'master') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // Qualquer usuário pode alterar a própria senha
  const { error } = await admin.auth.admin.updateUserById(ctx.user.id, { password: senha })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
