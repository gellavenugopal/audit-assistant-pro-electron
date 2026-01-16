import { useState } from 'react'
import * as XLSX from 'xlsx'
import { processAccountingData, summarizeData, deepClean } from './utils/processor'

function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [data, setData] = useState([])
  const [currentYearData, setCurrentYearData] = useState({})
  const [previousYearData, setPreviousYearData] = useState({})
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [scale, setScale] = useState('1') // 1, 100, 1000, 100000, 10000000
  const [companyName, setCompanyName] = useState('ABC PRIVATE LIMITED')
  const [cin, setCin] = useState('UXXXXXMH2023PTCXXX588')
  const [periodYear, setPeriodYear] = useState('') // Will be set during upload
  const [uploadPeriod, setUploadPeriod] = useState('current') // 'current' or 'previous'

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const period = document.getElementById('period-select').value
    const year = document.getElementById('year-input').value
    
    if (!year) {
      alert('Please enter the financial year (e.g., 2024)')
      return
    }
    
    setLoading(true)
    setUploadPeriod(period)
    setPeriodYear(year)
    
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const processed = processAccountingData(wb)
        if (processed.length === 0) throw new Error("No ledgers found. Check Sheet 2 column headers.")
        
        setData(processed)
        const summarized = summarizeData(processed)
        setSummary(summarized)
        
        // Store in appropriate year data
        if (period === 'current') {
          setCurrentYearData(summarized)
        } else {
          setPreviousYearData(summarized)
        }
        
        setActiveTab('results')
      } catch (err) {
        alert(err.message)
      }
      setLoading(false)
    }
    reader.readAsBinaryString(file)
  }

  const bsStructure = [
    // EQUITY AND LIABILITIES
    { label: 'EQUITY AND LIABILITIES', h: true },
    
    // (1) Shareholders' funds
    { label: "(1) Shareholders' funds", sub: true },
    { label: '(a) Share capital', key: "Share capital" },
    { label: '(b) Reserves and surplus', key: "Reserves and surplus" },
    { label: '(c) Money received against share warrants', key: "Money received against share warrants" },
    { label: "Uncategorised Shareholder's Funds", key: "Uncategorised Shareholder's Funds", un: true },
    
    // (2) Share application money pending allotment
    { label: '(2) Share application money pending allotment', key: "Share application money pending allotment" },
    
    // (3) Non-Current liabilities
    { label: '(3) Non-Current liabilities', sub: true },
    { label: '(a) Long-term borrowings', key: "Long-term borrowings" },
    { label: '(b) Deferred tax liabilities (Net)', key: "Deferred tax liabilities (Net)" },
    { label: '(c) Other long term liabilities', key: "Other long term liabilities" },
    { label: '(d) Long-term provisions', key: "Long-term provisions" },
    { label: 'Uncategorised Non-Current liabilities', key: "Uncategorised Non-Current liabilities", un: true },
    
    // (4) Current liabilities
    { label: '(4) Current liabilities', sub: true },
    { label: '(a) Short-term borrowings', key: "Short-term borrowings" },
    { label: '(b) Trade payables', key: "Trade payables" },
    { label: '(A) Micro and Small Enterprises', key: "(A) Micro and Small Enterprises" },
    { label: '(B) Others', key: "(B) Others" },
    { label: '(c) Other current liabilities', key: "Other current liabilities" },
    { label: '(d) Short-term provisions', key: "Short-term provisions" },
    { label: 'Uncategorised Current liabilities', key: "Uncategorised Current liabilities", un: true },
    
    { label: 'TOTAL', h: true },
    
    // ASSETS
    { label: 'ASSETS', h: true },
    
    // (1) Non-Current Assets
    { label: '(1) Non-Current Assets', sub: true },
    { label: '(a) Property, Plant & Equipment and Intangible Assets', sub: true },
    { label: '(i) Property, Plant & Equipment', key: "(i) Property, Plant & Equipment" },
    { label: '(ii) Intangible assets', key: "(ii) Intangible assets" },
    { label: '(iii) Capital work-in-Progress', key: "(iii) Capital work-in-Progress" },
    { label: '(iv) Intangible assets under development', key: "(iv) Intangible assets under development" },
    { label: '(b) Non-current investments', key: "Non-current investments" },
    { label: '(c) Deferred tax assets (Net)', key: "Deferred tax assets (Net)" },
    { label: '(d) Long-term loans and advances', key: "Long-term loans and advances" },
    { label: '(e) Other non-current Assets', key: "Other non-current Assets" },
    { label: 'Uncategorised Non-Current Assets', key: "Uncategorised Non-Current Assets", un: true },
    
    // (2) Current assets
    { label: '(2) Current assets', sub: true },
    { label: '(a) Current investments', key: "Current investments" },
    { label: '(b) Inventories', key: "Inventories" },
    { label: '(c) Trade receivables', key: "Trade receivables" },
    { label: '(d) Cash and bank balances', key: "Cash and bank balances" },
    { label: '(e) Short-term loans and advances', key: "Short-term loans and advances" },
    { label: '(f) Other current assets', key: "Other current assets" },
    { label: 'Uncategorised Current assets', key: "Uncategorised Current assets", un: true },
    { label: 'Suspense', key: "Suspense" },
  ]

  const plStructure = [
    // INCOME
    { label: 'INCOME', h: true },
    
    // (1) Revenue from operations
    { label: '(1) Revenue from operations', sub: true },
    { label: '(a) Sale of products', key: "Sale of products" },
    { label: '(b) Sale of services', key: "Sale of services" },
    { label: '(c) Other operating revenues', key: "Other operating revenues" },
    { label: 'Uncategorised Revenue from operations', key: "Uncategorised Revenue from operations", un: true },
    
    // (2) Other Income
    { label: '(2) Other Income', key: "Other income" },
    
    { label: 'Total Revenue', sub: true },
    
    // EXPENSES
    { label: 'EXPENSES', h: true },
    
    // (3) Cost of materials consumed
    { label: '(3) Cost of materials consumed', key: "Cost of materials consumed" },
    
    // (4) Purchases of Stock-in-Trade
    { label: '(4) Purchases of Stock-in-Trade', key: "Purchases of Stock-in-Trade" },
    
    // (5) Changes in inventories
    { label: '(5) Changes in inventories of finished goods, work-in-progress and Stock-in-Trade', key: "Changes in inventories of finished goods, work-in-progress and Stock-in-Trade" },
    
    // (6) Employee benefit expense
    { label: '(6) Employee benefit expense', sub: true },
    { label: '(a) Salaries and wages', key: "Salaries and wages" },
    { label: '(b) Contribution to provident and other funds', key: "Contribution to provident and other funds" },
    { label: '(c) Staff welfare expenses', key: "Staff welfare expenses" },
    { label: 'Uncategorised Employee benefit expense', key: "Uncategorised Employee benefit expense", un: true },
    
    // (7) Finance costs
    { label: '(7) Finance costs', sub: true },
    { label: '(a) Interest expense', key: "Interest expense" },
    { label: '(b) Other borrowing costs', key: "Other borrowing costs" },
    { label: 'Uncategorised Finance costs', key: "Uncategorised Finance costs", un: true },
    
    // (8) Depreciation and amortization expense
    { label: '(8) Depreciation and amortization expense', key: "Depreciation and amortization expense" },
    
    // (9) Other expenses
    { label: '(9) Other expenses', sub: true },
    { label: '(a) Power and fuel', key: "Power and fuel" },
    { label: '(b) Rent', key: "Rent" },
    { label: '(c) Repairs and maintenance', key: "Repairs and maintenance" },
    { label: '(d) Insurance', key: "Insurance" },
    { label: '(e) Rates and taxes', key: "Rates and taxes" },
    { label: '(f) Legal and professional charges', key: "Legal and professional charges" },
    { label: '(g) Travelling and conveyance', key: "Travelling and conveyance" },
    { label: '(h) Communication costs', key: "Communication costs" },
    { label: '(i) Advertisement and sales promotion', key: "Advertisement and sales promotion" },
    { label: '(j) Bad debts written off', key: "Bad debts written off" },
    { label: '(k) Provision for doubtful debts', key: "Provision for doubtful debts" },
    { label: '(l) Miscellaneous expenses', key: "Miscellaneous expenses" },
    { label: 'Uncategorised Other expenses', key: "Uncategorised Other expenses", un: true },
    
    { label: 'Total Expenses', sub: true },
    
    // (10) Prior period items
    { label: '(10) Prior period items', key: "Prior period items" },
    
    { label: 'Profit/(Loss) before tax', sub: true },
    
    // (11) Tax expense
    { label: '(11) Tax expense', sub: true },
    { label: '(a) Current tax', key: "Current tax" },
    { label: '(b) Deferred tax', key: "Deferred tax" },
    
    { label: 'Profit/(Loss) for the period', sub: true },
  ]

  const formatValue = (val) => {
    if (!val) return ''
    const scaleFactor = parseFloat(scale)
    return (val / scaleFactor).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
  }

  const getColumnHeader = (isPL, isCurrent) => {
    if (isPL) {
      if (isCurrent) {
        const currentYr = parseInt(periodYear)
        return `Figures for the year ended 31st March, ${(currentYr-1).toString().slice(-2)}-${currentYr.toString().slice(-2)}`
      } else {
        const currentYr = parseInt(periodYear)
        return `Figures for the year ended 31st March, ${(currentYr-2).toString().slice(-2)}-${(currentYr-1).toString().slice(-2)}`
      }
    } else {
      return isCurrent ? 'Figures as at the end of Current Reporting Period' : 'Figures as at the end of Previous Reporting Period'
    }
  }

  const renderStatement = (structure, isPL = false) => {
    const scaleLabels = {
      '1': 'Rupees',
      '100': 'Hundreds',
      '1000': 'Thousands',
      '100000': 'Lakhs',
      '10000000': 'Crores'
    }
    
    // Calculate totals
    let currentTotal = 0
    let previousTotal = 0
    
    return (
      <div className="report-container">
        <div className="report-header">
          <h2>{companyName}</h2>
          <p>CIN: {cin}</p>
          <h3>{isPL ? 'Statement of Profit & Loss' : 'Balance Sheet as at 31 March ' + periodYear}</h3>
          <p className="scale-label">(Amount in ` {scaleLabels[scale]})</p>
        </div>
        
        <table className="report-table">
          <thead>
            <tr className="table-header">
              <th style={{textAlign: 'left', paddingLeft: '10px'}}>Particulars</th>
              <th style={{width: '100px'}}>Note No.</th>
              <th style={{width: '150px'}}>{getColumnHeader(isPL, true)}</th>
              <th style={{width: '150px'}}>{getColumnHeader(isPL, false)}</th>
            </tr>
          </thead>
          <tbody>
            {structure.map((row, i) => {
              const currentVal = currentYearData[deepClean(row.key)] || 0
              const previousVal = previousYearData[deepClean(row.key)] || 0
              const isAlert = row.un && (Math.abs(currentVal) > 0 || Math.abs(previousVal) > 0)
              
              // Add to total if it's TOTAL row
              if (row.label === 'TOTAL' && !isPL) {
                structure.forEach(r => {
                  if (!r.h && !r.sub && r.key) {
                    currentTotal += (currentYearData[deepClean(r.key)] || 0)
                    previousTotal += (previousYearData[deepClean(r.key)] || 0)
                  }
                })
              }
              
              // Determine indentation based on label content
              let indent = '45px'
              if (row.h) indent = '10px'
              else if (row.sub && row.label.match(/^\([a-z]\)/)) indent = '50px'
              else if (row.sub) indent = '25px'
              else if (row.label.match(/^\([A-Z]\)/)) indent = '85px'
              else if (row.label.match(/^\(i+v?\)/)) indent = '75px'
              
              // Show total values for TOTAL row
              const showTotal = row.label === 'TOTAL'
              
              return (
                <tr key={i} className={`${row.h?'rh':''} ${row.sub?'rs':''} ${isAlert?'ra':''} ${showTotal?'total-row':''}`}>
                  <td style={{paddingLeft: indent}} className={isAlert ? 'alert-text' : ''}>{row.label}</td>
                  <td align="center">{(!row.h && !row.sub && !row.un) ? (row.note || '') : ''}</td>
                  <td align="right" className={isAlert ? 'alert-text' : ''}>
                    {showTotal ? formatValue(currentTotal) : ((!row.h && !row.sub) ? formatValue(currentVal) : '')}
                  </td>
                  <td align="right" className={isAlert ? 'alert-text' : ''}>
                    {showTotal ? formatValue(previousTotal) : ((!row.h && !row.sub) ? formatValue(previousVal) : '')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <h2 className="brand">SRM Ledger Pro</h2>
        <button onClick={() => setActiveTab('upload')} className={activeTab === 'upload' ? 'active' : ''}>📁 Import</button>
        <button disabled={!data.length} onClick={() => setActiveTab('results')} className={activeTab === 'results' ? 'active' : ''}>📊 Results</button>
        <button disabled={!data.length} onClick={() => setActiveTab('summary')} className={activeTab === 'summary' ? 'active' : ''}>📋 Summary</button>
        <button disabled={!data.length} onClick={() => setActiveTab('bs')} className={activeTab === 'bs' ? 'active' : ''}>🏛️ Balance Sheet</button>
        <button disabled={!data.length} onClick={() => setActiveTab('pl')} className={activeTab === 'pl' ? 'active' : ''}>📈 P & L Account</button>
      </div>

      <div className="main">
        {loading && <div className="toast">Processing...</div>}
        
        {/* Company Settings Bar */}
        {activeTab !== 'upload' && (
          <div style={{marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '200px'}}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px'}}>Company Name:</label>
              <input 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)}
                style={{padding: '8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1'}}
              />
            </div>
            <div style={{flex: 1, minWidth: '200px'}}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px'}}>CIN:</label>
              <input 
                value={cin} 
                onChange={(e) => setCin(e.target.value)}
                placeholder="UXXXXXMH2023PTCXXX588"
                style={{padding: '8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1'}}
              />
            </div>
            {(activeTab === 'bs' || activeTab === 'pl' || activeTab === 'summary') && (
              <div style={{marginLeft: 'auto'}}>
                <label style={{fontWeight: 'bold', marginRight: '10px'}}>Scale:</label>
                <select 
                  value={scale} 
                  onChange={(e) => setScale(e.target.value)}
                  style={{padding: '8px 15px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
                >
                  <option value="1">Rupees</option>
                  <option value="100">Hundreds</option>
                  <option value="1000">Thousands</option>
                  <option value="100000">Lakhs</option>
                  <option value="10000000">Crores</option>
                </select>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="up-zone">
            <div className="up-box">
              <h2 style={{color: '#1e293b'}}>Upload Tally Excel</h2>
              <p style={{color: '#64748b', marginBottom: '20px'}}>Required: Mapping | Trial Balance | Hierarchy</p>
              
              <div style={{marginBottom: '15px'}}>
                <label style={{color: '#1e293b', fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
                  Period Type:
                </label>
                <select id="period-select" style={{padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                  <option value="current">Current Year</option>
                  <option value="previous">Previous Year</option>
                </select>
              </div>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{color: '#1e293b', fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
                  Financial Year (e.g., 2024):
                </label>
                <input 
                  type="text" 
                  id="year-input" 
                  placeholder="2024" 
                  style={{padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1'}}
                />
              </div>
              
              <input type="file" id="f" hidden onChange={handleFileUpload} />
              <button 
                onClick={() => document.getElementById('f').click()}
                style={{
                  padding: '12px 30px', 
                  background: '#38bdf8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                Select File
              </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="res-view">
            <input className="search" placeholder="Search Ledgers..." onChange={e => setSearch(e.target.value)} />
            <div className="scroll-area">
              <table className="data-table">
                <thead><tr>{Object.keys(data[0]||{}).map(k => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>{data.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())).slice(0,100).map((r,i) => (
                  <tr key={i} style={{background: r['Mapped Category']==='NOT MAPPED'?'#fff1f2':'white'}}>
                    {Object.values(r).map((v,j) => <td key={j}>{v}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="summary-view">
            <h2 style={{marginBottom: '20px', color: '#1e293b'}}>Mapped Category Summary</h2>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div style={{background: 'white', padding: '20px', borderRadius: '8px'}}>
                <h3 style={{color: '#1e293b', marginBottom: '15px'}}>Current Year Data</h3>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(currentYearData).length > 0 ? (
                      Object.entries(currentYearData).sort().map(([key, val]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td align="right">{formatValue(val)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="2" style={{textAlign: 'center', color: '#64748b', padding: '20px'}}>No current year data uploaded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{background: 'white', padding: '20px', borderRadius: '8px'}}>
                <h3 style={{color: '#1e293b', marginBottom: '15px'}}>Previous Year Data</h3>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(previousYearData).length > 0 ? (
                      Object.entries(previousYearData).sort().map(([key, val]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td align="right">{formatValue(val)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="2" style={{textAlign: 'center', color: '#64748b', padding: '20px'}}>No previous year data uploaded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {Object.keys(currentYearData).length === 0 && Object.keys(previousYearData).length === 0 && (
              <div style={{marginTop: '30px', padding: '30px', background: '#fff1f2', borderRadius: '8px', textAlign: 'center'}}>
                <p style={{color: '#e11d48', fontSize: '16px', fontWeight: 'bold'}}>
                  No data available. Please upload Trial Balance files for Current Year and/or Previous Year.
                </p>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'bs' || activeTab === 'pl') && renderStatement(activeTab === 'bs' ? bsStructure : plStructure, activeTab === 'pl')}
      </div>

      <style>{`
        .app-shell { display: flex; height: 100vh; background: #f8fafc; font-family: sans-serif; }
        .sidebar { width: 230px; background: #1e293b; padding: 25px; color: white; }
        .brand { color: #38bdf8; margin-bottom: 40px; }
        .sidebar button { width: 100%; padding: 12px; margin-bottom: 10px; border: none; border-radius: 6px; cursor: pointer; background: #334155; color: white; text-align: left; transition: 0.2s; }
        .sidebar button.active { background: #38bdf8; color: #1e293b; font-weight: bold; }
        .main { flex: 1; padding: 40px; overflow: auto; }
        .up-zone { height: 80%; display: flex; justify-content: center; align-items: center; }
        .up-box { border: 3px dashed #cbd5e1; padding: 80px; border-radius: 15px; text-align: center; background: white; }
        .report-header { text-align: center; margin-bottom: 25px; background: white; padding: 20px; border-radius: 8px; }
        .report-header h2 { margin: 0; font-size: 1.5em; color: #1e293b; }
        .report-header h3 { margin: 10px 0 5px 0; font-size: 1.2em; color: #1e293b; }
        .report-header p { margin: 5px 0; color: #64748b; }
        .scale-label { font-weight: bold; color: #1e293b; }
        .report-table { width: 100%; background: white; border-collapse: collapse; border: 2px solid #1e293b; }
        .report-table th { padding: 12px; border: 1px solid #1e293b; background: #f1f5f9; font-weight: bold; color: #1e293b; }
        .report-table td { padding: 12px; border: 1px solid #e2e8f0; color: #1e293b; }
        .table-header { background: #f1f5f9; border: 2px solid #1e293b; }
        .rh { background: #f1f5f9; font-weight: bold; font-size: 1.1em; }
        .rs { font-weight: bold; background: #f8fafc; }
        .ra { background: #fff1f2; }
        .ra td { border: 1px solid #e11d48; }
        .alert-text { color: #e11d48 !important; font-size: 0.85em !important; }
        .data-table { width: 100%; font-size: 12px; border-collapse: collapse; background: white; }
        .data-table th { background: #1e293b; color: white; padding: 10px; position: sticky; top: 0; }
        .data-table td { border: 1px solid #e2e8f0; padding: 8px; color: #334155; }
        .search { padding: 12px; width: 350px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
        .toast { position: fixed; top: 20px; right: 20px; background: #38bdf8; color: white; padding: 10px 20px; border-radius: 6px; }
        .res-view { height: 100%; display: flex; flex-direction: column; }
        .scroll-area { flex: 1; overflow: auto; }
        .summary-view { height: 100%; overflow: auto; }
        .summary-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .summary-table th { background: #1e293b; color: white; padding: 10px; text-align: left; }
        .summary-table td { border: 1px solid #e2e8f0; padding: 8px; }
        .total-row { background: #e0f2fe !important; font-weight: bold; font-size: 1.1em; }
        .total-row td { border-top: 2px solid #1e293b !important; border-bottom: 2px solid #1e293b !important; }
      `}</style>
    </div>
  )
}

export default App
