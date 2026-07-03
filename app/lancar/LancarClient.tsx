'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase'

type Props = {
  nome: string
  role: 'assessor' | 'master'
  instituicoes: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
}

type ContaRow = { id: string; mes: string; tipo: string; numero_conta: string | null; nome_cliente: string | null; valor_ativacao: number; pontos: number }

function formatarMoeda(valor: string) {
  const num = valor.replace(/\D/g, '')
  if (!num) return ''
  return (parseInt(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseMoeda(valor: string) { return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0 }
function parseRoa(valor: string) { return parseFloat(valor.replace(',', '.')) || 0 }
function mesAtualStr() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function calcPontos(valor: number) {
  if (valor >= 1000000) return 2
  if (valor >= 300000) return 1
  if (valor >= 100000) return 0.5
  return 0
}
function tipoLabel(t: string) { return t === 'xp_xp' ? 'XP-XP' : 'Dinheiro Novo' }
function tipoBadge(t: string) { return t === 'xp_xp' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700' }

export default function LancarClient({ nome, role, instituicoes, produtos }: Props) {
  const supabase = createClient()
  const hoje = new Date().toISOString().split('T')[0]
  const [aba, setAba] = useState<'receita' | 'captacao' | 'contas'>('receita')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // --- RECEITA ---
  const [formR, setFormR] = useState({ data: hoje, volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })

  useEffect(() => {
    const volume = parseMoeda(formR.volume)
    const roa = parseRoa(formR.roa)
    if (volume > 0 && roa > 0) {
      const rec = (volume * roa) / 100
      setFormR(f => ({ ...f, receita: rec.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }))
    }
  }, [formR.volume, formR.roa])

  async function submitReceita(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!formR.instituicao_id) { setErro('Selecione a instituição.'); return }
    if (!formR.produto_id) { setErro('Selecione o produto.'); return }
    if (!formR.cliente_nome && !formR.cliente_conta) { setErro('Informe nome ou conta do cliente.'); return }
    const volume = parseMoeda(formR.volume)
    if (!volume || volume <= 0) { setErro('Volume deve ser maior que zero.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('receitas').insert({
      assessor_id: user!.id, data: formR.data, volume,
      roa: formR.roa ? parseRoa(formR.roa) : null,
      receita: formR.receita ? parseMoeda(formR.receita) : null,
      instituicao_id: formR.instituicao_id, produto_id: formR.produto_id,
      cliente_nome: formR.cliente_nome || null, cliente_conta: formR.cliente_conta || null, observacao: formR.observacao || null,
    })
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setSucesso('Lançamento registrado com sucesso!')
    setFormR({ data: hoje, volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })
  }

  // --- CAPTAÇÃO ---
  const [saida, setSaida] = useState(false)
  const [formC, setFormC] = useState({ data: hoje, tipo: 'dinheiro_novo', valor_net: '', observacao: '' })
  const valorNetNum = parseMoeda(formC.valor_net) * (saida ? -1 : 1)

  async function submitCaptacao(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!formC.valor_net) { setErro('Informe o valor NET.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('captacoes').insert({
      assessor_id: user!.id, data: formC.data,
      captacao_bruta: valorNetNum, saidas: 0,
      tipo: formC.tipo,
      observacao: formC.observacao || null,
    })
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setSucesso('Captação registrada com sucesso!')
    setFormC({ data: hoje, tipo: 'dinheiro_novo', valor_net: '', observacao: '' }); setSaida(false)
  }

  // --- CONTAS ---
  const [formCt, setFormCt] = useState({ mes: mesAtualStr(), tipo: 'conta_nova', numero_conta: '', nome_cliente: '', valor_ativacao: '', observacao: '' })
  const [contasMes, setContasMes] = useState<ContaRow[]>([])
  const [loadingContas, setLoadingContas] = useState(false)
  const valorAtivacao = parseMoeda(formCt.valor_ativacao)
  const pontosCalc = calcPontos(valorAtivacao)

  useEffect(() => {
    async function fetchContas() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('contas')
        .select('id,mes,tipo,numero_conta,nome_cliente,valor_ativacao,pontos')
        .eq('assessor_id', user.id).eq('mes', formCt.mes).order('created_at', { ascending: false })
      setContasMes(data ?? [])
    }
    if (aba === 'contas') fetchContas()
  }, [formCt.mes, aba])

  async function submitContas(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!formCt.nome_cliente && !formCt.numero_conta) { setErro('Informe nome ou número da conta.'); return }
    setLoadingContas(true)
    const res = await fetch('/api/contas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes: formCt.mes, tipo: formCt.tipo, numero_conta: formCt.numero_conta, nome_cliente: formCt.nome_cliente, valor_ativacao: valorAtivacao, observacao: formCt.observacao }),
    })
    setLoadingContas(false)
    if (!res.ok) { setErro('Erro ao salvar. Tente novamente.'); return }
    const { conta } = await res.json()
    setContasMes(prev => [conta, ...prev])
    setSucesso('Conta registrada!')
    setFormCt(f => ({ ...f, numero_conta: '', nome_cliente: '', valor_ativacao: '', observacao: '' }))
  }

  async function excluirConta(id: string) {
    if (!confirm('Excluir esta conta?')) return
    await fetch('/api/contas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setContasMes(prev => prev.filter(c => c.id !== id))
  }

  const totalPontosMes = contasMes.reduce((s, c) => s + c.pontos, 0)

  const abas = [
    { key: 'receita', label: 'Receita' },
    { key: 'captacao', label: 'Captação' },
    { key: 'contas', label: 'Contas' },
  ] as const

  return (
    <Layout nome={nome} role={role}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Lançar</h1>
        <p className="text-sm text-gray-500 mb-5">Registre sua produção</p>

        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {abas.map(a => (
            <button key={a.key} onClick={() => { setAba(a.key); setSucesso(''); setErro('') }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${aba === a.key ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {sucesso && <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-4 py-3">✓ {sucesso}</div>}
        {erro && <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erro}</div>}

        {/* === RECEITA === */}
        {aba === 'receita' && (
          <form onSubmit={submitReceita} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Data *</label>
                <input className="input" type="date" value={formR.data} onChange={e => setFormR(f => ({ ...f, data: e.target.value }))} required />
              </div>
              <div><label className="label">Volume (R$) *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={formR.volume}
                  onChange={e => setFormR(f => ({ ...f, volume: formatarMoeda(e.target.value) }))} required />
              </div>
              <div><label className="label">ROA (%)</label>
                <div className="relative">
                  <input className="input pr-8" type="text" inputMode="decimal" placeholder="Ex: 0,50" value={formR.roa}
                    onChange={e => setFormR(f => ({ ...f, roa: e.target.value }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div><label className="label">Receita gerada (R$) {formR.roa && <span className="ml-1 text-xs text-utah-500 font-normal">via ROA</span>}</label>
                <input className="input bg-gray-50" type="text" inputMode="numeric" placeholder="0,00" value={formR.receita}
                  onChange={e => setFormR(f => ({ ...f, receita: formatarMoeda(e.target.value) }))} />
              </div>
              <div><label className="label">Instituição *</label>
                <select className="input" value={formR.instituicao_id} onChange={e => setFormR(f => ({ ...f, instituicao_id: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Produto *</label>
                <select className="input" value={formR.produto_id} onChange={e => setFormR(f => ({ ...f, produto_id: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Cliente — nome</label>
                <input className="input" type="text" placeholder="Nome do cliente" value={formR.cliente_nome}
                  onChange={e => setFormR(f => ({ ...f, cliente_nome: e.target.value }))} />
              </div>
              <div><label className="label">Cliente — N° conta</label>
                <input className="input" type="text" placeholder="Ex: 12345-6" value={formR.cliente_conta}
                  onChange={e => setFormR(f => ({ ...f, cliente_conta: e.target.value }))} />
              </div>
            </div>
            <div><label className="label">Observação</label>
              <textarea className="input" rows={2} placeholder="Informações adicionais..." value={formR.observacao}
                onChange={e => setFormR(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary"
                onClick={() => setFormR({ data: hoje, volume: '', roa: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })}>
                Limpar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Registrar receita'}</button>
            </div>
          </form>
        )}

        {/* === CAPTAÇÃO === */}
        {aba === 'captacao' && (
          <form onSubmit={submitCaptacao} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Data *</label>
                <input className="input" type="date" value={formC.data} onChange={e => setFormC(f => ({ ...f, data: e.target.value }))} required />
              </div>
              <div><label className="label">Tipo *</label>
                <select className="input" value={formC.tipo} onChange={e => setFormC(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="dinheiro_novo">💵 Dinheiro Novo</option>
                  <option value="xp_xp">🔄 Transferência XP-XP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Valor NET *</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setSaida(false)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${!saida ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  ↑ Entrada de recurso
                </button>
                <button type="button" onClick={() => setSaida(true)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${saida ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  ↓ Saída de recurso
                </button>
              </div>
              <input className="input" type="text" inputMode="numeric" placeholder="0,00" required
                value={formC.valor_net}
                onChange={e => setFormC(f => ({ ...f, valor_net: formatarMoeda(e.target.value) }))} />
            </div>

            {formC.valor_net && (
              <div className={`rounded-lg px-4 py-3 border ${!saida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-0.5">{formC.tipo === 'xp_xp' ? 'Transferência XP-XP' : 'Dinheiro Novo'} — NET</p>
                <p className={`text-xl font-bold ${!saida ? 'text-green-700' : 'text-red-600'}`}>
                  {saida ? '−' : '+'} {fmt(parseMoeda(formC.valor_net))}
                </p>
                {saida && <p className="text-xs text-red-500 mt-0.5 font-medium">⚠ Saída de recursos</p>}
              </div>
            )}

            <div><label className="label">Observação</label>
              <textarea className="input" rows={2} placeholder="Informações adicionais..." value={formC.observacao}
                onChange={e => setFormC(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => { setFormC({ data: hoje, tipo: 'dinheiro_novo', valor_net: '', observacao: '' }); setSaida(false) }}>Limpar</button>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Registrar captação'}</button>
            </div>
          </form>
        )}

        {/* === CONTAS === */}
        {aba === 'contas' && (
          <div className="space-y-4">
            <form onSubmit={submitContas} className="card p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Mês de referência *</label>
                  <input className="input" type="month" value={formCt.mes} onChange={e => setFormCt(f => ({ ...f, mes: e.target.value }))} required />
                </div>
                <div><label className="label">Tipo *</label>
                  <select className="input" value={formCt.tipo} onChange={e => setFormCt(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="conta_nova">🆕 Conta Nova (Dinheiro Novo)</option>
                    <option value="xp_xp">🔄 Transferência XP-XP</option>
                  </select>
                </div>
                <div><label className="label">Nome do cliente</label>
                  <input className="input" type="text" placeholder="Nome completo" value={formCt.nome_cliente}
                    onChange={e => setFormCt(f => ({ ...f, nome_cliente: e.target.value }))} />
                </div>
                <div><label className="label">N° da conta</label>
                  <input className="input" type="text" placeholder="Ex: 12345-6" value={formCt.numero_conta}
                    onChange={e => setFormCt(f => ({ ...f, numero_conta: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Valor de ativação (R$)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={formCt.valor_ativacao}
                    onChange={e => setFormCt(f => ({ ...f, valor_ativacao: formatarMoeda(e.target.value) }))} />
                </div>
              </div>

              {valorAtivacao > 0 && (
                <div className="rounded-lg px-4 py-3 bg-utah-50 border border-utah-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pontuação desta conta</p>
                    <p className="text-2xl font-bold text-utah-600">{pontosCalc > 0 ? `${pontosCalc} ${pontosCalc !== 1 ? 'pts' : 'pt'}` : 'Sem pontos'}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 space-y-0.5">
                    <p className={valorAtivacao >= 100000 && valorAtivacao < 300000 ? 'text-utah-600 font-semibold' : ''}>100k–299k = 0,5 pt</p>
                    <p className={valorAtivacao >= 300000 && valorAtivacao < 1000000 ? 'text-utah-600 font-semibold' : ''}>300k–999k = 1 pt</p>
                    <p className={valorAtivacao >= 1000000 ? 'text-utah-600 font-semibold' : ''}>&gt;1M = 2 pts</p>
                  </div>
                </div>
              )}

              <div><label className="label">Observação</label>
                <textarea className="input" rows={2} placeholder="Informações adicionais..." value={formCt.observacao}
                  onChange={e => setFormCt(f => ({ ...f, observacao: e.target.value }))} />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary" disabled={loadingContas}>{loadingContas ? 'Salvando...' : 'Registrar conta'}</button>
              </div>
            </form>

            {contasMes.length > 0 && (
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700">Contas registradas</p>
                  <span className="text-xs text-gray-500">{contasMes.length} conta{contasMes.length !== 1 ? 's' : ''} · <span className="font-semibold text-utah-600">{totalPontosMes} pts</span></span>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Cliente / Conta</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Tipo</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Ativação</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Pts</th>
                    <th />
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {contasMes.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{c.nome_cliente || '—'}</p>
                          {c.numero_conta && <p className="text-xs text-gray-400">{c.numero_conta}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge(c.tipo)}`}>{tipoLabel(c.tipo)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 text-xs">{c.valor_ativacao > 0 ? fmt(c.valor_ativacao) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-utah-600">{c.pontos > 0 ? c.pontos : '—'}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => excluirConta(c.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
