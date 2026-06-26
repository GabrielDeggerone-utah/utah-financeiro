import ExcelJS from 'exceljs'

export type ReceitaRow = {
  data: string
  assessor: string
  cliente: string
  produto: string
  instituicao: string
  volume: number
  receita: number | null
  observacao: string | null
}

export async function gerarExcel(receitas: ReceitaRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Utah Invest'
  wb.created = new Date()

  const ws = wb.addWorksheet('Produção')

  ws.columns = [
    { header: 'Data',        key: 'data',        width: 14 },
    { header: 'Assessor',    key: 'assessor',     width: 22 },
    { header: 'Cliente',     key: 'cliente',      width: 28 },
    { header: 'Produto',     key: 'produto',      width: 18 },
    { header: 'Instituição', key: 'instituicao',  width: 22 },
    { header: 'Volume (R$)', key: 'volume',       width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Receita (R$)',key: 'receita',      width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Observação',  key: 'observacao',   width: 36 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF534AB7' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  receitas.forEach((r) => ws.addRow(r))

  ws.autoFilter = { from: 'A1', to: 'H1' }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.eachCell((cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
    })
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4FE' } }
      })
    }
  })

  const totalRow = ws.addRow({
    data: 'TOTAL',
    assessor: '',
    cliente: '',
    produto: '',
    instituicao: '',
    volume: receitas.reduce((s, r) => s + (r.volume || 0), 0),
    receita: receitas.reduce((s, r) => s + (r.receita || 0), 0),
    observacao: '',
  })
  totalRow.font = { bold: true }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEDFE' } }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
