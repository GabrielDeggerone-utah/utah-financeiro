'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Item = { id: string; nome: string; ativo: boolean }
type Props = { nome: string; instituicoes: Item[]; produtos: Item[] }

function useListManager(inicial: Item[], endpoint: string) {
  const [items, setItems] = useState(inicial)
  const [novoNome, setNovoNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function adicionar() {
    if (!novoNome.trim()) return
    setLoading(true); setErro('')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErro(data.error || 'Erro ao adicionar.'); return }
    setItems(prev => [...prev, data.item].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoNome('')
  }

  async function toggleAtivo(item: Item) {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ativo: !item.ativo }),
    })
    if (res.ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, ativo: !i.ativo } : i))
  }

  return { items, novoNome, setNovoNome, loading, erro, adicionar, toggleAtivo }
}

function ListaCard({ titulo, inst }: { titulo: string; inst: ReturnType<typeof useListManager> }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{titulo}</p>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            type="text"
            placeholder="Nome..."
            value={inst.novoNome}
            onChange={e => inst.setNovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inst.adicionar()}
          />
          <button className="btn-primary whitespace-nowrap" onClick={inst.adicionar} disabled={inst.loading}>
            {inst.loading ? '...' : 'Adicionar'}
          </button>
        </div>
        {inst.erro && <p className="text-sm text-red-600 mb-3">{inst.erro}</p>}
      </div>
      <table className="w-full text-sm border-t border-gray-50">
        <tbody className="divide-y divide-gray-50">
          {inst.items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-900">{item.nome}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${item.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => inst.toggleAtivo(item)} className={`text-xs ${item.ativo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                  {item.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ConfigClient({ nome, instituicoes, produtos }: Props) {
  const instManager  = useListManager(instituicoes, '/api/configuracoes/instituicoes')
  const prodManager  = useListManager(produtos,     '/api/configuracoes/produtos')

  return (
    <Layout nome={nome} role="master">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Configurações</h1>
        <p className="text-sm text-gray-500 mb-6">Gerencie instituições e produtos disponíveis</p>
        <div className="space-y-6">
          <ListaCard titulo="Instituições" inst={instManager} />
          <ListaCard titulo="Produtos" inst={prodManager} />
        </div>
      </div>
    </Layout>
  )
}
