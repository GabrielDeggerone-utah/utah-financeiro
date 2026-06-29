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

function formatarMoeda(valor: string) {
  const num = valor.replace(/\D/g, '')
  if (!num) return ''
  return (parseInt(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseMoeda(valor: string) { return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0 }
function parseRoa(valor: string) { return parseFloat(valor.replace(',', '.')) || 0 }
function mesAtual() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }

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
    if (!formR.produto_id)     { setErro('Selecione o produto.'); return }
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
  const [formC, setFormC] = useState({ data: hoje, captacao_bruta: '', saidas: '', observacao: '' })
  const captacaoNet = parseMoeda(formC.captacao_bruta) - parseMoeda(formC.saidas)

  async function submitCaptacao(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso('')
    const bruta = parseMoeda(formC.captacao_bruta)
    if (!bruta || bruta <= 0) { setErro('Captação bruta deve ser maior que zero.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('captacoes').insert({
      assessor_id: user!.id, data: formC.data,
      captacao_bruta: bruta, saidas: parseMoeda(formC.saidas) || 0,
      observacao: formC.observacao || null,
    })
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setSucesso('Captação registrada com sucesso!')
    setFormC({ data: hoje, captacao_bruta: '', saidas: '', observacao: '' })
  }

  // --- CONTAS DO MÊS ---
  const [formCt, setFormCt] = useState({ mes: mesAtual(), contas_abertas: '', contas_ativas: '', observacao: '' })

  async function submitContas(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso('')
    const abertas = parseInt(formCt.contas_abertas) || 0
    const ativas  = parseInt(formCt.contas_ativas)  || 0
    if (abertas === 0 && ativas === 0) { setErro('Informe ao menos um valor.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('contas_mes').upsert({
      assessor_id: user!.id, mes: formCt.mes,
      contas_abertas: abertas, contas_ativas: ativas,
      observacao: formCt.observacao || null,
    }, { onConflict: 'assessor_id,mes' })
    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    setSucesso('Dados de contas salvos com sucesso!')
  }

  const abas = [
    { key: 'receita',  label: 'Receita' },
    { key: 'captacao', label: 'Captação' },
    { key: 'contas',   label: 'Contas do mês' },
  ] as const

  return (
    <Layout nome={nome} role={role}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Lançar</h1>
        <p className="text-sm text-gray-500 mb-5">Registre sua produção</p>

        {/* Abas */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
          {abas.map(a => (
            <button key={a.key} onClick={() => { setAba(a.key); setSucesso(''); setErro('') }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${aba === a.key ? 'border-utah-500 text-utah-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {sucesso && <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-4 py-3">✓ {sucesso}</div>}
        {erro    && <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erro}</div>}

        {/* === ABA RECEITA === */}
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
                <input className="input bg-gray-50" type="text" inputMode="numeric" placeholder="0,00 — opcional" value={formR.receita}
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

        {/* === ABA CAPTAÇÃO === */}
        {aba === 'captacao' && (
          <form onSubmit={submitCaptacao} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Data *</label>
                <input className="input" type="date" value={formC.data} onChange={e => setFormC(f => ({ ...f, data: e.target.value }))} required />
              </div>
              <div><label className="label">Captação Bruta (R$) *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={formC.captacao_bruta}
                  onChange={e => setFormC(f => ({ ...f, captacao_bruta: formatarMoeda(e.target.value) }))} required />
              </div>
              <div><label className="label">Saídas (R$)</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0,00" value={formC.saidas}
                  onChange={e => setFormC(f => ({ ...f, saidas: formatarMoeda(e.target.value) }))} />
              </div>
            </div>
            {/* NET preview */}
            <div className={`rounded-lg px-4 py-3 border ${captacaoNet >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">Captação NET (Bruta − Saídas)</p>
              <p className={`text-xl font-bold ${captacaoNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {captacaoNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div><label className="label">Observação</label>
              <textarea className="input" rows={2} placeholder="Informações adicionais..." value={formC.observacao}
                onChange={e => setFormC(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setFormC({ data: hoje, captacao_bruta: '', saidas: '', observacao: '' })}>Limpar</button>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Registrar captação'}</button>
            </div>
          </form>
        )}

        {/* === ABA CONTAS === */}
        {aba === 'contas' && (
          <form onSubmit={submitContas} className="card p-6 space-y-4">
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Os dados de contas são registrados por mês. Se já houver dados para o mês selecionado, serão atualizados.
            </p>
            <div>
              <label className="label">Mês de referência *</label>
              <input className="input" type="month" value={formCt.mes} onChange={e => setFormCt(f => ({ ...f, mes: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contas abertas no mês</label>
                <input className="input" type="number" min="0" placeholder="0" value={formCt.contas_abertas}
                  onChange={e => setFormCt(f => ({ ...f, contas_abertas: e.target.value }))} />
              </div>
              <div>
                <label className="label">Contas ativas (100k+)</label>
                <input className="input" type="number" min="0" placeholder="0" value={formCt.contas_ativas}
                  onChange={e => setFormCt(f => ({ ...f, contas_ativas: e.target.value }))} />
              </div>
            </div>
            <div><label className="label">Observação</label>
              <textarea className="input" rows={2} placeholder="Informações adicionais..." value={formCt.observacao}
                onChange={e => setFormCt(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar contas do mês'}</button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}
