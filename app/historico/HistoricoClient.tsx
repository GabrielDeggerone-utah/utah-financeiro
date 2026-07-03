'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

type Receita = {
  id: string; data: string; volume: number; roa: number | null; receita: number | null
  cliente_nome: string | null; cliente_conta: string | null; observacao: string | null
  instituicao_id: string | null; produto_id: string | null
  instituicoes: { nome: string } | null; produtos: { nome: string } | null
}
type Captacao = { id: string; data: string; captacao_bruta: number; tipo: string | null; observacao: string | null }
type Conta = { id: string; mes: string; tipo: string; numero_conta: string | null; nome_cliente: string | null; valor_ativacao: number; pontos: number; observacao: string | null }

type Props = {
  nome: string; role: 'assessor' | 'master'
  receitas: Receita[]
  instituicoes: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
  captacoes: Captacao[]
  contas: Conta[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function fmtMes(m: string) { if (!m) return '—'; const [y, mo] = m.split('-'); return new Date(Number(y), Number(mo) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }
function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function formatarMoeda(v: string) { const n = v.replace(/\D/g, ''); if (!n) return ''; return (parseInt(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function numToMoeda(v: number | null) { if (!v) return ''; return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function tipoLabel(t: string | null) { return t === 'xp_xp' ? 'XP-XP' : 'Dinheiro Novo' }
function tipoBadge(t: string | null) { return t === 'xp_xp' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700' }
function tipoContaBadge(t: string) { return t === 'xp_xp' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700' }
function tipoContaLabel(t: string) { return t === 'xp_xp' ? 'XP-XP' : 'Conta Nova' }

export default function HistoricoClient({ nome, role, receitas: initR, instituicoes, produtos, captacoes: initC, contas: initCt }: Props) {
  const [abaMain, setAbaMain] = useState<'receitas' | 'captacoes' | 'contas'>('receitas')
  const [receitas, setReceitas] = useState(initR)
  const [captacoes, setCaptacoes] = useState(initC)
  const [contas, setContas] = useState(initCt)

  const [mesFiltro, setMesFiltro] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` })
  const [produtoFiltro, setProdutoFiltro] = useState('')

  const [editR, setEditR] = useState<Receita | null>(null)
  const [editRForm, setEditRForm] = useState({ data: '', volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })

  const [editC, setEditC] = useState<Captacao | null>(null)
  const [editCForm, setEditCForm] = useState({ data: '', tipo: 'dinheiro_novo', valor_net: '', saida: false, observacao: '' })

  const [editCt, setEditCt] = useState<Conta | null>(null)
  const [editCtForm, setEditCtForm] = useState({ mes: '', tipo: 'conta_nova', numero_conta: '', nome_cliente: '', valor_ativacao: '', observacao: '' })

  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    const volume = parseMoeda(editRForm.volume)
    const roa = parseFloat(editRForm.roa.replace(',', '.')) || 0
    if (volume > 0 && roa > 0) {
      setEditRForm(f => ({ ...f, receita: ((volume * roa) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }))
    }
  }, [editRForm.volume, editRForm.roa])

  const filtradas = receitas.filter(r => {
    const mesOk = mesFiltro ? r.data.startsWith(mesFiltro) : true
    const prodOk = produtoFiltro ? r.produtos?.nome === produtoFiltro : true
    return mesOk && prodOk
  })
  const filtCap = captacoes.filter(c => mesFiltro ? c.data.startsWith(mesFiltro) : true)
  const filtContas = contas.filter(c => mesFiltro ? c.mes === mesFiltro : true)

  const totalVolume = filtradas.reduce((s, r) => s + r.volume, 0)
  const totalReceita = filtradas.reduce((s, r) => s + (r.receita ?? 0), 0)
  const totalNet = filtCap.reduce((s, c) => s + c.captacao_bruta, 0)
  const totalNetDN = filtCap.filter(c => !c.tipo || c.tipo === 'dinheiro_novo').reduce((s, c) => s + c.captacao_bruta, 0)
  const totalNetXP = filtCap.filter(c => c.tipo === 'xp_xp').reduce((s, c) => s + c.captacao_bruta, 0)
  const totalPontos = filtContas.reduce((s, c) => s + c.pontos, 0)

  const produtosUnicos = [...new Set(receitas.map(r => r.produtos?.nome).filter(Boolean))]

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
    if (!editC) return
    setSalvando(true)
    const valorNet = parseMoeda(editCForm.valor_net) * (editCForm.saida ? -1 : 1)
    const res = await fetch('/api/captacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editC.id, data: editCForm.data, captacao_bruta: valorNet, tipo: editCForm.tipo, observacao: editCForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    setCaptacoes(prev => prev.map(c => c.id !== editC.id ? c : { ...c, data: editCForm.data, captacao_bruta: valorNet, tipo: editCForm.tipo, observacao: editCForm.observacao || null }))
    setEditC(null)
  }
  async function excluirC(id: string) {
    if (!confirm('Excluir esta captação?')) return
    setExcluindo(id)
    await fetch('/api/captacoes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    setCaptacoes(prev => prev.filter(c => c.id !== id))
  }

  function abrirEditCt(ct: Conta) {
    setEditCt(ct); setErroModal('')
    setEditCtForm({ mes: ct.mes, tipo: ct.tipo, numero_conta: ct.numero_conta ?? '', nome_cliente: ct.nome_cliente ?? '', valor_ativacao: numToMoeda(ct.valor_ativacao), observacao: ct.observacao ?? '' })
  }
  async function salvarCt() {
    if (!editCt) return
    setSalvando(true)
    const res = await fetch('/api/contas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editCt.id, mes: editCtForm.mes, tipo: editCtForm.tipo, numero_conta: editCtForm.numero_conta, nome_cliente: editCtForm.nome_cliente, valor_ativacao: parseMoeda(editCtForm.valor_ativacao), observacao: editCtForm.observacao }) })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar'); return }
    const va = parseMoeda(editCtForm.valor_ativacao)
    const pts = va >= 1000000 ? 2 : va >= 300000 ? 1 : va >= 100000 ? 0.5 : 0
    setContas(prev => prev.map(c => c.id !== editCt.id ? c : { ...c, mes: editCtForm.mes, tipo: editCtForm.tipo, numero_conta: editCtForm.numero_conta || null, nome_cliente: editCtForm.nome_cliente || null, valor_ativacao: va, pontos: pts, observacao: editCtForm.observacao || null }))
    setEditCt(null)
  }
  async function excluirCt(id: string) {
    if (!confirm('Excluir esta conta?')) return
    setExcluindo(id)
    await fetch('/api/contas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setExcluindo(null)
    setContas(prev => prev.filter(c => c.id !== id))
  }

  function Btns({ onEdit, onDel, id }: { onEdit: () => void; onDel: () => void; id: string }) {
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

        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {(['receitas', 'captacoes', 'contas'] as const).map(a => (
            <button key={a} onClick={() => setAbaMain(a)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${abaMain === a ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a === 'receitas' ? 'Receitas' : a === 'captacoes' ? 'Captações' : 'Contas'}
            </button>
          ))}
        </div>

        {/* RECEITAS */}
        {abaMain === 'receitas' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Produção (volume)</p><p className="text-xl font-semibold text-gray-900">{fmt(totalVolume)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Receita gerada</p><p className="text-xl font-semibold text-utah-600">{fmt(totalReceita)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Lançamentos</p><p className="text-xl font-semibold text-gray-900">{filtradas.length}</p></div>
            </div>
            <div className="card overflow-hidden">
              {filtradas.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhum lançamento encontrado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
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
                          <td className="px-4 py-3 text-gray-900">{r.cliente_nome || ''}{r.cliente_nome && r.cliente_conta ? ' · ' : ''}{r.cliente_conta ? <span className="text-gray-400">{r.cliente_conta}</span> : ''}{!r.cliente_nome && !r.cliente_conta ? <span className="text-gray-400">—</span> : ''}</td>
                          <td className="px-4 py-3">
                            {r.produtos?.nome ? <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-utah-50 text-utah-700">{r.produtos.nome}</span> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{r.instituicoes?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{fmt(r.volume)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-utah-600">{r.receita ? fmt(r.receita) : '—'}</td>
                          <td className="px-4 py-3"><Btns id={r.id} onEdit={() => abrirEditR(r)} onDel={() => excluirR(r.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-utah-50 border-t border-utah-100">
                      <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
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

        {/* CAPTAÇÕES */}
        {abaMain === 'captacoes' && (
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
              {filtCap.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhuma captação encontrada.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tipo</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Valor NET</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                    <th />
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtCap.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{fmtData(c.data)}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge(c.tipo)}`}>{tipoLabel(c.tipo)}</span></td>
                        <td className={`px-4 py-3 text-right font-semibold ${c.captacao_bruta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {c.captacao_bruta < 0 && <span className="mr-0.5 text-red-500">↓</span>}
                          {c.captacao_bruta >= 0 && <span className="mr-0.5 text-green-600">↑</span>}
                          {fmt(Math.abs(c.captacao_bruta))}
                          {c.captacao_bruta < 0 && <span className="ml-1 text-xs font-normal text-red-400">(saída)</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{c.observacao || '—'}</td>
                        <td className="px-4 py-3"><Btns id={c.id} onEdit={() => abrirEditC(c)} onDel={() => excluirC(c.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* CONTAS */}
        {abaMain === 'contas' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Total contas</p><p className="text-xl font-semibold text-gray-900">{filtContas.length}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Pontos totais</p><p className="text-xl font-semibold text-utah-600">{totalPontos} pts</p></div>
              <div className="card p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium mb-1">Pontuação:</p>
                <p>100k–299k → 0,5 pt</p>
                <p>300k–999k → 1 pt</p>
                <p>&gt;1M → 2 pts</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              {filtContas.length === 0 ? <p className="text-center text-gray-400 text-sm py-12">Nenhuma conta encontrada.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente / Conta</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tipo</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ativação</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Pontos</th>
                    <th />
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtContas.map(ct => (
                      <tr key={ct.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{ct.nome_cliente || '—'}</p>
                          {ct.numero_conta && <p className="text-xs text-gray-400">{ct.numero_conta}</p>}
                        </td>
                        <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoContaBadge(ct.tipo)}`}>{tipoContaLabel(ct.tipo)}</span></td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{ct.valor_ativacao > 0 ? fmt(ct.valor_ativacao) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-utah-600">{ct.pontos > 0 ? ct.pontos : '—'}</td>
                        <td className="px-4 py-2.5"><Btns id={ct.id} onEdit={() => abrirEditCt(ct)} onDel={() => excluirCt(ct.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal receita */}
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
                <div><label className="label">Receita gerada</label><input className="input bg-gray-50" type="text" inputMode="numeric" value={editRForm.receita} onChange={e => setEditRForm(f => ({ ...f, receita: formatarMoeda(e.target.value) }))} /></div>
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

      {/* Modal captação */}
      {editC && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar captação</h2>
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
                <input className="input" type="text" inputMode="numeric" value={editCForm.valor_net} onChange={e => setEditCForm(f => ({ ...f, valor_net: formatarMoeda(e.target.value) }))} />
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

      {/* Modal conta */}
      {editCt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar conta</h2>
              <button onClick={() => setEditCt(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Mês</label><input className="input" type="month" value={editCtForm.mes} onChange={e => setEditCtForm(f => ({ ...f, mes: e.target.value }))} /></div>
                <div><label className="label">Tipo</label>
                  <select className="input" value={editCtForm.tipo} onChange={e => setEditCtForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="conta_nova">Conta Nova</option>
                    <option value="xp_xp">XP-XP</option>
                  </select>
                </div>
                <div><label className="label">Nome do cliente</label><input className="input" type="text" value={editCtForm.nome_cliente} onChange={e => setEditCtForm(f => ({ ...f, nome_cliente: e.target.value }))} /></div>
                <div><label className="label">N° conta</label><input className="input" type="text" value={editCtForm.numero_conta} onChange={e => setEditCtForm(f => ({ ...f, numero_conta: e.target.value }))} /></div>
                <div className="col-span-2"><label className="label">Valor de ativação (R$)</label>
                  <input className="input" type="text" inputMode="numeric" value={editCtForm.valor_ativacao} onChange={e => setEditCtForm(f => ({ ...f, valor_ativacao: formatarMoeda(e.target.value) }))} /></div>
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
