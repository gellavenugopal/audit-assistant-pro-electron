import * as XLSX from 'xlsx'

// Clean strings: removes Tally boxes, tabs, and standardizes spacing
export const deepClean = (val) => {
  if (val === undefined || val === null) return ''
  let s = String(val)
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, '') 
  s = s.replace(/[\u00A0\t\r\n]/g, ' ')
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export const processAccountingData = (workbook) => {
  const s1Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })
  const s2Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { header: 1 })
  const s3Raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { header: 1 })

  // 1. Build Mapping Master (Sheet 1)
  // Logic: Column C (Parent) -> Column D (Category)
  const mappingMap = {}
  s1Raw.forEach(row => {
    const parentKey = deepClean(row[2])
    if (parentKey) mappingMap[parentKey] = row[3]
  })

  // 2. Build Tally Hierarchy (Sheet 3)
  // Logic: Find the cell containing "Primary", take the cell to its left
  const hierarchyMap = {}
  s3Raw.forEach(row => {
    if (!row || row.length < 2) return
    const ledgerName = deepClean(row[0]) // $Name is usually Col A
    const cleanRow = row.map(cell => deepClean(cell))
    const pIdx = cleanRow.findIndex(cell => cell.includes('primary'))
    if (pIdx > 0) {
      hierarchyMap[ledgerName] = cleanRow[pIdx - 1]
    }
  })

  // 3. Find Start of Trial Balance (Sheet 2)
  let headerRowIdx = s2Raw.findIndex(row => 
    row.some(cell => {
      const c = deepClean(cell)
      return c.includes('ledger') || c.includes('particulars') || c.includes('name') || c.includes('1-apr')
    })
  )
  if (headerRowIdx === -1) headerRowIdx = 0

  const headers = s2Raw[headerRowIdx] || []
  const dataRows = s2Raw.slice(headerRowIdx + 1)

  // Auto-detect Ledger and Amount columns
  const ledgerIdx = headers.findIndex(h => {
    const s = deepClean(h)
    return s.includes('ledger') || s.includes('particulars') || s.includes('name')
  }) || 0

  const amtIdx = headers.findIndex(h => {
    const s = deepClean(h)
    return s.includes('amount') || s.includes('closing') || s.includes('31-mar') || s.includes('1-apr')
  })

  // 4. Transform Data
  const results = dataRows.map(row => {
    if (!row || row.length === 0 || !row[ledgerIdx]) return null
    
    const rawName = row[ledgerIdx]
    const cleanedName = deepClean(rawName)
    const parent = hierarchyMap[cleanedName]
    const category = parent ? (mappingMap[parent] || "NOT MAPPED") : "NOT MAPPED"

    // Numeric parsing
    let rawAmt = row[amtIdx !== -1 ? amtIdx : (ledgerIdx + 1)]
    let cleanAmt = 0
    if (rawAmt !== undefined) {
      cleanAmt = parseFloat(String(rawAmt).replace(/,/g, '').replace(/[^-0-9.]/g, '')) || 0
    }

    // Build row object preserving original data
    const obj = {}
    headers.forEach((h, i) => { obj[h || `Col_${i}`] = row[i] })
    obj['Mapped Category'] = category
    obj['AmountValue'] = cleanAmt
    obj['Logic Trace'] = parent ? `Parent: ${parent}` : "Hierarchy Match Failed"
    
    return obj
  }).filter(r => r !== null)

  console.log("Processed Rows:", results.length)
  return results
}

export const summarizeData = (processedData) => {
  const summary = {}
  processedData.forEach(row => {
    const key = deepClean(row['Mapped Category'])
    summary[key] = (summary[key] || 0) + (row['AmountValue'] || 0)
  })
  return summary
}