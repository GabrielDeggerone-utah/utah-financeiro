'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProdutoBadge from '@/components/ProdutoBadge'

type Receita = {
  id: string; data: string; volume: number; roa: number | null; receita: number | null
  cliente_nome: string | null; cliente_conta: string | null; observacao: string | null
  instituicao_id: string | null; produto_id: string | null
  instituicoes: { nome: string } | null; produtos: { nome: string } | null
}
type Captacao = { id: string; data: string; captacao_bruta: number; saidas: number; observacao: string | null }
type Conta = { id: string; mes: string; contas_abertas: number; contas_ativas: number; observacao: string | null }

type Props = {
  nome: string; role: 'assessor' | 'master'
  receitas: Receita[]
  instituicoes: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
  captacoes: Captacao[]
  contas: Conta[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function fmtMes(m: string) { const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function formatarMoeda(v: string) { const n = v.replace(/\D/g, ''); if (!n) return ''; return (parseInt(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function numToMoeda(v: number | null) { if (!v) return ''; return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function HistoricoClient({ nome, role, receitas: initR, instituicoes, produtos, captacoes: initC, contas: initCt }: Props) {
  const [abaMain, setAbaMain] = useState<'receitas' | 'captacoes' | 'contas'>('receitas')
  const [receitas, setReceitas]   = useState(initR)
  const [captacoes, setCaptacoes] = useState(initC)
  const [contas, setContas]       = useState(initCt)

  const [mesFiltro, setMesFiltro] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` })
  const [produtoFiltro, setProdutoFiltro] = useState('')

  // Estado modal edição receita
  const [editR, setEditR] = useState<Receita | null>(null)
  const [editRForm, setEditRForm] = useState({ data: '', volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })

  // Estado modal edição captação
  const [editC, setEditC] = useState<Captacao | null>(null)
  const [editCForm, setEditCForm] = useState({ data: '', captacao_bruta: '', saidas: '', observacao: '' })

  // Estado modal edição contas
  const [editCt, setEditCt] = useState<Conta | null>(null)
  const [editCtForm, setEditCtForm] = useState({ contas_abertas: '', contas_ativas: '', observacao: '' })

  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erroModal, setErroModal] = useState('')

  // ROA auto-calc no modal de receita
  useEffect(() => {
    const volume = parseMoeda(editRForm.volume)
    const roa = parseFloat(editRForm.roa.replace(',', '.')) || 0
    if (volume > 0 && roa > 0) {
      setEditRForm(f => ({ ...f, receita: ((volume * roa) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }))
    }
  }, [editRForm.volume, editRForm.roa])

  // --- Receitas filtradas ---
  const filtradas = receitas.filter(r => {
    const mesOk = mesFiltro ? r.data.startsWith(mesFiltro) : true
    const prodOk = produtoFiltro ? r.produtos?.nome === produtoFiltro : true
    return mesOk && prodOk
  })
  const filtCap = captacoes.filter(c => mesFiltro ? c.data.startsWith(mesFiltro) : true)

  const totalVolume  = filtradas.reduce((s, r) => s + r.volume, 0)
  const totalReceita = filtradas.reduce((s, r) => s + (r.receita ?? 0), 0)
  const totalBruta   = filtCap.reduce((s, c) => s + c.captacao_bruta, 0)
  const totalSaidas  = filtCap.reduce((s, c) => s + c.saidas, 0)
  const totalNet     = totalBruta - totalSaidas

  const produtosUnicos = [...new Set(receitas.map(r => r.produtos?.nome).filter(Boolean))]

  // --- Handlers receita ---
  function abrirEditR(r: Receita) {
    setEditR(r); setErroModal('')
    setEditRForm({ data: r.data, volume: numToMoeda(r.volume), roa: r.roa != null ? String(r.roa).replace('.', ',') : '', receita: numToMoeda(r.receita), instituicao_id: r.instituicao_id ?? '', produto_id: r.produto_id ?? '', cliente_nome: r.cliente_nome ?? '', cliente_conta: r.cliente_conta ?? '', observacao: r.observacao ?? '' })
  }
  async function salvarR() {
    if (!editR) return
    const volume = parseMoeda(editRForm.volume)
    if (!volume) { setErroModal('Volume inválido'); return }
    setSalvando(true)
    const res = await fetch('/api/receitas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editR.id, data: editRForm.data, volume, roa: editRForm.roa ? parseFloat(editRForm.roa.replace(',', '.')) : null, receita: editRForm.receita ? parseMoeda(editRForm.receita) : null, instituicao_id: editRForm.instituicao_id, produto_id: editRForm.produto_id, cliente_nome: editRForm.cliente_nome, cliente_conta: editRForm.cliente_conta, observacao: editRForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    setReceitas(prev => prev.map(r => r.id !== editR.id ? r : { ...r, data: editRForm.data, volume, roa: editRForm.roa ? parseFloat(editRForm.roa.replace(',', '.')) : null, receita: editRForm.receita ? parseMoeda(editRForm.receita) : null, instituicao_id: editRForm.instituicao_id, produto_id: editRForm.produto_id, cliente_nome: editRForm.cliente_nome || null, cliente_conta: editRForm.cliente_conta || null, observacao: editRForm.observacao || null, instituicoes: instituicoes.find(i => i.id === editRForm.instituicao_id) ? { nome: instituicoes.find(i => i.id === editRForm.instituicao_id)!.nome } : r.instituicoes, produtos: produtos.find(p => p.id === editRForm.produto_id) ? { nome: produtos.find(p => p.id === editRForm.produto_id)!.nome } : r.produtos }))
    setEditR(null)
  }
  async function excluirR(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    setExcluindo(id)
    const res = await fetch('/api/receitas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    if (!res.ok) { alert('Erro ao excluir'); return }
    setReceitas(prev => prev.filter(r => r.id !== id))
  }

  // --- Handlers captação ---
  function abrirEditC(c: Captacao) {
    setEditC(c); setErroModal('')
    setEditCForm({ data: c.data, captacao_bruta: numToMoeda(c.captacao_bruta), saidas: numToMoeda(c.saidas), observacao: c.observacao ?? '' })
  }
  async function salvarC() {
    if (!editC) return
    setSalvando(true)
    const res = await fetch('/api/captacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editC.id, data: editCForm.data, captacao_bruta: parseMoeda(editCForm.captacao_bruta), saidas: parseMoeda(editCForm.saidas), observacao: editCForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    setCaptacoes(prev => prev.map(c => c.id !== editC.id ? c : { ...c, data: editCForm.data, captacao_bruta: parseMoeda(editCForm.captacao_bruta), saidas: parseMoeda(editCForm.saidas), observacao: editCForm.observacao || null }))
    setEditC(null)
  }
  async function excluirC(id: string) {
    if (!confirm('Excluir esta captação?')) return
    setExcluindo(id)
    const res = await fetch('/api/captacoes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    if (!res.ok) { alert('Erro ao excluir'); return }
    setCaptacoes(prev => prev.filter(c => c.id !== id))
  }

  // --- Handlers contas ---
  function abrirEditCt(ct: Conta) {
    setEditCt(ct); setErroModal('')
    setEditCtForm({ contas_abertas: String(ct.contas_abertas), contas_ativas: String(ct.contas_ativas), observacao: ct.observacao ?? '' })
  }
  async function salvarCt() {
    if (!editCt) return
    setSalvando(true)
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    const { error } = await supabase.from('contas_mes').update({ contas_abertas: parseInt(editCtForm.contas_abertas) || 0, contas_ativas: parseInt(editCtForm.contas_ativas) || 0, observacao: editCtForm.observacao || null }).eq('id', editCt.id)
    setSalvando(false)
    if (error) { setErroModal('Erro ao salvar'); return }
    setContas(prev => prev.map(c => c.id !== editCt.id ? c : { ...c, contas_abertas: parseInt(editCtForm.contas_abertas) || 0, contas_ativas: parseInt(editCtForm.contas_ativas) || 0, observacao: editCtForm.observacao || null }))
    setEditCt(null)
  }
  async function excluirCt(id: string) {
    if (!confirm('Excluir este registro de contas?')) return
    setExcluindo(id)
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    await supabase.from('contas_mes').delete().eq('id', id)
    setExcluindo(null)
    setContas(prev => prev.filter(c => c.id !== id))
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

  return (
    <Layout nome={nome} role={role}>
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Meu histórico</h1>
            <p className="text-sm text-gray-500">Seus lançamentos registrados</p>
          </div>
          <div className="flex gap-2">
            {abaMain === 'receitas' && (
              <select className="input w-auto text-sm" value={produtoFiltro} onChange={e => setProdutoFiltro(e.target.value)}>
                <option value="">Todos produtos</option>
                {produtosUnicos.map(p => <option key={p}>{p}</option>)}
              </select>
            )}
            <input className="input w-auto text-sm" type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {(['receitas', 'captacoes', 'contas'] as const).map(a => (
            <button key={a} onClick={() => setAbaMain(a)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${abaMain === a ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a === 'receitas' ? 'Receitas' : a === 'captacoes' ? 'Captações' : 'Contas'}
            </button>
          ))}
        </div>

        {/* === RECEITAS === */}
        {abaMain === 'receitas' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Volume total</p><p className="text-xl font-semibold text-gray-900">{fmt(totalVolume)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Receita total</p><p className="text-xl font-semibold text-gray-900">{fmt(totalReceita)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Lançamentos</p><p className="text-xl font-semibold text-gray-900">{filtradas.length}</p></div>
            </div>
            <div className="card overflow-hidden">
              {filtradas.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhum lançamento encontrado.</p> : (
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
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtradas.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtData(r.data)}</td>
                          <td className="px-4 py-3 text-gray-900">{r.cliente_nome || ''}{r.cliente_nome && r.cliente_conta ? ' · ' : ''}{r.cliente_conta ? <span className="text-gray-400">{r.cliente_conta}</span> : ''}{!r.cliente_nome && !r.cliente_conta ? <span className="text-gray-400">—</span> : ''}</td>
                          <td className="px-4 py-3"><ProdutoBadge nome={r.produtos?.nome ?? ''} /></td>
                          <td className="px-4 py-3 text-gray-600">{r.instituicoes?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.volume)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{r.receita ? fmt(r.receita) : '—'}</td>
                          <td className="px-4 py-3"><BtnsAcao id={r.id} onEdit={() => abrirEditR(r)} onDel={() => excluirR(r.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-utah-50 border-t border-utah-100">
                        <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalVolume)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalReceita)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* === CAPTAÇÕES === */}
        {abaMain === 'captacoes' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Captação Bruta</p><p className="text-xl font-semibold text-gray-900">{fmt(totalBruta)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Saídas</p><p className="text-xl font-semibold text-red-600">{fmt(totalSaidas)}</p></div>
              <div className={`card p-4 border ${totalNet >= 0 ? 'border-green-200' : 'border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Captação NET</p>
                <p className={`text-xl font-semibold ${totalNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(totalNet)}</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              {filtCap.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhuma captação encontrada.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Bruta</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Saídas</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">NET</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtCap.map(c => {
                        const net = c.captacao_bruta - c.saidas
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{fmtData(c.data)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.captacao_bruta)}</td>
                            <td className="px-4 py-3 text-right text-red-500">{c.saidas > 0 ? fmt(c.saidas) : '—'}</td>
                            <td className={`px-4 py-3 text-right font-medium ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(net)}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{c.observacao || '—'}</td>
                            <td className="px-4 py-3"><BtnsAcao id={c.id} onEdit={() => abrirEditC(c)} onDel={() => excluirC(c.id)} /></td>
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

        {/* === CONTAS === */}
        {abaMain === 'contas' && (
          <div className="card overflow-hidden">
            {contas.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhum registro de contas encontrado.</p> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Mês</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Contas abertas</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Contas ativas (100k+)</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contas.map(ct => (
                    <tr key={ct.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 capitalize">{fmtMes(ct.mes)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{ct.contas_abertas}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{ct.contas_ativas}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{ct.observacao || '—'}</td>
                      <td className="px-4 py-3"><BtnsAcao id={ct.id} onEdit={() => abrirEditCt(ct)} onDel={() => excluirCt(ct.id)} /></td>
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
              <h2 className="text-base font-semibold text-gray-900">Editar receita</h2>
              <button onClick={() => setEditR(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Data</label><input className="input" type="date" value={editRForm.data} onChange={e => setEditRForm(f => ({ ...f, data: e.target.value }))} /></div>
                <div><label className="label">Volume (R$)</label><input className="input" type="text" inputMode="numeric" value={editRForm.volume} onChange={e => setEditRForm(f => ({ ...f, volume: formatarMoeda(e.target.value) }))} /></div>
                <div><label className="label">Instituição</label><select className="input" value={editRForm.instituicao_id} onChange={e => setEditRForm(f => ({ ...f, instituicao_id: e.target.value }))}><option value="">Selecione...</option>{instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
                <div><label className="label">Produto</label><select className="input" value={editRForm.produto_id} onChange={e => setEditRForm(f => ({ ...f, produto_id: e.target.value }))}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                <div><label className="label">Cliente — nome</label><input className="input" type="text" value={editRForm.cliente_nome} onChange={e => setEditRForm(f => ({ ...f, cliente_nome: e.target.value }))} /></div>
                <div><label className="label">Cliente — conta</label><input className="input" type="text" value={editRForm.cliente_conta} onChange={e => setEditRForm(f => ({ ...f, cliente_conta: e.target.value }))} /></div>
                <div><label className="label">ROA (%)</label><div className="relative"><input className="input pr-8" type="text" value={editRForm.roa} onChange={e => setEditRForm(f => ({ ...f, roa: e.target.value }))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
                <div><label className="label">Receita {editRForm.roa && <span className="text-xs text-utah-500 font-normal">via ROA</span>}</label><input className="input bg-gray-50" type="text" inputMode="numeric" value={editRForm.receita} onChange={e => setEditRForm(f => ({ ...f, receita: formatarMoeda(e.target.value) }))} /></div>
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
              <h2 className="text-base font-semibold text-gray-900">Editar captação</h2>
              <button onClick={() => setEditC(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">{erroModal}</div>}
              <div><label className="label">Data</label><input className="input" type="date" value={editCForm.data} onChange={e => setEditCForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Captação Bruta (R$)</label><input className="input" type="text" inputMode="numeric" value={editCForm.captacao_bruta} onChange={e => setEditCForm(f => ({ ...f, captacao_bruta: formatarMoeda(e.target.value) }))} /></div>
                <div><label className="label">Saídas (R$)</label><input className="input" type="text" inputMode="numeric" value={editCForm.saidas} onChange={e => setEditCForm(f => ({ ...f, saidas: formatarMoeda(e.target.value) }))} /></div>
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

      {/* Modal edição contas */}
      {editCt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar contas — <span className="capitalize font-normal text-gray-500">{fmtMes(editCt.mes)}</span></h2>
              <button onClick={() => setEditCt(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Contas abertas</label><input className="input" type="number" min="0" value={editCtForm.contas_abertas} onChange={e => setEditCtForm(f => ({ ...f, contas_abertas: e.target.value }))} /></div>
                <div><label className="label">Contas ativas 100k+</label><input className="input" type="number" min="0" value={editCtForm.contas_ativas} onChange={e => setEditCtForm(f => ({ ...f, contas_ativas: e.target.value }))} /></div>
              </div>
              <div><label className="label">Observação</label><textarea className="input" rows={2} value={editCtForm.observacao} onChange={e => setEditCtForm(f => ({ ...f, observacao: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditCt(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarCt} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
