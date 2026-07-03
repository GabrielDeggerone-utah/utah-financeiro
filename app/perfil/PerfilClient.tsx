'use client'
import { useState } from 'react'
import Layout from '@/components/Layout'

type Props = {
  nome: string
  role: 'assessor' | 'master'
  email: string
  userId: string
  assessores: { id: string; nome: string; email: string }[]
}

export default function PerfilClient({ nome, role, email, assessores }: Props) {
  // Alterar própria senha
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Reset de senha (master)
  const [resetId, setResetId] = useState('')
  const [resetSenha, setResetSenha] = useState('')
  const [resetConfirmar, setResetConfirmar] = useState('')
  const [resetando, setResetando] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarReset, setMostrarReset] = useState(false)

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (novaSenha.length < 6) { setMsg({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' }); return }
    if (novaSenha !== confirmar) { setMsg({ tipo: 'erro', texto: 'As senhas não coincidem.' }); return }
    setSalvando(true)
    const res = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: novaSenha }) })
    setSalvando(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: 'Senha alterada com sucesso!' })
      setNovaSenha(''); setConfirmar('')
    } else {
      const d = await res.json()
      setMsg({ tipo: 'erro', texto: d.error ?? 'Erro ao alterar senha.' })
    }
  }

  async function resetarSenha(e: React.FormEvent) {
    e.preventDefault()
    setResetMsg(null)
    if (!resetId) { setResetMsg({ tipo: 'erro', texto: 'Selecione um assessor.' }); return }
    if (resetSenha.length < 6) { setResetMsg({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' }); return }
    if (resetSenha !== resetConfirmar) { setResetMsg({ tipo: 'erro', texto: 'As senhas não coincidem.' }); return }
    setResetando(true)
    const res = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: resetSenha, userId: resetId }) })
    setResetando(false)
    if (res.ok) {
      const assessor = assessores.find(a => a.id === resetId)
      setResetMsg({ tipo: 'ok', texto: `Senha de ${assessor?.nome ?? 'assessor'} redefinida com sucesso!` })
      setResetSenha(''); setResetConfirmar(''); setResetId('')
    } else {
      const d = await res.json()
      setResetMsg({ tipo: 'erro', texto: d.error ?? 'Erro ao redefinir senha.' })
    }
  }

  return (
    <Layout nome={nome} role={role}>
      <div className="px-6 py-8 max-w-xl">
        <div className="mb-7">
          <h1 className="text-lg font-semibold text-gray-900">Meu perfil</h1>
          <p className="text-sm text-gray-500">Gerencie suas informações de acesso</p>
        </div>

        {/* Info */}
        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-utah-100 flex items-center justify-center text-utah-600 text-lg font-bold shrink-0">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{nome}</p>
            <p className="text-sm text-gray-500">{email}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 text-xs rounded-full font-medium bg-utah-50 text-utah-700 capitalize">{role}</span>
          </div>
        </div>

        {/* Alterar própria senha */}
        <div className="card p-5 mb-6">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setMostrarSenha(v => !v)}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-utah-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              <span className="text-sm font-medium text-gray-800">Alterar minha senha</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${mostrarSenha ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {mostrarSenha && (
            <form onSubmit={alterarSenha} className="mt-4 space-y-3">
              {msg && (
                <div className={`text-sm rounded-lg px-4 py-3 ${msg.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                  {msg.texto}
                </div>
              )}
              <div>
                <label className="label">Nova senha</label>
                <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="label">Confirmar nova senha</label>
                <input className="input" type="password" placeholder="Repita a senha" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" disabled={salvando} className="btn-primary w-full">
                {salvando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>

        {/* Seção master — reset de senhas */}
        {role === 'master' && (
          <div className="card p-5">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setMostrarReset(v => !v)}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-sm font-medium text-gray-800">Redefinir senha de assessor</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${mostrarReset ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {mostrarReset && (
              <form onSubmit={resetarSenha} className="mt-4 space-y-3">
                {resetMsg && (
                  <div className={`text-sm rounded-lg px-4 py-3 ${resetMsg.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                    {resetMsg.texto}
                  </div>
                )}
                <div>
                  <label className="label">Assessor</label>
                  <select className="input" value={resetId} onChange={e => setResetId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {assessores.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} {a.email ? `(${a.email})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Nova senha</label>
                  <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={resetSenha} onChange={e => setResetSenha(e.target.value)} autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input className="input" type="password" placeholder="Repita a senha" value={resetConfirmar} onChange={e => setResetConfirmar(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-xs text-orange-700">
                  O assessor conseguirá entrar com a nova senha imediatamente. Informe-o após redefinir.
                </div>
                <button type="submit" disabled={resetando} className="w-full py-2.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-60">
                  {resetando ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
