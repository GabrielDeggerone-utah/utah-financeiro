'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Meta = { mes: string; meta_receita: number; meta_captacao_net: number; meta_contas_abertas: number; meta_pontos: number }
type Receita = { data: string; volume: number; receita: number | null; produtos: { nome: string } | null; instituicoes: { nome: string } | null }
type Captacao = { data: string; captacao_bruta: number; tipo: string | null }
type Conta = { mes: string; pontos: number }

type Props = {
  nome: string
  role: 'assessor' | 'master'
  meses: string[]
  metas: Meta[]
  receitas: Receita[]
  captacoes: Captacao[]
  contas: Conta[]
}

const CORES = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#4f46e5','#0d9488']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtMes(m: string) { const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
function fmtMesCurto(m: string) { const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'short' }).replace('.', '') + `/${y.slice(2)}` }
function cor(pct: number) { return pct >= 1 ? '#16a34a' : pct >= 0.7 ? '#f59e0b' : '#ef4444' }
function corBg(pct: number) { return pct >= 1 ? 'bg-green-50 border-green-200' : pct >= 0.7 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200' }
function corText(pct: number) { return pct >= 1 ? 'text-green-700' : pct >= 0.7 ? 'text-yellow-700' : 'text-red-600' }

function Ring({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 38, c = 2 * Math.PI * r, d = pct * c, fill = cor(pct)
  return (
    <svg width="96" height="96" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="11" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={fill} strokeWidth="11"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="53" textAnchor="middle" fontSize="15" fontWeight="bold" fill={fill}>
        {max > 0 ? `${Math.round(Math.min(pct, 9.99) * 100)}%` : '—'}
      </text>
    </svg>
  )
}

function BarChart({ meses, values, goals }: { meses: string[]; values: number[]; goals: number[] }) {
  const maxVal = Math.max(...values, ...goals, 1)
  return (
    <div className="flex items-end gap-1.5 h-24 mt-2">
      {meses.map((m, i) => {
        const vPct = (values[i] / maxVal) * 100
        const gPct = (goals[i] / maxVal) * 100
        const pct = goals[i] > 0 ? values[i] / goals[i] : 0
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-20">
              <div className="flex-1 rounded-t" style={{ height: `${gPct}%`, background: '#e5e7eb', minHeight: goals[i] > 0 ? 3 : 0 }} />
              <div className="flex-1 rounded-t transition-all" style={{ height: `${vPct}%`, background: cor(pct), minHeight: values[i] > 0 ? 3 : 0 }} />
            </div>
            <span className="text-xs text-gray-400 leading-none">{fmtMesCurto(m)}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutMix({ grupos }: { grupos: { nome: string; valor: number }[] }) {
  const total = grupos.reduce((s, g) => s + g.valor, 0)
  if (total === 0) return <p className="text-gray-400 text-sm text-center py-6">Sem dados para o período</p>
  const R = 52, cx = 68, cy = 68, c = 2 * Math.PI * R
  let offset = 0
  const arcs = grupos.map((g, i) => {
    const pct = g.valor / total
    const dash = pct * c
    const arc = { ...g, pct, dash, offset, cor: CORES[i % CORES.length] }
    offset += dash
    return arc
  })
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width="136" height="136" viewBox="0 0 136 136" className="shrink-0">
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={a.cor} strokeWidth="24"
            strokeDasharray={`${a.dash} ${c}`} strokeDashoffset={-a.offset} transform="rotate(-90 68 68)" />
        ))}
        <circle cx={cx} cy={cy} r={R - 16} fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="bold">{fmt(total).replace('R$ ', 'R$ ')}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#9ca3af">volume total</text>
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.cor }} />
            <span className="text-gray-700 truncate flex-1">{a.nome}</span>
            <span className="text-gray-500 font-medium shrink-0">{Math.round(a.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ meses, values }: { meses: string[]; values: number[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values, 0)
  const range = Math.max(max - min, 1)
  const W = 340, H = 100, padX = 8, padY = 12
  function yPos(v: number) { return padY + (1 - (v - min) / range) * (H - padY * 2) }
  function xPos(i: number) { return padX + (i / (meses.length - 1)) * (W - padX * 2) }
  const points = values.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')
  const lastVal = values[values.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <polyline points={`${xPos(0)},${H - padY} ${points} ${xPos(meses.length - 1)},${H - padY}`}
          fill="#059669" fillOpacity="0.08" stroke="none" />
        <polyline points={points} fill="none" stroke="#059669" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => <circle key={i} cx={xPos(i)} cy={yPos(v)} r="3" fill={v >= 0 ? '#059669' : '#ef4444'} />)}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {meses.map(m => <span key={m} className="text-xs text-gray-400">{fmtMesCurto(m)}</span>)}
      </div>
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">AUC acumulado: </span>
        <span className={`text-sm font-bold ${lastVal >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(lastVal)}</span>
      </div>
    </div>
  )
}

function Tendencia({ meta, realAtual, mes }: { meta: number; realAtual: number; mes: string }) {
  if (meta <= 0) return null
  const [ano, mo] = mes.split('-').map(Number)
  const hoje = new Date()
  const eMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mo
  if (!eMesAtual) return null
  const diaAtual = hoje.getDate()
  const diasNoMes = new Date(ano, mo, 0).getDate()
  const projecao = diaAtual > 0 ? (realAtual / diaAtual) * diasNoMes : 0
  const pctProjetado = projecao / meta
  const faltaDias = diasNoMes - diaAtual
  const faltaValor = Math.max(meta - realAtual, 0)
  const ritmoNecessario = faltaDias > 0 ? faltaValor / faltaDias : 0
  const emoji = pctProjetado >= 1 ? '🟢' : pctProjetado >= 0.8 ? '🟡' : '🔴'
  return (
    <div className={`rounded-xl border p-4 ${pctProjetado >= 1 ? 'bg-green-50 border-green-200' : pctProjetado >= 0.8 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{emoji}</span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${pctProjetado >= 1 ? 'text-green-800' : pctProjetado >= 0.8 ? 'text-yellow-800' : 'text-red-800'}`}>
            No ritmo atual, você fecha o mês em <span className="text-base">{Math.round(pctProjetado * 100)}%</span> da meta de receita.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-gray-500">Projeção de fechamento</p><p className="font-semibold text-gray-800">{fmt(projecao)}</p></div>
            <div><p className="text-gray-500">Falta para a meta</p><p className="font-semibold text-gray-800">{fmt(faltaValor)}</p></div>
            <div><p className="text-gray-500">Ritmo necessário/dia</p><p className="font-semibold text-gray-800">{fmt(ritmoNecessario)}</p></div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Baseado em {diaAtual} de {diasNoMes} dias corridos — {faltaDias} dias restantes</p>
        </div>
      </div>
    </div>
  )
}

export default function MetasClient({ nome, role, meses, metas, receitas, captacoes, contas }: Props) {
  const [mesSel, setMesSel] = useState(meses[meses.length - 1])

  const metaExata = metas.find(m => m.mes === mesSel)
  const metaAnterior = !metaExata
    ? metas.filter(m => m.mes < mesSel).sort((a, b) => b.mes.localeCompare(a.mes))[0]
    : null
  const meta = metaExata ?? metaAnterior ?? { mes: mesSel, meta_receita: 0, meta_captacao_net: 0, meta_contas_abertas: 0, meta_pontos: 0 }

  function aggRec(m: string) {
    return receitas.filter(r => r.data.startsWith(m)).reduce((s, r) => ({ vol: s.vol + r.volume, rec: s.rec + (r.receita ?? 0) }), { vol: 0, rec: 0 })
  }
  function aggCap(m: string) {
    return captacoes.filter(c => c.data.startsWith(m)).reduce((s, c) => s + c.captacao_bruta, 0)
  }
  function aggPontos(m: string) {
    return contas.filter(c => c.mes === m).reduce((s, c) => s + c.pontos, 0)
  }

  const realProd = aggRec(mesSel)
  const captacaoNet = aggCap(mesSel)
  const totalContasMes = contas.filter(c => c.mes === mesSel).length
  const totalPontos = aggPontos(mesSel)

  const pReceita  = meta.meta_receita      > 0 ? realProd.rec    / meta.meta_receita      : 0
  const pCapNet   = meta.meta_captacao_net  > 0 ? captacaoNet     / meta.meta_captacao_net  : 0
  const pContas   = meta.meta_contas_abertas > 0 ? totalContasMes / meta.meta_contas_abertas : 0
  const pPontos   = meta.meta_pontos        > 0 ? totalPontos     / meta.meta_pontos        : 0

  const histRecReal  = meses.map(m => aggRec(m).rec)
  const histRecMeta  = meses.map(m => metas.find(x => x.mes === m)?.meta_receita ?? 0)
  const histCapNet   = meses.map(m => aggCap(m))
  const histProdVol  = meses.map(m => aggRec(m).vol)

  const aucAcumulado = histCapNet.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] ?? 0) + v)
    return acc
  }, [])

  const mixProduto = Object.values(
    receitas.filter(r => r.data.startsWith(mesSel)).reduce<Record<string, { nome: string; valor: number }>>((acc, r) => {
      const n = r.produtos?.nome ?? 'Outros'
      if (!acc[n]) acc[n] = { nome: n, valor: 0 }
      acc[n].valor += r.volume
      return acc
    }, {})
  ).sort((a, b) => b.valor - a.valor)

  const mixInstituicao = Object.values(
    receitas.filter(r => r.data.startsWith(mesSel)).reduce<Record<string, { nome: string; valor: number }>>((acc, r) => {
      const n = r.instituicoes?.nome ?? 'Outros'
      if (!acc[n]) acc[n] = { nome: n, valor: 0 }
      acc[n].valor += r.volume
      return acc
    }, {})
  ).sort((a, b) => b.valor - a.valor)

  const kpis = [
    { label: 'Receita', sub: 'Gerada', pct: pReceita, real: fmt(realProd.rec), meta: fmt(meta.meta_receita) },
    { label: 'Cap. NET', sub: 'Líquida', pct: pCapNet, real: fmt(captacaoNet), meta: fmt(meta.meta_captacao_net) },
    { label: 'Contas', sub: 'Abertas', pct: pContas, real: `${totalContasMes}`, meta: `${meta.meta_contas_abertas}` },
    { label: 'Pontos', sub: 'Contas', pct: pPontos, real: `${totalPontos} pts`, meta: `${meta.meta_pontos} pts` },
  ]

  const metaNaoDefinida = meta.meta_receita === 0 && meta.meta_captacao_net === 0 && meta.meta_contas_abertas === 0

  return (
    <Layout nome={nome} role={role}>
      <div className="px-6 py-8">
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
          <div className="mb-5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
            As metas para este mês ainda não foram definidas pelo seu gestor.
          </div>
        )}

        <div className="mb-6">
          <Tendencia meta={meta.meta_receita} realAtual={realProd.rec} mes={mesSel} />
        </div>

        {/* KPI Rings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {kpis.map(k => (
            <div key={k.label} className={`card p-4 flex flex-col items-center border ${corBg(k.pct)}`}>
              <Ring value={k.pct} max={1} />
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-600 mb-0.5">{k.label}</p>
                <p className="text-[10px] text-gray-400 mb-1">{k.sub}</p>
                <p className={`text-sm font-bold ${corText(k.pct)}`}>{k.real}</p>
                <p className="text-xs text-gray-400">meta: {k.meta}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Produção (volume) — linha separada, só para acompanhamento */}
        <div className="card p-4 mb-6 flex items-center gap-4 border border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Produção (volume)</p>
            <p className="text-lg font-semibold text-gray-700">{fmt(realProd.vol)}</p>
          </div>
          <p className="text-xs text-gray-400 flex-1">Acompanhamento apenas — meta é de receita.</p>
        </div>

        {/* Barras de progresso */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detalhamento — <span className="font-normal capitalize">{fmtMes(mesSel)}</span></h2>
          <div className="space-y-4">
            {kpis.map(k => (
              <div key={k.label}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{k.label}</span>
                  <span>{k.real} <span className="text-gray-400">/ {k.meta}</span></span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(k.pct * 100, 100)}%`, background: cor(k.pct) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mix por produto + instituição */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Mix por produto — <span className="font-normal capitalize">{fmtMes(mesSel)}</span></h3>
            <DonutMix grupos={mixProduto} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Mix por instituição — <span className="font-normal capitalize">{fmtMes(mesSel)}</span></h3>
            <DonutMix grupos={mixInstituicao} />
          </div>
        </div>

        {/* Evolução de carteira */}
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Evolução de carteira (AUC)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Captação NET acumulada nos últimos 6 meses</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Crescimento no período</p>
              <p className={`text-base font-bold ${histCapNet.reduce((s, v) => s + v, 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {fmt(histCapNet.reduce((s, v) => s + v, 0))}
              </p>
            </div>
          </div>
          <LineChart meses={meses} values={aucAcumulado} />
        </div>

        {/* Gráficos histórico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Receita — 6 meses</h3>
            <div className="flex gap-4 text-xs text-gray-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-200 inline-block" /> Meta</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded inline-block bg-violet-600" /> Real</span>
            </div>
            <BarChart meses={meses} values={histRecReal} goals={histRecMeta} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Produção (volume) — 6 meses</h3>
            <p className="text-xs text-gray-400 mb-2">Acompanhamento — sem meta</p>
            <BarChart meses={meses} values={histProdVol} goals={histProdVol.map(() => 0)} />
          </div>
        </div>

        {/* Tabela histórico */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Histórico 6 meses</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Mês</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Receita</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Meta Receita</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Produção</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Cap. NET</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Contas</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...meses].reverse().map((m, i) => {
                  const idx = meses.length - 1 - i
                  const pRec = histRecMeta[idx] > 0 ? histRecReal[idx] / histRecMeta[idx] : 0
                  const pts = aggPontos(m)
                  const nCt = contas.filter(c => c.mes === m).length
                  return (
                    <tr key={m} className={m === mesSel ? 'bg-utah-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2.5 text-gray-700 font-medium capitalize">{fmtMes(m)}</td>
                      <td className="px-4 py-2.5 text-right"><span className={`font-medium ${corText(pRec)}`}>{fmt(histRecReal[idx])}</span></td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{fmt(histRecMeta[idx])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmt(histProdVol[idx])}</td>
                      <td className={`px-4 py-2.5 text-right ${histCapNet[idx] < 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(histCapNet[idx])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{nCt}</td>
                      <td className="px-4 py-2.5 text-right text-utah-600 font-semibold">{pts > 0 ? `${pts} pts` : '—'}</td>
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
