import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { gerarExcel } from '@/lib/excel'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role,nome').eq('id', user.id).single()
  if (profile?.role !== 'master') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const mes      = searchParams.get('mes')
  const assessor = searchParams.get('assessor')
  const produto  = searchParams.get('produto')

  const admin = createAdminSupabase()
  let query = admin
    .from('receitas')
    .select(`data, volume, receita, cliente_nome, cliente_conta, observacao,
             profiles(nome), instituicoes(nome), produtos(nome)`)
    .order('data', { ascending: false })

  if (mes) query = query.gte('data', `${mes}-01`).lte('data', `${mes}-31`)

  const { data: receitas } = await query

  const rows = (receitas ?? [])
    .filter(r => {
      if (assessor && (r as any).profiles?.nome !== assessor) return false
      if (produto  && (r as any).produtos?.nome  !== produto)  return false
      return true
    })
    .map((r: any) => ({
      data:        r.data,
      assessor:    r.profiles?.nome ?? '',
      cliente:     [r.cliente_nome, r.cliente_conta].filter(Boolean).join(' · ') || '',
      produto:     r.produtos?.nome ?? '',
      instituicao: r.instituicoes?.nome ?? '',
      volume:      r.volume,
      receita:     r.receita,
      observacao:  r.observacao,
    }))

  const buffer = await gerarExcel(rows)
  const nomeArquivo = `utah_producao_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ptBR })}.xlsx`

  await admin.from('backups').insert({
    nome_arquivo:    nomeArquivo,
    gerado_por:      user.id,
    tipo:            'manual',
    total_registros: rows.length,
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'x-filename': nomeArquivo,
    },
  })
}
