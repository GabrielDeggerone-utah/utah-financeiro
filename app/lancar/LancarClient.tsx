'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase'

type Props = {
  nome: string
  role: 'assessor' | 'master'
  instituicoes: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
}

export default function LancarClient({ nome, role, instituicoes, produtos }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const hoje = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    data: hoje,
    volume: '',
    receita: '',
    instituicao_id: '',
    produto_id: '',
    cliente_nome: '',
    cliente_conta: '',
    observacao: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setSucesso(false)
    setErro('')
  }

  function formatarMoeda(valor: string) {
    const num = valor.replace(/\D/g, '')
    if (!num) return ''
    return (parseInt(num) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function parseMoeda(valor: string) {
    return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso(false)

    if (!form.instituicao_id) { setErro('Selecione a instituição.'); return }
    if (!form.produto_id)     { setErro('Selecione o produto.'); return }
    if (!form.cliente_nome && !form.cliente_conta) { setErro('Informe o nome ou número de conta do cliente.'); return }

    const volume = parseMoeda(form.volume)
    if (!volume || volume <= 0) { setErro('Volume deve ser maior que zero.'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('receitas').insert({
      assessor_id:    user!.id,
      data:           form.data,
      volume,
      receita:        form.receita ? parseMoeda(form.receita) : null,
      instituicao_id: form.instituicao_id,
      produto_id:     form.produto_id,
      cliente_nome:   form.cliente_nome || null,
      cliente_conta:  form.cliente_conta || null,
      observacao:     form.observacao || null,
    })

    setLoading(false)
    if (error) { setErro('Erro ao salvar. Tente novamente.'); return }

    setSucesso(true)
    setForm({ data: hoje, volume: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })
  }

  return (
    <Layout nome={nome} role={role}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Lançar receita</h1>
        <p className="text-sm text-gray-500 mb-6">Registre sua produção</p>

        {sucesso && (
          <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-4 py-3">
            ✓ Lançamento registrado com sucesso!
          </div>
        )}
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input className="input" type="date" value={form.data} onChange={e => set('data', e.target.value)} required />
            </div>
            <div>
              <label className="label">Volume (R$) *</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={form.volume}
                onChange={e => set('volume', formatarMoeda(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="label">Instituição *</label>
              <select className="input" value={form.instituicao_id} onChange={e => set('instituicao_id', e.target.value)} required>
                <option value="">Selecione...</option>
                {instituicoes.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Produto *</label>
              <select className="input" value={form.produto_id} onChange={e => set('produto_id', e.target.value)} required>
                <option value="">Selecione...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente — nome</label>
              <input className="input" type="text" placeholder="Nome do cliente" value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} />
            </div>
            <div>
              <label className="label">Cliente — N° conta</label>
              <input className="input" type="text" placeholder="Ex: 12345-6" value={form.cliente_conta} onChange={e => set('cliente_conta', e.target.value)} />
            </div>
            <div>
              <label className="label">Receita recebida (R$)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="0,00 — opcional"
                value={form.receita}
                onChange={e => set('receita', formatarMoeda(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Observação</label>
            <textarea className="input" rows={2} placeholder="Informações adicionais..." value={form.observacao} onChange={e => set('observacao', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setForm({ data: hoje, volume: '', receita: '', instituicao_id: '', produto_id: '', cliente_nome: '', cliente_conta: '', observacao: '' })}>
              Limpar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Registrar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
