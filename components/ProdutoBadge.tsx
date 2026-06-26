export default function ProdutoBadge({ nome }: { nome: string }) {
  const lower = nome?.toLowerCase() ?? ''
  if (lower.includes('renda fixa'))     return <span className="badge-rf">{nome}</span>
  if (lower.includes('renda variável') || lower.includes('renda variavel')) return <span className="badge-rv">{nome}</span>
  if (lower.includes('câmbio') || lower.includes('cambio')) return <span className="badge-cam">{nome}</span>
  if (lower.includes('consórcio') || lower.includes('consorcio')) return <span className="badge-cons">{nome}</span>
  if (lower.includes('seguro'))         return <span className="badge-seg">{nome}</span>
  return <span className="badge-out">{nome}</span>
}
