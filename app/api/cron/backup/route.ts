import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { gerarExcel } from '@/lib/excel'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminSupabase()
  const { data: receitas } = await admin
    .from('receitas')
    .select(`data, volume, receita, cliente_nome, cliente_conta, observacao,
             profiles(nome), instituicoes(nome), produtos(nome)`)
    .order('data', { ascending: false })

  const rows = (receitas ?? []).map((r: any) => ({
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
  const nomeArquivo = `utah_backup_automatico_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  await admin.from('backups').insert({
    nome_arquivo:    nomeArquivo,
    gerado_por:      null,
    tipo:            'automatico',
    total_registros: rows.length,
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}
