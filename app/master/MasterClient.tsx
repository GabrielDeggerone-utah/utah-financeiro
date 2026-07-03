'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

function ProdutoBadge({ nome }: { nome: string }) {
  if (!nome) return <span className="text-gray-400">—</span>
  return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-utah-50 text-utah-700">{nome}</span>
}

type NomeObj = { nome: string } | { nome: string }[] | null
type Receita = {
  id: string; data: string; volume: number; roa: number | null; receita: number | null
  cliente_nome: string | null; cliente_conta: string | null; observacao: string | null
  assessor_id: string; instituicao_id: string | null; produto_id: string | null
  profiles: NomeObj; instituicoes: NomeObj; produtos: NomeObj
}
type Captacao = { id: string; data: string; captacao_bruta: number; tipo: string | null; observacao: string | null; assessor_id: string; profiles: NomeObj }
type Conta    = { id: string; mes: string; tipo: string; numero_conta: string | null; nome_cliente: string | null; valor_ativacao: number; pontos: number; observacao: string | null; assessor_id: string }
type Meta     = { assessor_id: string; mes: string; meta_receita: number; meta_captacao_net: number; meta_contas_abertas: number; meta_pontos: number }
type Assessor = { id: string; nome: string }
type Backup   = { id: string; nome_arquivo: string; tipo: string; total_registros: number | null; created_at: string }

type Props = {
  nome: string; mesAtual: string; mesPrev: string
  receitas: Receita[]; backups: Backup[]
  instituicoes: { id: string; nome: string }[]; produtos: { id: string; nome: string }[]
  captacoes: Captacao[]; contas: Conta[]; metas: Meta[]; assessores: Assessor[]
}

function fmt(v: number) { return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function fmtMes(m: string) { if (!m) return '—'; const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
function getNome(p: NomeObj): string { if (!p) return ''; if (Array.isArray(p)) return p[0]?.nome ?? ''; return (p as { nome: string }).nome ?? '' }
function fmtTs(ts: string) { return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function fmtMoedaInput(v: string) { const n = v.replace(/\D/g, ''); if (!n) return ''; return (parseInt(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function numToMoeda(v: number | null) { if (!v) return ''; return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function cor(p: number) { return p >= 1 ? '#16a34a' : p >= 0.7 ? '#f59e0b' : '#ef4444' }
function corText(p: number) { return p >= 1 ? 'text-green-700' : p >= 0.7 ? 'text-yellow-700' : 'text-red-600' }
function corBadge(p: number) { return p >= 1 ? 'bg-green-100 text-green-800' : p >= 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700' }
function tipoCapLabel(t: string | null) { return t === 'xp_xp' ? 'XP-XP' : 'Dinheiro Novo' }
function tipoCapBadge(t: string | null) { return t === 'xp_xp' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700' }
function tipoContaLabel(t: string) { return t === 'xp_xp' ? 'XP-XP' : 'Conta Nova' }
function tipoContaBadge(t: string) { return t === 'xp_xp' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700' }

function Ring({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = size * .38, c = 2 * Math.PI * r, d = Math.min(pct, 1) * c, fill = cor(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={size * .1} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={fill} strokeWidth={size * .1}
        strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * .16} fontWeight="bold" fill={fill}>
        {pct > 0 ? `${Math.round(Math.min(pct, 9.99) * 100)}%` : '—'}
      </text>
    </svg>
  )
}

export default function MasterClient({ nome, mesAtual, mesPrev, receitas: initR = [], backups = [], instituicoes = [], produtos = [], captacoes: initC = [], contas: initCt = [], metas = [], assessores = [] }: Props) {
  const [receitas, setReceitas]   = useState<Receita[]>(initR)
  const [captacoes, setCaptacoes] = useState<Captacao[]>(initC)
  const [contas]                  = useState<Conta[]>(initCt)
  const [mesFiltro, setMesFiltro] = useState(mesAtual)
  const [assessorFiltro, setAssessorFiltro] = useState('')
  const [produtoFiltro, setProdutoFiltro]   = useState('')
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState<'producao' | 'captacoes' | 'contas' | 'ranking' | 'backups'>('producao')

  const [editR, setEditR] = useState<Receita | null>(null)
  const [editRForm, setEditRForm] = useState({ data: '', volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })
  const [editC, setEditC] = useState<Captacao | null>(null)
  const [editCForm, setEditCForm] = useState({ data: '', tipo: 'dinheiro_novo', valor_net: '', saida: false, observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    const vol = parseMoeda(editRForm.volume), roa = parseFloat(editRForm.roa.replace(',', '.')) || 0
    if (vol > 0 && roa > 0) setEditRForm(f => ({ ...f, receita: ((vol * roa) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }))
  }, [editRForm.volume, editRForm.roa])

  const filtradas = receitas.filter(r => {
    const mesOk  = mesFiltro      ? r.data.startsWith(mesFiltro) : true
    const assOk  = assessorFiltro ? getNome(r.profiles) === assessorFiltro : true
    const prodOk = produtoFiltro  ? getNome(r.produtos) === produtoFiltro  : true
    return mesOk && assOk && prodOk
  })
  const filtCap   = captacoes.filter(c => mesFiltro ? c.data.startsWith(mesFiltro) : true)
  const filtContas = contas.filter(c => mesFiltro ? c.mes === mesFiltro : true)

  const totalVolume  = filtradas.reduce((s, r) => s + r.volume, 0)
  const totalReceita = filtradas.reduce((s, r) => s + (r.receita ?? 0), 0)
  const totalNet     = filtCap.reduce((s, c) => s + c.captacao_bruta, 0)
  const totalNetDN   = filtCap.filter(c => !c.tipo || c.tipo === 'dinheiro_novo').reduce((s, c) => s + c.captacao_bruta, 0)
  const totalNetXP   = filtCap.filter(c => c.tipo === 'xp_xp').reduce((s, c) => s + c.captacao_bruta, 0)
  const totalPontos  = filtContas.reduce((s, c) => s + c.pontos, 0)

  // Ranking
  const rankData = assessores.map(a => {
    const recAtual  = receitas.filter(r => r.assessor_id === a.id && r.data.startsWith(mesAtual)).reduce((s, r) => s + (r.receita ?? 0), 0)
    const recPrev   = receitas.filter(r => r.assessor_id === a.id && r.data.startsWith(mesPrev)).reduce((s, r) => s + (r.receita ?? 0), 0)
    const netAtual  = captacoes.filter(c => c.assessor_id === a.id && c.data.startsWith(mesAtual)).reduce((s, c) => s + c.captacao_bruta, 0)
    const meta      = metas.find(m => m.assessor_id === a.id)
    const pctMeta   = meta?.meta_receita ? recAtual / meta.meta_receita : 0
    const crescimento = recPrev > 0 ? ((recAtual - recPrev) / recPrev) * 100 : recAtual > 0 ? 100 : 0
    return { ...a, recAtual, recPrev, netAtual, pctMeta, crescimento, meta }
  }).filter(a => a.recAtual > 0 || a.netAtual !== 0 || (a.meta?.meta_receita ?? 0) > 0)

  const rankPorMeta  = [...rankData].sort((a, b) => b.pctMeta - a.pctMeta)
  const rankPorCap   = [...rankData].sort((a, b) => b.netAtual - a.netAtual)
  const rankPorCresc = [...rankData].sort((a, b) => b.crescimento - a.crescimento)

  // Meta equipe consolidada
  const metaEquipe = {
    receita:        metas.reduce((s, m) => s + m.meta_receita, 0),
    captacao_net:   metas.reduce((s, m) => s + m.meta_captacao_net, 0),
    contas_abertas: metas.reduce((s, m) => s + m.meta_contas_abertas, 0),
    pontos:         metas.reduce((s, m) => s + m.meta_pontos, 0),
  }
  const realEquipe = {
    receita:        receitas.filter(r => r.data.startsWith(mesAtual)).reduce((s, r) => s + (r.receita ?? 0), 0),
    captacao_net:   captacoes.filter(c => c.data.startsWith(mesAtual)).reduce((s, c) => s + c.captacao_bruta, 0),
    contas_abertas: contas.filter(c => c.mes === mesAtual).length,
    pontos:         contas.filter(c => c.mes === mesAtual).reduce((s, c) => s + c.pontos, 0),
  }

  const assessoresUnicos = [...new Set(receitas.map(r => getNome(r.profiles)).filter(Boolean))]
  const produtosUnicos   = [...new Set(receitas.map(r => getNome(r.produtos)).filter(Boolean))]

  function abrirEditR(r: Receita) {
    setEditR(r); setErroModal('')
    setEditRForm({ data: r.data, volume: numToMoeda(r.volume), roa: r.roa != null ? String(r.roa).replace('.', ',') : '', receita: numToMoeda(r.receita), instituicao_id: r.instituicao_id ?? '', produto_id: r.produto_id ?? '', cliente_nome: r.cliente_nome ?? '', cliente_conta: r.cliente_conta ?? '', observacao: r.observacao ?? '' })
  }
  async function salvarR() {
    if (!editR) return; setSalvando(true)
    const vol = parseMoeda(editRForm.volume)
    const res = await fetch('/api/receitas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editR.id, data: editRForm.data, volume: vol, roa: editRForm.roa ? parseFloat(editRForm.roa.replace(',', '.')) : null, receita: editRForm.receita ? parseMoeda(editRForm.receita) : null, instituicao_id: editRForm.instituicao_id, produto_id: editRForm.produto_id, cliente_nome: editRForm.cliente_nome, cliente_conta: editRForm.cliente_conta, observacao: editRForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    setReceitas(prev => prev.map(r => r.id !== editR.id ? r : { ...r, data: editRForm.data, volume: vol, roa: editRForm.roa ? parseFloat(editRForm.roa.replace(',', '.')) : null, receita: editRForm.receita ? parseMoeda(editRForm.receita) : null, instituicao_id: editRForm.instituicao_id, produto_id: editRForm.produto_id, cliente_nome: editRForm.cliente_nome || null, cliente_conta: editRForm.cliente_conta || null, observacao: editRForm.observacao || null, instituicoes: instituicoes.find(i => i.id === editRForm.instituicao_id) ? { nome: instituicoes.find(i => i.id === editRForm.instituicao_id)!.nome } : r.instituicoes, produtos: produtos.find(p => p.id === editRForm.produto_id) ? { nome: produtos.find(p => p.id === editRForm.produto_id)!.nome } : r.produtos }))
    setEditR(null)
  }
  async function excluirR(id: string) {
    if (!confirm('Excluir este lançamento?')) return; setExcluindo(id)
    await fetch('/api/receitas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    setReceitas(prev => prev.filter(r => r.id !== id))
  }

  function abrirEditC(c: Captacao) {
    setEditC(c); setErroModal('')
    const saida = c.captacao_bruta < 0
    setEditCForm({ data: c.data, tipo: c.tipo || 'dinheiro_novo', valor_net: numToMoeda(Math.abs(c.captacao_bruta)), saida, observacao: c.observacao ?? '' })
  }
  async function salvarC() {
    if (!editC) return; setSalvando(true)
    const valorNet = parseMoeda(editCForm.valor_net) * (editCForm.saida ? -1 : 1)
    const res = await fetch('/api/captacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editC.id, data: editCForm.data, captacao_bruta: valorNet, tipo: editCForm.tipo, observacao: editCForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    setCaptacoes(prev => prev.map(c => c.id !== editC.id ? c : { ...c, data: editCForm.data, captacao_bruta: valorNet, tipo: editCForm.tipo, observacao: editCForm.observacao || null }))
    setEditC(null)
  }
  async function excluirC(id: string) {
    if (!confirm('Excluir esta captação?')) return; setExcluindo(id)
    await fetch('/api/captacoes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    setCaptacoes(prev => prev.filter(c => c.id !== id))
  }

  async function exportar() {
    setExportando(true)
    try {
      const p = new URLSearchParams()
      if (mesFiltro) p.set('mes', mesFiltro)
      if (assessorFiltro) p.set('assessor', assessorFiltro)
      if (produtoFiltro) p.set('produto', produtoFiltro)
      const res = await fetch(`/api/export?${p}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = res.headers.get('x-filename') || 'producao.xlsx'; a.click()
      URL.revokeObjectURL(url); window.location.reload()
    } catch { alert('Erro ao exportar.') } finally { setExportando(false) }
  }

  function BtnsAcao({ onEdit, onDel, id }: { onEdit: () => void; onDel: () => void; id: string }) {
    return (
      <div className="flex gap-1 justify-end">
        <button onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-utah-600 hover:bg-utah-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
        <button onClick={onDel} disabled={excluindo === id} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    )
  }

  const abas = [
    { key: 'producao', label: 'Produção' },
    { key: 'captacoes', label: 'Captações' },
    { key: 'contas', label: 'Contas' },
    { key: 'ranking', label: '🏆 Ranking' },
    { key: 'backups', label: 'Backups' },
  ] as const

  return (
    <Layout nome={nome} role="master">
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Painel master</h1>
            <p className="text-sm text-gray-500">Produção consolidada de todos os assessores</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={exportar} disabled={exportando}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {exportando ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>

        {/* Meta da equipe consolidada */}
        {metaEquipe.receita > 0 && (
          <div className="card p-5 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Meta da equipe — <span className="font-normal capitalize">{fmtMes(mesAtual)}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Receita',    real: realEquipe.receita,        meta: metaEquipe.receita,        moeda: true },
                { label: 'Cap. NET',   real: realEquipe.captacao_net,   meta: metaEquipe.captacao_net,   moeda: true },
                { label: 'Contas',     real: realEquipe.contas_abertas, meta: metaEquipe.contas_abertas, moeda: false },
                { label: 'Pontos',     real: realEquipe.pontos,         meta: metaEquipe.pontos,         moeda: false, suffix: ' pts' },
              ].map(k => {
                const pct = k.meta > 0 ? k.real / k.meta : 0
                return (
                  <div key={k.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium">{k.label}</span>
                      <span className={corText(pct)}>{Math.round(pct * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 100, 100)}%`, background: cor(pct) }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={`font-semibold ${corText(pct)}`}>{k.moeda ? fmt(k.real) : `${k.real}${k.suffix ?? ''}`}</span>
                      <span className="text-gray-400">/{k.moeda ? fmt(k.meta) : `${k.meta}${k.suffix ?? ''}`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
          {abas.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${aba === a.key ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        {(aba === 'producao' || aba === 'captacoes' || aba === 'contas') && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {aba === 'producao' && (
              <>
                <select className="input w-auto text-sm" value={assessorFiltro} onChange={e => setAssessorFiltro(e.target.value)}>
                  <option value="">Todos assessores</option>
                  {assessoresUnicos.map(a => <option key={a}>{a}</option>)}
                </select>
                <select className="input w-auto text-sm" value={produtoFiltro} onChange={e => setProdutoFiltro(e.target.value)}>
                  <option value="">Todos produtos</option>
                  {produtosUnicos.map(p => <option key={p}>{p}</option>)}
                </select>
              </>
            )}
            <input className="input w-auto text-sm" type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
          </div>
        )}

        {/* ══ ABA PRODUÇÃO ══ */}
        {aba === 'producao' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Volume total (produção)</p><p className="text-xl font-semibold text-gray-700">{fmt(totalVolume)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Receita total</p><p className="text-xl font-semibold text-utah-600">{fmt(totalReceita)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Lançamentos</p><p className="text-xl font-semibold text-gray-900">{filtradas.length}</p></div>
            </div>
            <div className="card mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Receita por assessor</p></div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Assessor</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Lançamentos</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Produção</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Receita</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">% do total</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.values(filtradas.reduce<Record<string, { nome: string; vol: number; rec: number; qtd: number }>>((acc, r) => {
                    const id = r.assessor_id; const n = getNome(r.profiles) || 'Desconhecido'
                    if (!acc[id]) acc[id] = { nome: n, vol: 0, rec: 0, qtd: 0 }
                    acc[id].vol += r.volume; acc[id].rec += (r.receita ?? 0); acc[id].qtd++; return acc
                  }, {})).sort((a, b) => b.rec - a.rec).map(a => (
                    <tr key={a.nome} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{a.qtd}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(a.vol)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-utah-600">{fmt(a.rec)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{totalReceita > 0 ? ((a.rec / totalReceita) * 100).toFixed(1) + '%' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Todos os lançamentos</p></div>
              {filtradas.length === 0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhum lançamento encontrado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Produto</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Instituição</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Produção</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Receita</th>
                      <th />
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtradas.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtData(r.data)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{getNome(r.profiles) || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{r.cliente_nome || ''}{r.cliente_nome && r.cliente_conta ? ' · ' : ''}{r.cliente_conta ? <span className="text-gray-400">{r.cliente_conta}</span> : ''}{!r.cliente_nome && !r.cliente_conta ? <span className="text-gray-400">—</span> : ''}</td>
                          <td className="px-4 py-3"><ProdutoBadge nome={getNome(r.produtos)} /></td>
                          <td className="px-4 py-3 text-gray-600">{getNome(r.instituicoes) || '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{fmt(r.volume)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-utah-600">{r.receita ? fmt(r.receita) : '—'}</td>
                          <td className="px-4 py-3"><BtnsAcao id={r.id} onEdit={() => abrirEditR(r)} onDel={() => excluirR(r.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-utah-50 border-t border-utah-100">
                      <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
                      <td className="px-4 py-3 text-right text-sm text-utah-700">{fmt(totalVolume)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalReceita)}</td>
                      <td />
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ABA CAPTAÇÕES ══ */}
        {aba === 'captacoes' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`card p-4 border ${totalNet >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">NET Total</p>
                <p className={`text-xl font-semibold ${totalNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(totalNet)}</p>
              </div>
              <div className={`card p-4 border ${totalNetDN >= 0 ? 'border-green-100' : 'border-red-100'}`}>
                <p className="text-xs text-gray-500 mb-1">Dinheiro Novo</p>
                <p className={`text-lg font-semibold ${totalNetDN >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(totalNetDN)}</p>
              </div>
              <div className={`card p-4 border ${totalNetXP >= 0 ? 'border-blue-100' : 'border-red-100'}`}>
                <p className="text-xs text-gray-500 mb-1">XP-XP</p>
                <p className={`text-lg font-semibold ${totalNetXP >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmt(totalNetXP)}</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              {filtCap.length === 0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhuma captação encontrada.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tipo</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Valor NET</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                      <th />
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtCap.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtData(c.data)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{getNome(c.profiles) || '—'}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoCapBadge(c.tipo)}`}>{tipoCapLabel(c.tipo)}</span></td>
                          <td className={`px-4 py-3 text-right font-semibold ${c.captacao_bruta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {c.captacao_bruta < 0 && <span className="mr-0.5">↓</span>}
                            {c.captacao_bruta >= 0 && <span className="mr-0.5">↑</span>}
                            {fmt(Math.abs(c.captacao_bruta))}
                            {c.captacao_bruta < 0 && <span className="ml-1 text-xs font-normal text-red-400">(saída)</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{c.observacao || '—'}</td>
                          <td className="px-4 py-3"><BtnsAcao id={c.id} onEdit={() => abrirEditC(c)} onDel={() => excluirC(c.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ABA CONTAS ══ */}
        {aba === 'contas' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total contas no período</p><p className="text-xl font-semibold text-gray-900">{filtContas.length}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Pontos totais (equipe)</p><p className="text-xl font-semibold text-utah-600">{totalPontos} pts</p></div>
              <div className="card p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium mb-1">Tabela de pontos:</p>
                <p>100k–299k → 0,5 pt</p>
                <p>300k–999k → 1 pt | +1M → 2 pts</p>
              </div>
            </div>

            {/* Resumo por assessor */}
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Resumo por assessor — <span className="font-normal capitalize">{fmtMes(mesFiltro)}</span></p></div>
              {filtContas.length === 0 ? <p className="text-center text-gray-400 text-sm py-8">Nenhuma conta no período.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Assessor</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Contas</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Meta contas</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Pontos</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Meta pontos</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">% meta pts</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {assessores.map(a => {
                      const cts = filtContas.filter(c => c.assessor_id === a.id)
                      if (cts.length === 0) return null
                      const pts = cts.reduce((s, c) => s + c.pontos, 0)
                      const meta = metas.find(m => m.assessor_id === a.id)
                      const pctPts = meta?.meta_pontos ? pts / meta.meta_pontos : 0
                      const pctCt  = meta?.meta_contas_abertas ? cts.length / meta.meta_contas_abertas : 0
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${corText(pctCt)}`}>{cts.length}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{meta?.meta_contas_abertas ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${corText(pctPts)}`}>{pts} pts</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{meta?.meta_pontos ? `${meta.meta_pontos} pts` : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {meta?.meta_pontos ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pctPts >= 1 ? 'bg-green-100 text-green-800' : pctPts >= 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                                {Math.round(pctPts * 100)}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot><tr className="bg-utah-50 border-t border-utah-100">
                    <td className="px-4 py-2.5 text-xs font-semibold text-utah-700">Total equipe</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-utah-700">{filtContas.length}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-utah-400">{metas.reduce((s, m) => s + m.meta_contas_abertas, 0)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-utah-700">{totalPontos} pts</td>
                    <td className="px-4 py-2.5 text-right text-xs text-utah-400">{metas.reduce((s, m) => s + m.meta_pontos, 0)} pts</td>
                    <td />
                  </tr></tfoot>
                </table>
              )}
            </div>

            {/* Detalhe individual */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Detalhe por conta</p></div>
              {filtContas.length === 0 ? null : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente / Conta</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tipo</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ativação</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Pontos</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtContas.map(c => {
                        const assessorNome = assessores.find(a => a.id === c.assessor_id)?.nome ?? '—'
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{assessorNome}</td>
                            <td className="px-4 py-2.5">
                              <p className="text-gray-800">{c.nome_cliente || '—'}</p>
                              {c.numero_conta && <p className="text-xs text-gray-400">{c.numero_conta}</p>}
                            </td>
                            <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoContaBadge(c.tipo)}`}>{tipoContaLabel(c.tipo)}</span></td>
                            <td className="px-4 py-2.5 text-right text-gray-700">{c.valor_ativacao > 0 ? fmt(c.valor_ativacao) : '—'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-utah-600">{c.pontos > 0 ? c.pontos : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ABA RANKING ══ */}
        {aba === 'ranking' && (
          <div className="space-y-6">
            <p className="text-xs text-gray-400">Referência: <span className="font-medium capitalize">{fmtMes(mesAtual)}</span> vs <span className="capitalize">{fmtMes(mesPrev)}</span></p>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">🎯 Mais próximo da meta de receita</p>
              </div>
              {rankPorMeta.length === 0 ? <p className="text-center text-gray-400 text-sm py-8">Sem dados este mês</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorMeta.map((a, i) => (
                    <div key={a.id} className={`flex items-center gap-4 px-4 py-3 ${i === 0 ? 'bg-yellow-50' : ''}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                      <Ring pct={a.pctMeta} size={56} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                        <p className="text-xs text-gray-500">{fmt(a.recAtual)} <span className="text-gray-300">/ {fmt(a.meta?.meta_receita ?? 0)}</span></p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${corBadge(a.pctMeta)}`}>{Math.round(a.pctMeta * 100)}% da meta</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">💰 Maior captação NET no mês</p>
              </div>
              {rankPorCap.filter(a => a.netAtual > 0).length === 0 ? <p className="text-center text-gray-400 text-sm py-8">Sem captações registradas este mês</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorCap.filter(a => a.netAtual > 0).map((a, i) => {
                    const maxNet = rankPorCap.filter(x => x.netAtual > 0)[0]?.netAtual || 1
                    return (
                      <div key={a.id} className={`px-4 py-3 ${i === 0 ? 'bg-blue-50' : ''}`}>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                          <span className="font-semibold text-gray-900 text-sm flex-1">{a.nome}</span>
                          <span className={`text-sm font-bold ${a.netAtual >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(a.netAtual)}</span>
                        </div>
                        <div className="ml-9">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(a.netAtual / maxNet) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">📈 Maior crescimento de receita (mês a mês)</p>
              </div>
              {rankPorCresc.filter(a => a.recAtual > 0 || a.recPrev > 0).length === 0 ? <p className="text-center text-gray-400 text-sm py-8">Sem dados comparativos</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorCresc.filter(a => a.recAtual > 0 || a.recPrev > 0).map((a, i) => (
                    <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${i === 0 && a.crescimento > 0 ? 'bg-green-50' : ''}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                        <p className="text-xs text-gray-400">{fmt(a.recPrev)} → {fmt(a.recAtual)}</p>
                      </div>
                      <span className={`text-sm font-bold ${a.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {a.crescimento >= 0 ? '+' : ''}{a.crescimento.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA BACKUPS ══ */}
        {aba === 'backups' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">Histórico de backups</p>
              <p className="text-xs text-gray-400 mt-0.5">Backup automático diário às 18h (horário de Brasília)</p>
            </div>
            {backups.length === 0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhum backup gerado ainda.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Arquivo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Tipo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Registros</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Gerado em</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {backups.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{b.nome_arquivo}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${b.tipo === 'automatico' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{b.tipo}</span></td>
                      <td className="px-4 py-3 text-gray-600">{b.total_registros ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtTs(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal edição receita */}
      {editR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar lançamento</h2>
              <button onClick={() => setEditR(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Data</label><input className="input" type="date" value={editRForm.data} onChange={e => setEditRForm(f => ({ ...f, data: e.target.value }))} /></div>
                <div><label className="label">Volume (R$)</label><input className="input" type="text" inputMode="numeric" value={editRForm.volume} onChange={e => setEditRForm(f => ({ ...f, volume: fmtMoedaInput(e.target.value) }))} /></div>
                <div><label className="label">Instituição</label><select className="input" value={editRForm.instituicao_id} onChange={e => setEditRForm(f => ({ ...f, instituicao_id: e.target.value }))}><option value="">Selecione...</option>{instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
                <div><label className="label">Produto</label><select className="input" value={editRForm.produto_id} onChange={e => setEditRForm(f => ({ ...f, produto_id: e.target.value }))}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                <div><label className="label">Cliente — nome</label><input className="input" type="text" value={editRForm.cliente_nome} onChange={e => setEditRForm(f => ({ ...f, cliente_nome: e.target.value }))} /></div>
                <div><label className="label">Cliente — conta</label><input className="input" type="text" value={editRForm.cliente_conta} onChange={e => setEditRForm(f => ({ ...f, cliente_conta: e.target.value }))} /></div>
                <div><label className="label">ROA (%)</label><div className="relative"><input className="input pr-8" type="text" value={editRForm.roa} onChange={e => setEditRForm(f => ({ ...f, roa: e.target.value }))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
                <div><label className="label">Receita {editRForm.roa && <span className="text-xs text-utah-500 font-normal">via ROA</span>}</label><input className="input bg-gray-50" type="text" inputMode="numeric" value={editRForm.receita} onChange={e => setEditRForm(f => ({ ...f, receita: fmtMoedaInput(e.target.value) }))} /></div>
              </div>
              <div><label className="label">Observação</label><textarea className="input" rows={2} value={editRForm.observacao} onChange={e => setEditRForm(f => ({ ...f, observacao: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditR(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarR} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edição captação */}
      {editC && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar captação — {getNome(editC.profiles)}</h2>
              <button onClick={() => setEditC(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Data</label><input className="input" type="date" value={editCForm.data} onChange={e => setEditCForm(f => ({ ...f, data: e.target.value }))} /></div>
                <div><label className="label">Tipo</label>
                  <select className="input" value={editCForm.tipo} onChange={e => setEditCForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="dinheiro_novo">Dinheiro Novo</option>
                    <option value="xp_xp">XP-XP</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditCForm(f => ({ ...f, saida: false }))}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium ${!editCForm.saida ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-400'}`}>↑ Entrada</button>
                <button type="button" onClick={() => setEditCForm(f => ({ ...f, saida: true }))}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium ${editCForm.saida ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-400'}`}>↓ Saída</button>
              </div>
              <div><label className="label">Valor NET (R$)</label>
                <input className="input" type="text" inputMode="numeric" value={editCForm.valor_net} onChange={e => setEditCForm(f => ({ ...f, valor_net: fmtMoedaInput(e.target.value) }))} />
              </div>
              <div><label className="label">Observação</label><textarea className="input" rows={2} value={editCForm.observacao} onChange={e => setEditCForm(f => ({ ...f, observacao: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditC(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarC} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
