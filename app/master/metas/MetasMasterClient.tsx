'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Assessor = { id: string; nome: string }
type Meta = { assessor_id: string; mes: string; meta_producao: number; meta_captacao_bruta: number; meta_captacao_net: number; meta_contas_abertas: number; meta_contas_ativas: number }
type Receita = { assessor_id: string; data: string; volume: number }
type Captacao = { assessor_id: string; data: string; captacao_bruta: number; saidas: number }
type Conta = { assessor_id: string; mes: string; contas_abertas: number; contas_ativas: number }

type Props = {
  nome: string
  mesAtual: string
  meses: string[]
  assessores: Assessor[]
  todasMetas: Meta[]
  receitas: Receita[]
  captacoes: Captacao[]
  contas: Conta[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtMes(m: string) { const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function fmtInput(v: string) { const n = v.replace(/\D/g, ''); if (!n) return ''; return (parseInt(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function numToFmt(v: number) { if (!v) return ''; return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function cor(pct: number) { return pct >= 1 ? '#16a34a' : pct >= 0.7 ? '#f59e0b' : '#ef4444' }
function corCls(pct: number) { return pct >= 1 ? 'text-green-700 font-semibold' : pct >= 0.7 ? 'text-yellow-700' : 'text-red-600' }

function Ring({ pct }: { pct: number }) {
  const r = 28, c = 2 * Math.PI * r, d = Math.min(pct, 1) * c, fill = cor(pct)
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={fill} strokeWidth="8"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" fontSize="10" fontWeight="bold" fill={fill}>
        {pct > 0 ? `${Math.round(Math.min(pct, 9.99) * 100)}%` : '—'}
      </text>
    </svg>
  )
}

const VAZIO: Meta = { assessor_id: '', mes: '', meta_producao: 0, meta_captacao_bruta: 0, meta_captacao_net: 0, meta_contas_abertas: 0, meta_contas_ativas: 0 }

export default function MetasMasterClient({ nome, mesAtual, meses, assessores, todasMetas: initMetas, receitas, captacoes, contas }: Props) {
  const [mesSel, setMesSel] = useState(mesAtual)
  const [todasMetas, setTodasMetas] = useState(initMetas)
  const [editando, setEditando] = useState<Assessor | null>(null)
  const [form, setForm] = useState({ meta_producao: '', meta_captacao_bruta: '', meta_captacao_net: '', meta_contas_abertas: '', meta_contas_ativas: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function getMeta(assessorId: string, mes: string): Meta {
    return todasMetas.find(m => m.assessor_id === assessorId && m.mes === mes) ?? { ...VAZIO, assessor_id: assessorId, mes }
  }

  function getRealProd(assessorId: string, mes: string) {
    return receitas.filter(r => r.assessor_id === assessorId && r.data.startsWith(mes)).reduce((s, r) => s + r.volume, 0)
  }
  function getRealCap(assessorId: string, mes: string) {
    const list = captacoes.filter(r => r.assessor_id === assessorId && r.data.startsWith(mes))
    const bruta = list.reduce((s, r) => s + r.captacao_bruta, 0)
    const saidas = list.reduce((s, r) => s + r.saidas, 0)
    return { bruta, saidas, net: bruta - saidas }
  }
  function getRealContas(assessorId: string, mes: string) {
    return contas.find(c => c.assessor_id === assessorId && c.mes === mes) ?? { contas_abertas: 0, contas_ativas: 0 }
  }

  function abrirEdicao(a: Assessor) {
    const m = getMeta(a.id, mesSel)
    setEditando(a)
    setErro('')
    setForm({
      meta_producao:       numToFmt(m.meta_producao),
      meta_captacao_bruta: numToFmt(m.meta_captacao_bruta),
      meta_captacao_net:   numToFmt(m.meta_captacao_net),
      meta_contas_abertas: m.meta_contas_abertas > 0 ? String(m.meta_contas_abertas) : '',
      meta_contas_ativas:  m.meta_contas_ativas  > 0 ? String(m.meta_contas_ativas)  : '',
    })
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    setErro('')
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessor_id:         editando.id,
        mes:                 mesSel,
        meta_producao:       parseMoeda(form.meta_producao),
        meta_captacao_bruta: parseMoeda(form.meta_captacao_bruta),
        meta_captacao_net:   parseMoeda(form.meta_captacao_net),
        meta_contas_abertas: parseInt(form.meta_contas_abertas) || 0,
        meta_contas_ativas:  parseInt(form.meta_contas_ativas)  || 0,
      }),
    })
    setSalvando(false)
    if (!res.ok) { setErro('Erro ao salvar. Tente novamente.'); return }
    const { meta } = await res.json()
    setTodasMetas(prev => {
      const idx = prev.findIndex(m => m.assessor_id === editando.id && m.mes === mesSel)
      if (idx >= 0) { const next = [...prev]; next[idx] = meta; return next }
      return [...prev, meta]
    })
    setEditando(null)
  }

  return (
    <Layout nome={nome} role="master">
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Gestão de Metas</h1>
            <p className="text-sm text-gray-500">Defina e acompanhe as metas de cada assessor</p>
          </div>
          <select className="input w-auto text-sm" value={mesSel} onChange={e => setMesSel(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        </div>

        {/* Tabela de assessores */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Assessores — {fmtMes(mesSel)}</p>
            <p className="text-xs text-gray-400">Clique em Editar para definir metas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">Produção</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">Cap. Bruta</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">Cap. NET</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">C. Abertas</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">C. Ativas</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assessores.map(a => {
                  const meta = getMeta(a.id, mesSel)
                  const prod = getRealProd(a.id, mesSel)
                  const cap  = getRealCap(a.id, mesSel)
                  const ct   = getRealContas(a.id, mesSel)
                  const pProd = meta.meta_producao > 0 ? prod / meta.meta_producao : 0
                  const pCBr  = meta.meta_captacao_bruta > 0 ? cap.bruta / meta.meta_captacao_bruta : 0
                  const pCNet = meta.meta_captacao_net  > 0 ? cap.net  / meta.meta_captacao_net  : 0
                  const pCAb  = meta.meta_contas_abertas > 0 ? ct.contas_abertas / meta.meta_contas_abertas : 0
                  const pCAt  = meta.meta_contas_ativas  > 0 ? ct.contas_ativas  / meta.meta_contas_ativas  : 0
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center">
                          <Ring pct={pProd} />
                          <span className="text-xs text-gray-500 mt-0.5">{fmt(prod)}</span>
                          <span className="text-xs text-gray-300">/{fmt(meta.meta_producao)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center">
                          <Ring pct={pCBr} />
                          <span className="text-xs text-gray-500 mt-0.5">{fmt(cap.bruta)}</span>
                          <span className="text-xs text-gray-300">/{fmt(meta.meta_captacao_bruta)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center">
                          <Ring pct={pCNet} />
                          <span className={`text-xs mt-0.5 ${cap.net < 0 ? 'text-red-600' : 'text-gray-500'}`}>{fmt(cap.net)}</span>
                          <span className="text-xs text-gray-300">/{fmt(meta.meta_captacao_net)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${corCls(pCAb)}`}>{ct.contas_abertas}</span>
                          <span className="text-xs text-gray-300">/{meta.meta_contas_abertas}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${corCls(pCAt)}`}>{ct.contas_ativas}</span>
                          <span className="text-xs text-gray-300">/{meta.meta_contas_ativas}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => abrirEdicao(a)} className="btn-secondary text-xs py-1.5 px-3">
                          Editar metas
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal edição de metas */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Metas — {editando.nome}</h2>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{fmtMes(mesSel)}</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {erro && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erro}</div>}
              <div className="space-y-3">
                <div>
                  <label className="label">Meta de Produção (R$)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={form.meta_producao} onChange={e => setForm(f => ({ ...f, meta_producao: fmtInput(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Meta Captação Bruta (R$)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={form.meta_captacao_bruta} onChange={e => setForm(f => ({ ...f, meta_captacao_bruta: fmtInput(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Meta Captação NET (R$)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={form.meta_captacao_net} onChange={e => setForm(f => ({ ...f, meta_captacao_net: fmtInput(e.target.value) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Meta Contas Abertas</label>
                    <input className="input" type="number" min="0" placeholder="0" value={form.meta_contas_abertas} onChange={e => setForm(f => ({ ...f, meta_contas_abertas: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Meta Contas Ativas 100k+</label>
                    <input className="input" type="number" min="0" placeholder="0" value={form.meta_contas_ativas} onChange={e => setForm(f => ({ ...f, meta_contas_ativas: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar metas'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
