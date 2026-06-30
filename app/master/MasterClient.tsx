'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProdutoBadge from '@/components/ProdutoBadge'

type Receita = {
  id: string; data: string; volume: number; roa: number | null; receita: number | null
  cliente_nome: string | null; cliente_conta: string | null; observacao: string | null
  assessor_id: string; instituicao_id: string | null; produto_id: string | null
  profiles: { nome: string } | null; instituicoes: { nome: string } | null; produtos: { nome: string } | null
}
type Captacao = { id: string; data: string; captacao_bruta: number; saidas: number; observacao: string | null; assessor_id: string; profiles: { nome: string } | null }
type Conta    = { id: string; mes: string; contas_abertas: number; contas_ativas: number; observacao: string | null; assessor_id: string; profiles: { nome: string } | null }
type Meta     = { assessor_id: string; mes: string; meta_producao: number; meta_captacao_bruta: number; meta_captacao_net: number; meta_contas_abertas: number; meta_contas_ativas: number }
type Assessor = { id: string; nome: string }
type Backup   = { id: string; nome_arquivo: string; tipo: string; total_registros: number | null; created_at: string }

type Props = {
  nome: string; mesAtual: string; mesPrev: string
  receitas: Receita[]; backups: Backup[]
  instituicoes: { id: string; nome: string }[]; produtos: { id: string; nome: string }[]
  captacoes: Captacao[]; contas: Conta[]; metas: Meta[]; assessores: Assessor[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }
function fmtMes(m: string) { const [y,mo] = m.split('-'); return new Date(Number(y),Number(mo)-1).toLocaleString('pt-BR',{month:'long',year:'numeric'}) }
function fmtTs(ts: string) { return new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) }
function parseMoeda(v: string) { return parseFloat(v.replace(/\./g,'').replace(',','.')) || 0 }
function fmtMoedaInput(v: string) { const n=v.replace(/\D/g,''); if(!n) return ''; return (parseInt(n)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function numToMoeda(v: number|null) { if(!v) return ''; return v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function cor(p: number) { return p>=1?'#16a34a':p>=0.7?'#f59e0b':'#ef4444' }
function corText(p: number) { return p>=1?'text-green-700':p>=0.7?'text-yellow-700':'text-red-600' }
function corBadge(p: number) { return p>=1?'bg-green-100 text-green-800':p>=0.7?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-700' }

function Ring({ pct, size=64 }: { pct: number; size?: number }) {
  const r=size*.38, c=2*Math.PI*r, d=Math.min(pct,1)*c, fill=cor(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={size*.1}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={fill} strokeWidth={size*.1}
        strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size*.16} fontWeight="bold" fill={fill}>
        {pct>0?`${Math.round(Math.min(pct,9.99)*100)}%`:'—'}
      </text>
    </svg>
  )
}

export default function MasterClient({ nome, mesAtual, mesPrev, receitas: initR, backups, instituicoes, produtos, captacoes: initC, contas: initCt, metas, assessores }: Props) {
  const [receitas, setReceitas]   = useState(initR)
  const [captacoes, setCaptacoes] = useState(initC)
  const [contas, setContas]       = useState(initCt)
  const [mesFiltro, setMesFiltro] = useState(mesAtual)
  const [assessorFiltro, setAssessorFiltro] = useState('')
  const [produtoFiltro, setProdutoFiltro]   = useState('')
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState<'producao'|'captacoes'|'contas'|'ranking'|'backups'>('producao')

  // Modal edição receita
  const [editR, setEditR] = useState<Receita|null>(null)
  const [editRForm, setEditRForm] = useState({data:'',volume:'',roa:'',receita:'',instituicao_id:'',produto_id:'',cliente_nome:'',cliente_conta:'',observacao:''})
  // Modal edição captação
  const [editC, setEditC] = useState<Captacao|null>(null)
  const [editCForm, setEditCForm] = useState({data:'',captacao_bruta:'',saidas:'',observacao:''})
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string|null>(null)
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    const vol = parseMoeda(editRForm.volume), roa = parseFloat(editRForm.roa.replace(',','.')) || 0
    if (vol>0 && roa>0) setEditRForm(f=>({...f, receita:((vol*roa)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}))
  }, [editRForm.volume, editRForm.roa])

  // Filtros produção
  const filtradas = receitas.filter(r => {
    const mesOk  = mesFiltro     ? r.data.startsWith(mesFiltro) : true
    const assOk  = assessorFiltro ? r.profiles?.nome === assessorFiltro : true
    const prodOk = produtoFiltro  ? r.produtos?.nome  === produtoFiltro  : true
    return mesOk && assOk && prodOk
  })
  const filtCap = captacoes.filter(c => mesFiltro ? c.data.startsWith(mesFiltro) : true)

  const totalVolume  = filtradas.reduce((s,r)=>s+r.volume,0)
  const totalReceita = filtradas.reduce((s,r)=>s+(r.receita??0),0)
  const totalBruta   = filtCap.reduce((s,c)=>s+c.captacao_bruta,0)
  const totalSaidas  = filtCap.reduce((s,c)=>s+c.saidas,0)

  // Ranking
  const rankData = assessores.map(a => {
    const recAtual = receitas.filter(r=>r.assessor_id===a.id && r.data.startsWith(mesAtual)).reduce((s,r)=>s+r.volume,0)
    const recPrev  = receitas.filter(r=>r.assessor_id===a.id && r.data.startsWith(mesPrev)).reduce((s,r)=>s+r.volume,0)
    const capAtual = captacoes.filter(c=>c.assessor_id===a.id && c.data.startsWith(mesAtual)).reduce((s,c)=>s+c.captacao_bruta,0)
    const netAtual = captacoes.filter(c=>c.assessor_id===a.id && c.data.startsWith(mesAtual)).reduce((s,c)=>s+(c.captacao_bruta-c.saidas),0)
    const meta     = metas.find(m=>m.assessor_id===a.id)
    const pctMeta  = meta?.meta_producao ? recAtual/meta.meta_producao : 0
    const crescimento = recPrev>0 ? ((recAtual-recPrev)/recPrev)*100 : recAtual>0 ? 100 : 0
    return { ...a, recAtual, recPrev, capAtual, netAtual, pctMeta, crescimento, meta }
  }).filter(a=>a.recAtual>0||a.capAtual>0||(a.meta?.meta_producao??0)>0)

  const rankPorMeta  = [...rankData].sort((a,b)=>b.pctMeta-a.pctMeta)
  const rankPorCap   = [...rankData].sort((a,b)=>b.capAtual-a.capAtual)
  const rankPorCresc = [...rankData].sort((a,b)=>b.crescimento-a.crescimento)

  // Meta equipe consolidada
  const metaEquipe = {
    producao:       metas.reduce((s,m)=>s+m.meta_producao,0),
    captacao_bruta: metas.reduce((s,m)=>s+m.meta_captacao_bruta,0),
    captacao_net:   metas.reduce((s,m)=>s+m.meta_captacao_net,0),
    contas_abertas: metas.reduce((s,m)=>s+m.meta_contas_abertas,0),
    contas_ativas:  metas.reduce((s,m)=>s+m.meta_contas_ativas,0),
  }
  const realEquipe = {
    producao:       receitas.filter(r=>r.data.startsWith(mesAtual)).reduce((s,r)=>s+r.volume,0),
    captacao_bruta: captacoes.filter(c=>c.data.startsWith(mesAtual)).reduce((s,c)=>s+c.captacao_bruta,0),
    captacao_net:   captacoes.filter(c=>c.data.startsWith(mesAtual)).reduce((s,c)=>s+(c.captacao_bruta-c.saidas),0),
    contas_abertas: contas.filter(c=>c.mes===mesAtual).reduce((s,c)=>s+c.contas_abertas,0),
    contas_ativas:  contas.filter(c=>c.mes===mesAtual).reduce((s,c)=>s+c.contas_ativas,0),
  }

  const assessoresUnicos = [...new Set(receitas.map(r=>r.profiles?.nome).filter(Boolean))]
  const produtosUnicos   = [...new Set(receitas.map(r=>r.produtos?.nome).filter(Boolean))]

  // Handlers receita
  function abrirEditR(r: Receita) {
    setEditR(r); setErroModal('')
    setEditRForm({data:r.data,volume:numToMoeda(r.volume),roa:r.roa!=null?String(r.roa).replace('.',','):'',receita:numToMoeda(r.receita),instituicao_id:r.instituicao_id??'',produto_id:r.produto_id??'',cliente_nome:r.cliente_nome??'',cliente_conta:r.cliente_conta??'',observacao:r.observacao??''})
  }
  async function salvarR() {
    if(!editR) return; setSalvando(true)
    const vol = parseMoeda(editRForm.volume)
    const res = await fetch('/api/receitas',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editR.id,data:editRForm.data,volume:vol,roa:editRForm.roa?parseFloat(editRForm.roa.replace(',','.')):null,receita:editRForm.receita?parseMoeda(editRForm.receita):null,instituicao_id:editRForm.instituicao_id,produto_id:editRForm.produto_id,cliente_nome:editRForm.cliente_nome,cliente_conta:editRForm.cliente_conta,observacao:editRForm.observacao})})
    setSalvando(false)
    if(!res.ok){setErroModal('Erro ao salvar');return}
    setReceitas(prev=>prev.map(r=>r.id!==editR.id?r:{...r,data:editRForm.data,volume:vol,roa:editRForm.roa?parseFloat(editRForm.roa.replace(',','.')):null,receita:editRForm.receita?parseMoeda(editRForm.receita):null,instituicao_id:editRForm.instituicao_id,produto_id:editRForm.produto_id,cliente_nome:editRForm.cliente_nome||null,cliente_conta:editRForm.cliente_conta||null,observacao:editRForm.observacao||null,instituicoes:instituicoes.find(i=>i.id===editRForm.instituicao_id)?{nome:instituicoes.find(i=>i.id===editRForm.instituicao_id)!.nome}:r.instituicoes,produtos:produtos.find(p=>p.id===editRForm.produto_id)?{nome:produtos.find(p=>p.id===editRForm.produto_id)!.nome}:r.produtos}))
    setEditR(null)
  }
  async function excluirR(id: string) {
    if(!confirm('Excluir este lançamento?')) return; setExcluindo(id)
    const res = await fetch('/api/receitas',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setExcluindo(null)
    if(!res.ok){alert('Erro ao excluir');return}
    setReceitas(prev=>prev.filter(r=>r.id!==id))
  }

  // Handlers captação
  function abrirEditC(c: Captacao) {
    setEditC(c); setErroModal('')
    setEditCForm({data:c.data,captacao_bruta:numToMoeda(c.captacao_bruta),saidas:numToMoeda(c.saidas),observacao:c.observacao??''})
  }
  async function salvarC() {
    if(!editC) return; setSalvando(true)
    const res = await fetch('/api/captacoes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editC.id,data:editCForm.data,captacao_bruta:parseMoeda(editCForm.captacao_bruta),saidas:parseMoeda(editCForm.saidas),observacao:editCForm.observacao})})
    setSalvando(false)
    if(!res.ok){setErroModal('Erro ao salvar');return}
    setCaptacoes(prev=>prev.map(c=>c.id!==editC.id?c:{...c,data:editCForm.data,captacao_bruta:parseMoeda(editCForm.captacao_bruta),saidas:parseMoeda(editCForm.saidas),observacao:editCForm.observacao||null}))
    setEditC(null)
  }
  async function excluirC(id: string) {
    if(!confirm('Excluir esta captação?')) return; setExcluindo(id)
    const res = await fetch('/api/captacoes',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setExcluindo(null)
    if(!res.ok){alert('Erro ao excluir');return}
    setCaptacoes(prev=>prev.filter(c=>c.id!==id))
  }

  async function exportar() {
    setExportando(true)
    try {
      const p = new URLSearchParams()
      if(mesFiltro) p.set('mes',mesFiltro)
      if(assessorFiltro) p.set('assessor',assessorFiltro)
      if(produtoFiltro) p.set('produto',produtoFiltro)
      const res = await fetch(`/api/export?${p}`)
      if(!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=res.headers.get('x-filename')||'producao.xlsx'; a.click()
      URL.revokeObjectURL(url); window.location.reload()
    } catch { alert('Erro ao exportar.') } finally { setExportando(false) }
  }

  function BtnsAcao({ onEdit, onDel, id }: { onEdit:()=>void; onDel:()=>void; id:string }) {
    return (
      <div className="flex gap-1 justify-end">
        <button onClick={onEdit} className="p-1 rounded text-gray-400 hover:text-utah-600 hover:bg-utah-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button onClick={onDel} disabled={excluindo===id} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    )
  }

  const abas = [
    {key:'producao', label:'Produção'},
    {key:'captacoes', label:'Captações'},
    {key:'contas', label:'Contas'},
    {key:'ranking', label:'🏆 Ranking'},
    {key:'backups', label:'Backups'},
  ] as const

  return (
    <Layout nome={nome} role="master">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Painel master</h1>
            <p className="text-sm text-gray-500">Produção consolidada de todos os assessores</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={exportar} disabled={exportando}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            {exportando ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>

        {/* ── META DA EQUIPE CONSOLIDADA ── */}
        {metaEquipe.producao > 0 && (
          <div className="card p-5 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Meta da equipe — <span className="font-normal capitalize">{fmtMes(mesAtual)}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {label:'Produção',      real:realEquipe.producao,       meta:metaEquipe.producao},
                {label:'Cap. Bruta',    real:realEquipe.captacao_bruta, meta:metaEquipe.captacao_bruta},
                {label:'Cap. NET',      real:realEquipe.captacao_net,   meta:metaEquipe.captacao_net},
                {label:'C. Abertas',   real:realEquipe.contas_abertas,  meta:metaEquipe.contas_abertas, num:true},
                {label:'C. Ativas 100k+', real:realEquipe.contas_ativas,meta:metaEquipe.contas_ativas, num:true},
              ].map(k => {
                const pct = k.meta>0 ? k.real/k.meta : 0
                return (
                  <div key={k.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium">{k.label}</span>
                      <span className={corText(pct)}>{Math.round(pct*100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{width:`${Math.min(pct*100,100)}%`,background:cor(pct)}}/>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={`font-semibold ${corText(pct)}`}>{k.num ? k.real : fmt(k.real)}</span>
                      <span className="text-gray-400">/{k.num ? k.meta : fmt(k.meta)}</span>
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
            <button key={a.key} onClick={()=>setAba(a.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${aba===a.key?'border-utah-500 text-utah-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Filtros compartilhados */}
        {(aba==='producao'||aba==='captacoes') && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {aba==='producao' && (
              <>
                <select className="input w-auto text-sm" value={assessorFiltro} onChange={e=>setAssessorFiltro(e.target.value)}>
                  <option value="">Todos assessores</option>
                  {assessoresUnicos.map(a=><option key={a}>{a}</option>)}
                </select>
                <select className="input w-auto text-sm" value={produtoFiltro} onChange={e=>setProdutoFiltro(e.target.value)}>
                  <option value="">Todos produtos</option>
                  {produtosUnicos.map(p=><option key={p}>{p}</option>)}
                </select>
              </>
            )}
            <input className="input w-auto text-sm" type="month" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}/>
          </div>
        )}

        {/* ══ ABA PRODUÇÃO ══ */}
        {aba==='producao' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Volume total</p><p className="text-xl font-semibold text-gray-900">{fmt(totalVolume)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Receita total</p><p className="text-xl font-semibold text-gray-900">{fmt(totalReceita)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Lançamentos</p><p className="text-xl font-semibold text-gray-900">{filtradas.length}</p></div>
            </div>
            {/* Ranking por assessor */}
            <div className="card mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Produção por assessor</p></div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Assessor</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Lançamentos</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Volume</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Receita</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">% do total</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.values(filtradas.reduce<Record<string,{nome:string;vol:number;rec:number;qtd:number}>>((acc,r)=>{
                    const id=r.assessor_id; const n=r.profiles?.nome??'Desconhecido'
                    if(!acc[id]) acc[id]={nome:n,vol:0,rec:0,qtd:0}
                    acc[id].vol+=r.volume; acc[id].rec+=(r.receita??0); acc[id].qtd++; return acc
                  },{})).sort((a,b)=>b.vol-a.vol).map(a=>(
                    <tr key={a.nome} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{a.qtd}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmt(a.vol)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(a.rec)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{totalVolume>0?((a.vol/totalVolume)*100).toFixed(1)+'%':'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Tabela lançamentos */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-700">Todos os lançamentos</p></div>
              {filtradas.length===0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhum lançamento encontrado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cliente</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Produto</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Instituição</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Volume</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Receita</th>
                      <th/>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtradas.map(r=>(
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtData(r.data)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.profiles?.nome??'—'}</td>
                          <td className="px-4 py-3 text-gray-700">{r.cliente_nome||''}{r.cliente_nome&&r.cliente_conta?' · ':''}{r.cliente_conta?<span className="text-gray-400">{r.cliente_conta}</span>:''}{!r.cliente_nome&&!r.cliente_conta?<span className="text-gray-400">—</span>:''}</td>
                          <td className="px-4 py-3"><ProdutoBadge nome={r.produtos?.nome??''}/></td>
                          <td className="px-4 py-3 text-gray-600">{r.instituicoes?.nome??'—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.volume)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{r.receita?fmt(r.receita):'—'}</td>
                          <td className="px-4 py-3"><BtnsAcao id={r.id} onEdit={()=>abrirEditR(r)} onDel={()=>excluirR(r.id)}/></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-utah-50 border-t border-utah-100">
                      <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-utah-700">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalVolume)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-utah-700">{fmt(totalReceita)}</td>
                      <td/>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ABA CAPTAÇÕES ══ */}
        {aba==='captacoes' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Captação Bruta</p><p className="text-xl font-semibold text-gray-900">{fmt(totalBruta)}</p></div>
              <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Saídas</p><p className="text-xl font-semibold text-red-600">{fmt(totalSaidas)}</p></div>
              <div className={`card p-4 border ${totalBruta-totalSaidas>=0?'border-green-200':'border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Captação NET</p>
                <p className={`text-xl font-semibold ${totalBruta-totalSaidas>=0?'text-green-700':'text-red-600'}`}>{fmt(totalBruta-totalSaidas)}</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              {filtCap.length===0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhuma captação encontrada.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Bruta</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Saídas</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">NET</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                      <th/>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtCap.map(c=>{
                        const net=c.captacao_bruta-c.saidas
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{fmtData(c.data)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{c.profiles?.nome??'—'}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.captacao_bruta)}</td>
                            <td className="px-4 py-3 text-right text-red-500">{c.saidas>0?fmt(c.saidas):'—'}</td>
                            <td className={`px-4 py-3 text-right font-medium ${net>=0?'text-green-700':'text-red-600'}`}>{fmt(net)}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{c.observacao||'—'}</td>
                            <td className="px-4 py-3"><BtnsAcao id={c.id} onEdit={()=>abrirEditC(c)} onDel={()=>excluirC(c.id)}/></td>
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

        {/* ══ ABA CONTAS ══ */}
        {aba==='contas' && (
          <div className="card overflow-hidden">
            {contas.length===0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhum registro de contas.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Mês</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Assessor</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Contas Abertas</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ativas 100k+</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Obs</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {contas.map(c=>(
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700 capitalize">{fmtMes(c.mes)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.profiles?.nome??'—'}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{c.contas_abertas}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{c.contas_ativas}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.observacao||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ ABA RANKING ══ */}
        {aba==='ranking' && (
          <div className="space-y-6">
            <p className="text-xs text-gray-400">Referência: <span className="font-medium capitalize">{fmtMes(mesAtual)}</span> vs <span className="capitalize">{fmtMes(mesPrev)}</span></p>

            {/* Ranking por % de meta */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">🎯 Mais próximo da meta de produção</p>
              </div>
              {rankPorMeta.length===0 ? <p className="text-center text-gray-400 text-sm py-8">Sem dados este mês</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorMeta.map((a,i)=>(
                    <div key={a.id} className={`flex items-center gap-4 px-4 py-3 ${i===0?'bg-yellow-50':''}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-gray-700':i===2?'bg-amber-600 text-white':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                      <Ring pct={a.pctMeta} size={56}/>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                        <p className="text-xs text-gray-500">{fmt(a.recAtual)} <span className="text-gray-300">/ {fmt(a.meta?.meta_producao??0)}</span></p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${corBadge(a.pctMeta)}`}>{Math.round(a.pctMeta*100)}% da meta</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ranking por captação */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">💰 Maior captação bruta no mês</p>
              </div>
              {rankPorCap.filter(a=>a.capAtual>0).length===0 ? <p className="text-center text-gray-400 text-sm py-8">Sem captações registradas este mês</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorCap.filter(a=>a.capAtual>0).map((a,i)=>{
                    const maxCap = rankPorCap[0]?.capAtual||1
                    return (
                      <div key={a.id} className={`px-4 py-3 ${i===0?'bg-blue-50':''}`}>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i===0?'bg-blue-500 text-white':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                          <span className="font-semibold text-gray-900 text-sm flex-1">{a.nome}</span>
                          <span className="text-sm font-bold text-gray-900">{fmt(a.capAtual)}</span>
                        </div>
                        <div className="ml-9">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${(a.capAtual/maxCap)*100}%`}}/>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">NET: <span className={a.netAtual>=0?'text-green-600':'text-red-600'}>{fmt(a.netAtual)}</span></p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ranking por crescimento */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">📈 Maior crescimento de produção (mês a mês)</p>
              </div>
              {rankPorCresc.filter(a=>a.recAtual>0||a.recPrev>0).length===0 ? <p className="text-center text-gray-400 text-sm py-8">Sem dados comparativos</p> : (
                <div className="divide-y divide-gray-50">
                  {rankPorCresc.filter(a=>a.recAtual>0||a.recPrev>0).map((a,i)=>(
                    <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${i===0&&a.crescimento>0?'bg-green-50':''}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i===0?'bg-green-500 text-white':'bg-gray-100 text-gray-500'}`}>{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                        <p className="text-xs text-gray-400">{fmt(a.recPrev)} → {fmt(a.recAtual)}</p>
                      </div>
                      <span className={`text-sm font-bold ${a.crescimento>=0?'text-green-600':'text-red-600'}`}>
                        {a.crescimento>=0?'+':''}{a.crescimento.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA BACKUPS ══ */}
        {aba==='backups' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">Histórico de backups</p>
              <p className="text-xs text-gray-400 mt-0.5">Backup automático diário às 18h (horário de Brasília)</p>
            </div>
            {backups.length===0 ? <p className="text-center text-gray-400 text-sm py-10">Nenhum backup gerado ainda.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Arquivo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Tipo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Registros</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Gerado em</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {backups.map(b=>(
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{b.nome_arquivo}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${b.tipo==='automatico'?'bg-green-50 text-green-700':'bg-blue-50 text-blue-700'}`}>{b.tipo}</span></td>
                      <td className="px-4 py-3 text-gray-600">{b.total_registros??'—'}</td>
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
              <button onClick={()=>setEditR(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{erroModal}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Data</label><input className="input" type="date" value={editRForm.data} onChange={e=>setEditRForm(f=>({...f,data:e.target.value}))}/></div>
                <div><label className="label">Volume (R$)</label><input className="input" type="text" inputMode="numeric" value={editRForm.volume} onChange={e=>setEditRForm(f=>({...f,volume:fmtMoedaInput(e.target.value)}))}/></div>
                <div><label className="label">Instituição</label><select className="input" value={editRForm.instituicao_id} onChange={e=>setEditRForm(f=>({...f,instituicao_id:e.target.value}))}><option value="">Selecione...</option>{instituicoes.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
                <div><label className="label">Produto</label><select className="input" value={editRForm.produto_id} onChange={e=>setEditRForm(f=>({...f,produto_id:e.target.value}))}><option value="">Selecione...</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                <div><label className="label">Cliente — nome</label><input className="input" type="text" value={editRForm.cliente_nome} onChange={e=>setEditRForm(f=>({...f,cliente_nome:e.target.value}))}/></div>
                <div><label className="label">Cliente — conta</label><input className="input" type="text" value={editRForm.cliente_conta} onChange={e=>setEditRForm(f=>({...f,cliente_conta:e.target.value}))}/></div>
                <div><label className="label">ROA (%)</label><div className="relative"><input className="input pr-8" type="text" value={editRForm.roa} onChange={e=>setEditRForm(f=>({...f,roa:e.target.value}))}/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
                <div><label className="label">Receita {editRForm.roa&&<span className="text-xs text-utah-500 font-normal">via ROA</span>}</label><input className="input bg-gray-50" type="text" inputMode="numeric" value={editRForm.receita} onChange={e=>setEditRForm(f=>({...f,receita:fmtMoedaInput(e.target.value)}))}/></div>
              </div>
              <div><label className="label">Observação</label><textarea className="input" rows={2} value={editRForm.observacao} onChange={e=>setEditRForm(f=>({...f,observacao:e.target.value}))}/></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={()=>setEditR(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarR} disabled={salvando} className="btn-primary">{salvando?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edição captação */}
      {editC && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar captação — {editC.profiles?.nome}</h2>
              <button onClick={()=>setEditC(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {erroModal && <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">{erroModal}</div>}
              <div><label className="label">Data</label><input className="input" type="date" value={editCForm.data} onChange={e=>setEditCForm(f=>({...f,data:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Captação Bruta (R$)</label><input className="input" type="text" inputMode="numeric" value={editCForm.captacao_bruta} onChange={e=>setEditCForm(f=>({...f,captacao_bruta:fmtMoedaInput(e.target.value)}))}/></div>
                <div><label className="label">Saídas (R$)</label><input className="input" type="text" inputMode="numeric" value={editCForm.saidas} onChange={e=>setEditCForm(f=>({...f,saidas:fmtMoedaInput(e.target.value)}))}/></div>
              </div>
              <div><label className="label">Observação</label><textarea className="input" rows={2} value={editCForm.observacao} onChange={e=>setEditCForm(f=>({...f,observacao:e.target.value}))}/></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={()=>setEditC(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarC} disabled={salvando} className="btn-primary">{salvando?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
