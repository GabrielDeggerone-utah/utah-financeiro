'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Meta = { mes: string; meta_producao: number; meta_captacao_bruta: number; meta_captacao_net: number; meta_contas_abertas: number; meta_contas_ativas: number }
type Receita = { data: string; volume: number; receita: number | null }
type Captacao = { data: string; captacao_bruta: number; saidas: number }
type Conta = { mes: string; contas_abertas: number; contas_ativas: number }

type Props = {
  nome: string
  role: 'assessor' | 'master'
  meses: string[]
  metas: Meta[]
  receitas: Receita[]
  captacoes: Captacao[]
  contas: Conta[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtMes(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}
function cor(pct: number) { return pct >= 1 ? '#16a34a' : pct >= 0.7 ? '#f59e0b' : '#ef4444' }
function corBg(pct: number) { return pct >= 1 ? 'bg-green-50 border-green-200' : pct >= 0.7 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200' }
function corText(pct: number) { return pct >= 1 ? 'text-green-700' : pct >= 0.7 ? 'text-yellow-700' : 'text-red-600' }

function Ring({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 38, c = 2 * Math.PI * r
  const d = pct * c
  const fill = cor(pct)
  return (
    <svg width="96" height="96" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="11" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={fill} strokeWidth="11"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" />
      <text x="50" y="53" textAnchor="middle" fontSize="15" fontWeight="bold" fill={fill}>
        {max > 0 ? `${Math.round(Math.min(pct, 9.99) * 100)}%` : '—'}
      </text>
    </svg>
  )
}

function BarChart({ meses, values, goals, label }: { meses: string[]; values: number[]; goals: number[]; label: (v: number) => string }) {
  const maxVal = Math.max(...values, ...goals, 1)
  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {meses.map((m, i) => {
        const vPct = (values[i] / maxVal) * 100
        const gPct = (goals[i] / maxVal) * 100
        const pct = goals[i] > 0 ? values[i] / goals[i] : 0
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-20">
              <div className="flex-1 rounded-t" style={{ height: `${gPct}%`, background: '#e5e7eb', minHeight: goals[i] > 0 ? 4 : 0 }} title={`Meta: ${label(goals[i])}`} />
              <div className="flex-1 rounded-t" style={{ height: `${vPct}%`, background: cor(pct), minHeight: values[i] > 0 ? 4 : 0 }} title={`Real: ${label(values[i])}`} />
            </div>
            <span className="text-xs text-gray-400">{m.split('-')[1]}/{m.split('-')[0].slice(2)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function MetasClient({ nome, role, meses, metas, receitas, captacoes, contas }: Props) {
  const [mesSel, setMesSel] = useState(meses[meses.length - 1])

  const meta = metas.find(m => m.mes === mesSel) ?? { mes: mesSel, meta_producao: 0, meta_captacao_bruta: 0, meta_captacao_net: 0, meta_contas_abertas: 0, meta_contas_ativas: 0 }

  // Agregar por mês
  function agg(arr: Receita[], m: string) {
    return arr.filter(r => r.data.startsWith(m)).reduce((s, r) => ({ vol: s.vol + r.volume, rec: s.rec + (r.receita ?? 0) }), { vol: 0, rec: 0 })
  }
  function aggCap(arr: Captacao[], m: string) {
    return arr.filter(r => r.data.startsWith(m)).reduce((s, r) => ({ bruta: s.bruta + r.captacao_bruta, saidas: s.saidas + r.saidas }), { bruta: 0, saidas: 0 })
  }

  const realProd = agg(receitas, mesSel)
  const realCap = aggCap(captacoes, mesSel)
  const realContas = contas.find(c => c.mes === mesSel) ?? { contas_abertas: 0, contas_ativas: 0 }

  const captacaoNet = realCap.bruta - realCap.saidas

  // Percentuais
  const pProd = meta.meta_producao > 0 ? realProd.vol / meta.meta_producao : 0
  const pCapBruta = meta.meta_captacao_bruta > 0 ? realCap.bruta / meta.meta_captacao_bruta : 0
  const pCapNet = meta.meta_captacao_net > 0 ? captacaoNet / meta.meta_captacao_net : 0
  const pContasAbertas = meta.meta_contas_abertas > 0 ? realContas.contas_abertas / meta.meta_contas_abertas : 0
  const pContasAtivas = meta.meta_contas_ativas > 0 ? realContas.contas_ativas / meta.meta_contas_ativas : 0

  // Histórico para gráficos
  const histProdReal = meses.map(m => agg(receitas, m).vol)
  const histProdMeta = meses.map(m => (metas.find(x => x.mes === m)?.meta_producao ?? 0))
  const histCapReal  = meses.map(m => aggCap(captacoes, m).bruta)
  const histCapMeta  = meses.map(m => (metas.find(x => x.mes === m)?.meta_captacao_bruta ?? 0))
  const histNetReal  = meses.map(m => { const c = aggCap(captacoes, m); return c.bruta - c.saidas })
  const histNetMeta  = meses.map(m => (metas.find(x => x.mes === m)?.meta_captacao_net ?? 0))

  const kpis = [
    { label: 'Produção (Volume)', pct: pProd, real: fmt(realProd.vol), meta: fmt(meta.meta_producao) },
    { label: 'Captação Bruta',   pct: pCapBruta, real: fmt(realCap.bruta), meta: fmt(meta.meta_captacao_bruta) },
    { label: 'Captação NET',     pct: pCapNet,   real: fmt(captacaoNet),   meta: fmt(meta.meta_captacao_net) },
    { label: 'Contas Abertas',   pct: pContasAbertas, real: `${realContas.contas_abertas}`, meta: `${meta.meta_contas_abertas}` },
    { label: 'Contas Ativas 100k+', pct: pContasAtivas, real: `${realContas.contas_ativas}`, meta: `${meta.meta_contas_ativas}` },
  ]

  const metaNaoDefinida = meta.meta_producao === 0 && meta.meta_captacao_bruta === 0 && meta.meta_contas_abertas === 0

  return (
    <Layout nome={nome} role={role}>
      <div className="px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Minhas Metas</h1>
            <p className="text-sm text-gray-500">Acompanhe sua evolução mensal</p>
          </div>
          <select className="input w-auto text-sm" value={mesSel} onChange={e => setMesSel(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        </div>

        {metaNaoDefinida && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
            As metas para este mês ainda não foram definidas pelo seu gestor.
          </div>
        )}

        {/* KPI Rings */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {kpis.map(k => (
            <div key={k.label} className={`card p-4 flex flex-col items-center border ${corBg(k.pct)}`}>
              <Ring value={k.pct * (k.meta.startsWith('R') ? 1 : 1)} max={1} />
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">{k.label}</p>
                <p className={`text-sm font-bold ${corText(k.pct)}`}>{k.real}</p>
                <p className="text-xs text-gray-400">meta: {k.meta}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Barra de progresso detalhada */}
        <div className="card p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detalhamento — {fmtMes(mesSel)}</h2>
          <div className="space-y-4">
            {kpis.map(k => (
              <div key={k.label}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{k.label}</span>
                  <span>{k.real} <span className="text-gray-400">/ {k.meta}</span></span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(k.pct * 100, 100)}%`, background: cor(k.pct) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos de histórico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Produção — 6 meses</h3>
            <div className="flex gap-3 text-xs text-gray-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-200 inline-block" /> Meta</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded inline-block" style={{ background: '#6d28d9' }} /> Real</span>
            </div>
            <BarChart meses={meses} values={histProdReal} goals={histProdMeta} label={fmt} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Captação Bruta — 6 meses</h3>
            <div className="flex gap-3 text-xs text-gray-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-200 inline-block" /> Meta</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded inline-block" style={{ background: '#0891b2' }} /> Real</span>
            </div>
            <BarChart meses={meses} values={histCapReal} goals={histCapMeta} label={fmt} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Captação NET — 6 meses</h3>
            <div className="flex gap-3 text-xs text-gray-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-200 inline-block" /> Meta</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded inline-block" style={{ background: '#059669' }} /> Real</span>
            </div>
            <BarChart meses={meses} values={histNetReal} goals={histNetMeta} label={fmt} />
          </div>
        </div>

        {/* Tabela resumo 6 meses */}
        <div className="card overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Histórico 6 meses</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Mês</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Prod. Real</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Meta Prod.</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Cap. Bruta</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Cap. NET</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">C. Abertas</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">C. Ativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...meses].reverse().map((m, i) => {
                  const idx = meses.length - 1 - i
                  const c = contas.find(x => x.mes === m) ?? { contas_abertas: 0, contas_ativas: 0 }
                  const pPr = histProdMeta[idx] > 0 ? histProdReal[idx] / histProdMeta[idx] : 0
                  return (
                    <tr key={m} className={m === mesSel ? 'bg-utah-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2.5 text-gray-700 font-medium capitalize">{fmtMes(m)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-medium ${corText(pPr)}`}>{fmt(histProdReal[idx])}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{fmt(histProdMeta[idx])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(histCapReal[idx])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(histNetReal[idx])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{c.contas_abertas}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{c.contas_ativas}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
