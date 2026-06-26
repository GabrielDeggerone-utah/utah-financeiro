'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Assessor = { id: string; nome: string; email: string; role: string; ativo: boolean; created_at: string }
type Props = { nome: string; assessores: Assessor[] }

export default function AssessoresClient({ nome, assessores: inicial }: Props) {
  const [assessores, setAssessores] = useState(inicial)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'assessor' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  function set(f: string, v: string) { setForm(prev => ({ ...prev, [f]: v })); setErro(''); setSucesso('') }

  async function criarAssessor(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setSucesso(''); setLoading(true)
    const res = await fetch('/api/assessores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErro(data.error || 'Erro ao cadastrar.'); return }
    setSucesso(`Assessor "${form.nome}" cadastrado com sucesso!`)
    setForm({ nome: '', email: '', senha: '', role: 'assessor' })
    setAssessores(prev => [...prev, data.profile].sort((a, b) => a.nome.localeCompare(b.nome)))
  }

  async function toggleAtivo(assessor: Assessor) {
    const res = await fetch('/api/assessores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: assessor.id, ativo: !assessor.ativo }),
    })
    if (res.ok) setAssessores(prev => prev.map(a => a.id === assessor.id ? { ...a, ativo: !a.ativo } : a))
  }

  return (
    <Layout nome={nome} role="master">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Assessores</h1>
        <p className="text-sm text-gray-500 mb-6">Cadastre e gerencie os acessos</p>

        {/* Formulário */}
        <div className="card p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Novo assessor</p>
          {sucesso && <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-4 py-3">{sucesso}</div>}
          {erro    && <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erro}</div>}
          <form onSubmit={criarAssessor} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" type="text" value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="João Silva" />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="joao@utahinvest.com.br" />
            </div>
            <div>
              <label className="label">Senha inicial *</label>
              <input className="input" type="password" value={form.senha} onChange={e => set('senha', e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Perfil</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="assessor">Assessor</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar assessor'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Perfil</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assessores.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{a.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${a.role === 'master' ? 'bg-utah-50 text-utah-700' : 'bg-gray-100 text-gray-700'}`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${a.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleAtivo(a)} className={`text-xs ${a.ativo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                      {a.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
