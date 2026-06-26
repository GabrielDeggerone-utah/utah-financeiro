'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProdutoBadge from '@/components/ProdutoBadge'

type Receita = {
  id: string; data: string; volume: number; roa: number | null; receita: number | null
  cliente_nome: string | null; cliente_conta: string | null; observacao: string | null
  assessor_id: string; instituicao_id: string | null; produto_id: string | null
  profiles: { nome: string } | null
  instituicoes: { nome: string } | null; produtos: { nome: string } | null
}
type Backup = { id: string; nome_arquivo: string; tipo: string; total_registros: number | null; created_at: string }
type Props = {
  nome: string
  receitas: Receita[]
  backups: Backup[]
  instituicoes: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }
function fmtTs(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function parseMoeda(valor: string) { return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0 }
function formatarMoeda(valor: string) {
  const num = valor.replace(/\D/g, '')
  if (!num) return ''
  return (parseInt(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function numToMoeda(v: number | null) {
  if (!v) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MasterClient({ nome, receitas: initial, backups, instituicoes, produtos }: Props) {
  const [receitas, setReceitas] = useState(initial)
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [assessorFiltro, setAssessorFiltro] = useState('')
  const [produtoFiltro, setProdutoFiltro] = useState('')
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState<'producao' | 'backups'>('producao')

  // Modal edição
  const [editando, setEditando] = useState<Receita | null>(null)
  const [editForm, setEditForm] = useState({ data: '', volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [erroModal, setErroModal] = useState('')

  const filtradas = receitas.filter(r => {
    const mesOk = mesFiltro ? r.data.startsWith(mesFiltro) : true
    const assOk = assessorFiltro ? r.profiles?.nome === assessorFiltro : true
    const prodOk = produtoFiltro ? r.produtos?.nome === produtoFiltro : true
    return mesOk && assOk && prodOk
  })

  const totalVolume  = filtradas.reduce((s, r) => s + r.volume, 0)
  const totalReceita = filtradas.reduce((s, r) => s + (r.receita ?? 0), 0)

  const porAssessor: Record<string, { nome: string; volume: number; receita: number; qtd: number }> = {}
  filtradas.forEach(r => {
    const id = r.assessor_id
    if (!porAssessor[id]) porAssessor[id] = { nome: r.profiles?.nome ?? 'Desconhecido', volume: 0, receita: 0, qtd: 0 }
    porAssessor[id].volume  += r.volume
    porAssessor[id].receita += r.receita ?? 0
    porAssessor[id].qtd++
  })
  const rankAssessores = Object.values(porAssessor).sort((a, b) => b.volume - a.volume)

  const assessores = [...new Set(receitas.map(r => r.profiles?.nome).filter(Boolean))]
  const produtosUnicos = [...new Set(receitas.map(r => r.produtos?.nome).filter(Boolean))]

  // Recalcula receita quando ROA ou volume mudam no modal
  useEffect(() => {
    const volume = parseMoeda(editForm.volume)
    const roa = parseFloat(editForm.roa.replace(',', '.')) || 0
    if (volume > 0 && roa > 0) {
      const receita = (volume * roa) / 100
      setEditForm(f => ({ ...f, receita: receita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }))
    }
  }, [editForm.volume, editForm.roa])

  function abrirEdicao(r: Receita) {
    setEditando(r)
    setErroModal('')
    setEditForm({
      data: r.data,
      volume: numToMoeda(r.volume),
      roa: r.roa != null ? String(r.roa).replace('.', ',') : '',
      receita: numToMoeda(r.receita),
      instituicao_id: r.instituicao_id ?? '',
      produto_id: r.produto_id ?? '',
      cliente_nome: r.cliente_nome ?? '',
      cliente_conta: r.cliente_conta ?? '',
      observacao: r.observacao ?? '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setErroModal('')
    const volume = parseMoeda(editForm.volume)
    if (!volume || volume <= 0) { setErroModal('Volume deve ser maior que zero.'); return }
    if (!editForm.instituicao_id) { setErroModal('Selecione a instituição.'); return }
    if (!editForm.produto_id) { setErroModal('Selecione o produto.'); return }

    setSalvando(true)
    const res = await fetch('/api/receitas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editando.id,
        data: editForm.data,
        volume,
        roa: editForm.roa ? parseFloat(editForm.roa.replace(',', '.')) : null,
        receita: editForm.receita ? parseMoeda(editForm.receita) : null,
        instituicao_id: editForm.instituicao_id,
        produto_id: editForm.produto_id,
        cliente_nome: editForm.cliente_nome,
        cliente_conta: editForm.cliente_conta,
        observacao: editForm.observacao,
      }),
    })
    setSalvando(false)
    if (!res.ok) { setErroModal('Erro ao salvar. Tente novamente.'); return }

    setReceitas(prev => prev.map(r => r.id !== editando.id ? r : {
      ...r,
      data: editForm.data,
      volume,
      receita: editForm.receita ? parseMoeda(editForm.receita) : null,
      instituicao_id: editForm.instituicao_id,
      produto_id: editForm.produto_id,
      cliente_nome: editForm.cliente_nome || null,
      cliente_conta: editForm.cliente_conta || null,
      observacao: editForm.observacao || null,
      instituicoes: instituicoes.find(i => i.id === editForm.instituicao_id) ? { nome: instituicoes.find(i => i.id === editForm.instituicao_id)!.nome } : r.instituicoes,
      produtos: produtos.find(p => p.id === editForm.produto_id) ? { nome: produtos.find(p => p.id === editForm.produto_id)!.nome } : r.produtos,
    }))
    setEditando(null)
  }

  async function excluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    setExcluindo(id)
    const res = await fetch('/api/receitas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setExcluindo(null)
    if (!res.ok) { alert('Erro ao excluir. Tente novamente.'); return }
    setReceitas(prev => prev.filter(r => r.id !== id))
  }

  async function exportar() {
    setExportando(true)
    try {
      const params = new URLSearchParams()
      if (mesFiltro) params.set('mes', mesFiltro)
      if (assessorFiltro) params.set('assessor', assessorFiltro)
      if (produtoFiltro) params.set('produto', produtoFiltro)
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('x-filename') || 'producao.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      window.location.reload()
    } catch {
      alert('Erro ao exportar. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

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

        {/* Abas */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {(['producao', 'backups'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                aba === a ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {a === 'producao' ? 'Produção' : 'Backups'}
            </button>
          ))}
        </div>

        {aba === 'producao' && (
          <>
            {/* Filtros */}
            <div className="flex gap-2 mb-6">
              <select className="input w-auto text-sm" value={assessorFiltro} onChange={e => setAssessorFiltro(e.target.value)}>
                <option value="">Todos assessores</option>
                {assessores.map(a => <option key={a}>{a}</option>)}
              </select>
              <select className="input w-auto text-sm" value={produtoFiltro} onChange={e => setProdutoFiltro(e.target.value)}>
                <option value="">Todos produtos</option>
                {produtosUnicos.map(p => <option key={p}>{p}</option>)}
              </select>
              <input className="input w-auto text-sm" type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
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

            {/* Ranking assessores */}
            <div className="card mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">Produção por assessor</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Assessor</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Lançamentos</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Volume</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Receita</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">% do total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rankAssessores.map(a => (
                    <tr key={a.nome} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{a.qtd}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(a.volume)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(a.receita)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {totalVolume > 0 ? ((a.volume / totalVolume) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detalhamento */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">Todos os lançamentos</p>
              </div>
              {filtradas.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Nenhum lançamento encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Produto</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Instituição</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Volume</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Receita</th>
                        <th className="text-xs font-medium text-gray-500 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtradas.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtData(r.data)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.profiles?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {r.cliente_nome || ''}{r.cliente_nome && r.cliente_conta ? ' · ' : ''}
                            {r.cliente_conta ? <span className="text-gray-400">{r.cliente_conta}</span> : ''}
                            {!r.cliente_nome && !r.cliente_conta ? <span className="text-gray-400">—</span> : ''}
                          </td>
                          <td className="px-4 py-3"><ProdutoBadge nome={r.produtos?.nome ?? ''} /></td>
                          <td className="px-4 py-3 text-gray-600">{r.instituicoes?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.volume)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{r.receita ? fmt(r.receita) : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => abrirEdicao(r)} className="p-1 rounded text-gray-400 hover:text-utah-600 hover:bg-utah-50 transition-colors" title="Editar">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => excluir(r.id)} disabled={excluindo === r.id} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-utah-50 border-t border-utah-100">
                        <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
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

        {aba === 'backups' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">Histórico de backups</p>
              <p className="text-xs text-gray-400 mt-0.5">Backup automático diário às 18h (horário de Brasília)</p>
            </div>
            {backups.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Nenhum backup gerado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Arquivo</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Tipo</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Registros</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Gerado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {backups.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{b.nome_arquivo}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${b.tipo === 'automatico' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {b.tipo}
                        </span>
                      </td>
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

      {/* Modal edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar lançamento</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {erroModal && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Data *</label>
                  <input className="input" type="date" value={editForm.data} onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Volume (R$) *</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={editForm.volume} onChange={e => setEditForm(f => ({ ...f, volume: formatarMoeda(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Instituição *</label>
                  <select className="input" value={editForm.instituicao_id} onChange={e => setEditForm(f => ({ ...f, instituicao_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Produto *</label>
                  <select className="input" value={editForm.produto_id} onChange={e => setEditForm(f => ({ ...f, produto_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cliente — nome</label>
                  <input className="input" type="text" placeholder="Nome do cliente" value={editForm.cliente_nome} onChange={e => setEditForm(f => ({ ...f, cliente_nome: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Cliente — N° conta</label>
                  <input className="input" type="text" placeholder="Ex: 12345-6" value={editForm.cliente_conta} onChange={e => setEditForm(f => ({ ...f, cliente_conta: e.target.value }))} />
                </div>
                <div>
                  <label className="label">ROA (%)</label>
                  <div className="relative">
                    <input className="input pr-8" type="text" inputMode="decimal" placeholder="Ex: 0,50" value={editForm.roa} onChange={e => setEditForm(f => ({ ...f, roa: e.target.value }))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="label">
                    Receita gerada (R$)
                    {editForm.roa && <span className="ml-2 text-xs text-utah-500 font-normal">calculado pelo ROA</span>}
                  </label>
                  <input className="input bg-gray-50" type="text" inputMode="numeric" placeholder="0,00 — opcional" value={editForm.receita} onChange={e => setEditForm(f => ({ ...f, receita: formatarMoeda(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Observação</label>
                <textarea className="input" rows={2} placeholder="Informações adicionais..." value={editForm.observacao} onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
