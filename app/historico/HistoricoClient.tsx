'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'
import ProdutoBadge from '@/components/ProdutoBadge'

type Receita = {
  id: string
  data: string
  volume: number
  receita: number | null
  cliente_nome: string | null
  cliente_conta: string | null
  observacao: string | null
  instituicoes: { nome: string } | null
  produtos: { nome: string } | null
}

type Props = { nome: string; role: 'assessor' | 'master'; receitas: Receita[] }

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function HistoricoClient({ nome, role, receitas }: Props) {
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [produtoFiltro, setProdutoFiltro] = useState('')

  const filtradas = receitas.filter(r => {
    const mesOk = mesFiltro ? r.data.startsWith(mesFiltro) : true
    const prodOk = produtoFiltro ? r.produtos?.nome === produtoFiltro : true
    return mesOk && prodOk
  })

  const totalVolume = filtradas.reduce((s, r) => s + r.volume, 0)
  const totalReceita = filtradas.reduce((s, r) => s + (r.receita ?? 0), 0)

  const produtos = [...new Set(receitas.map(r => r.produtos?.nome).filter(Boolean))]

  return (
    <Layout nome={nome} role={role}>
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Meu histórico</h1>
            <p className="text-sm text-gray-500">Seus lançamentos registrados</p>
          </div>
          <div className="flex gap-2">
            <select className="input w-auto text-sm" value={produtoFiltro} onChange={e => setProdutoFiltro(e.target.value)}>
              <option value="">Todos produtos</option>
              {produtos.map(p => <option key={p}>{p}</option>)}
            </select>
            <input className="input w-auto text-sm" type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Volume total</p>
            <p className="text-xl font-semibold text-gray-900">{fmt(totalVolume)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Receita total</p>
            <p className="text-xl font-semibold text-gray-900">{fmt(totalReceita)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Lançamentos</p>
            <p className="text-xl font-semibold text-gray-900">{filtradas.length}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          {filtradas.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum lançamento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Produto</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Instituição</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Volume</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtradas.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{fmtData(r.data)}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {r.cliente_nome || ''}
                        {r.cliente_nome && r.cliente_conta ? ' · ' : ''}
                        {r.cliente_conta ? <span className="text-gray-400">{r.cliente_conta}</span> : ''}
                        {!r.cliente_nome && !r.cliente_conta ? <span className="text-gray-400">—</span> : ''}
                      </td>
                      <td className="px-4 py-3"><ProdutoBadge nome={r.produtos?.nome ?? ''} /></td>
                      <td className="px-4 py-3 text-gray-600">{r.instituicoes?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.volume)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.receita ? fmt(r.receita) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-utah-50 border-t border-utah-100">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalVolume)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalReceita)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
