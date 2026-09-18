import React, { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config/api'
import { Database, Download, RefreshCw, CheckCircle2, AlertTriangle, HardDriveDownload, Clock } from 'lucide-react'
import { showToast } from '../../components/Toast'

const BASE = `${API_BASE_URL}/api/backups`

const fmtBytes = (n) => {
  const b = Number(n) || 0
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}
const fmtDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Stat({ Icon, label, value, color = '#1f1f27' }) {
  return (
    <div style={{ flex: 1, minWidth: 160, background: '#fff', border: '1px solid #ececf0', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a8a95', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icon size={15} /> {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function JLRBackups() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [runningNow, setRunningNow] = useState(false)

  // `manual` distinguishes a click on the Refresh button from the initial
  // load and the 30s auto-refresh — those two should never pop a toast, or
  // the page would notify on its own every 30 seconds.
  const fetchData = useCallback(async (manual = false) => {
    try {
      const res = await fetch(BASE)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
      if (manual) showToast('Refreshed.', 'success')
    } catch (err) {
      setError(err.message)
      if (manual) showToast(`Could not refresh: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh so the status/list stay current without a manual reload.
  useEffect(() => {
    const id = setInterval(fetchData, 30000)
    return () => clearInterval(id)
  }, [fetchData])

  const handleRefreshClick = () => fetchData(true)

  const backupNow = async () => {
    setRunningNow(true)
    try {
      const res = await fetch(`${BASE}/run`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Backup failed')
      await fetchData()
      showToast('Backup completed.', 'success')
    } catch (err) {
      showToast(`Backup failed: ${err.message}`, 'error')
    } finally {
      setRunningNow(false)
    }
  }

  const handleDownloadClick = (fileName) => showToast(`Downloading ${fileName}…`, 'info')

  const status = data?.status || {}
  const config = data?.config || status.config || {}
  const files = data?.files || []
  const busy = runningNow || status.running

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#d7263d' }}>
            PTIS · Job Log
          </div>
          <h1 style={{ margin: '2px 0 4px', fontSize: 26, color: '#1f1f27', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={24} color="#d7263d" /> Database Backups
          </h1>
          <p style={{ margin: 0, color: '#7a7a8c', fontSize: 14 }}>
            Automatic backups of the whole database (Job Log included). Download any of the last {config.retention ?? 14}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleRefreshClick}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 28, border: '1px solid #dcdce3', background: '#fff', color: '#2a2a32', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#d7263d'
              e.currentTarget.style.color = '#d7263d'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#dcdce3'
              e.currentTarget.style.color = '#2a2a32'
              e.currentTarget.style.transform = 'translateY(0)'
            }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" onClick={backupNow} disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 28, border: 'none', background: busy ? '#e79aa5' : '#d7263d', color: '#fff', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 6px 16px rgba(215,38,61,0.25)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
            onMouseEnter={e => {
              if (busy) return
              e.currentTarget.style.boxShadow = '0 16px 36px rgba(215, 38, 61, 0.25)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              if (busy) return
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(215,38,61,0.25)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}>
            <HardDriveDownload size={17} /> {busy ? 'Backing up…' : 'Backup Now'}
          </button>
        </div>
      </div>

      {/* Status cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '20px 0' }}>
        <Stat
          Icon={status.lastError ? AlertTriangle : CheckCircle2}
          label="Last backup"
          color={status.lastError ? '#c0392b' : '#1d814c'}
          value={status.lastError ? `Failed — ${status.lastError}` : (status.lastRunAt ? fmtDate(status.lastRunAt) : 'Not run yet')}
        />
        <Stat Icon={Clock} label="Next (approx)" value={fmtDate(status.nextRunEstimate)} />
        <Stat Icon={RefreshCw} label="Schedule" value={`Every ${config.intervalHours ?? 24}h · keep ${config.retention ?? 14}`} />
        <Stat Icon={Database} label="Last result"
          value={status.lastResult ? `${status.lastResult.tables} tables · ${Number(status.lastResult.rows).toLocaleString()} rows · ${fmtBytes(status.lastResult.sizeBytes)}` : '—'} />
      </div>

      {/* Files */}
      <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f3', fontWeight: 700, color: '#1f1f27' }}>
          Available backups ({files.length})
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9a9aaa' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#c0392b' }}>
            {error}
            <div><button className="primary-btn" onClick={fetchData} style={{ marginTop: 12 }}>Try again</button></div>
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9a9aaa' }}>
            No backups yet. The first one runs ~1 minute after the server starts, or click “Backup Now”.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f8fb', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px' }}>#</th>
                  <th style={{ padding: '12px 18px' }}>File</th>
                  <th style={{ padding: '12px 18px' }}>Created</th>
                  <th style={{ padding: '12px 18px' }}>Size</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={f.name} style={{ borderTop: '1px solid #f0f0f3' }}>
                    <td style={{ padding: '11px 18px', color: '#9a9aaa' }}>{i + 1}</td>
                    <td style={{ padding: '11px 18px', color: '#2b2b38', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {f.name}{i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#1d814c', fontWeight: 700 }}>· latest</span>}
                    </td>
                    <td style={{ padding: '11px 18px', color: '#54546a', whiteSpace: 'nowrap' }}>{fmtDate(f.createdAt)}</td>
                    <td style={{ padding: '11px 18px', color: '#54546a', whiteSpace: 'nowrap' }}>{fmtBytes(f.sizeBytes)}</td>
                    <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                      <a href={`${BASE}/${encodeURIComponent(f.name)}/download`}
                        onClick={() => handleDownloadClick(f.name)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, background: '#fdf2f3', color: '#d7263d', border: '1px solid #ffd1d8', fontWeight: 600, fontSize: 13, textDecoration: 'none', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#ffe3e6'
                          e.currentTarget.style.borderColor = '#d7263d'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#fdf2f3'
                          e.currentTarget.style.borderColor = '#ffd1d8'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}>
                        <Download size={14} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ marginTop: 14, fontSize: 12.5, color: '#9a9aaa' }}>
        Restore a backup: <code>gzip -dc {config.dbName || 'ptis_erp_db'}_YYYYMMDD-HHmmss.sql.gz | mysql -u root -p {config.dbName || 'ptis_erp_db'}</code>
      </p>
    </div>
  )
}

export default JLRBackups
