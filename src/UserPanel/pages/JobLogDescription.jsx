import React, { useEffect, useMemo, useRef, useState } from 'react'

const initialEntries = [
  {
    id: 'job-001',
    sNo: 1,
    client: 'OGDCL',
    workOrder: 'WO-4482',
    inspectorName: 'Ali Raza',
    inspectorTeam: 'Ali Raza, Farhan Khan',
    reference: 'PTIS-REF-102',
    location: 'Islamabad Yard',
    natureOfJob: 'Visual inspection',
    startDate: '2026-04-26',
    endDate: '2026-04-27',
    entryDate: '2026-04-28',
    vehicleUsed: 'Hilux-12',
    days: '2',
    calculatedDays: '2',
    manPower: '6',
    manHours: '48',
    drivenKm: '120',
    jmps: '2',
    tra: 'Yes',
    equipCL: 'Done',
    vLog: 'Updated',
    tbt: 'Completed',
    status: 'Closed',
    completionDate: '2026-04-29',
    rept: 'Yes',
    exp: 'Pending',
    iso: 'Yes',
    accounts: 'Pending',
    it: 'Done',
    submissionDate: '2026-04-29',
    source: 'Islamabad',
    remark: 'Completed and submitted to client.'
  },
  {
    id: 'job-002',
    sNo: 2,
    client: 'KPOGCL',
    workOrder: 'WO-4631',
    inspectorName: 'Sana Iqbal',
    inspectorTeam: 'Sana Iqbal',
    reference: 'PTIS-REF-118',
    location: 'Karachi Yard',
    natureOfJob: 'NDT inspection',
    startDate: '2026-04-30',
    endDate: '2026-05-01',
    entryDate: '2026-05-02',
    vehicleUsed: 'Coaster-04',
    days: '2',
    calculatedDays: '2',
    manPower: '4',
    manHours: '32',
    drivenKm: '95',
    jmps: '1',
    tra: 'No',
    equipCL: 'Pending',
    vLog: 'Pending',
    tbt: 'Scheduled',
    status: 'In Progress',
    completionDate: '',
    rept: 'Pending',
    exp: 'Pending',
    iso: 'No',
    accounts: 'Pending',
    it: 'Pending',
    submissionDate: '2026-05-03',
    source: 'Karachi',
    remark: 'Awaiting final approvals.'
  }
]

const emptyEntry = {
  sNo: '',
  client: '',
  workOrder: '',
  inspectorName: '',
  inspectorTeam: '',
  reference: '',
  location: '',
  natureOfJob: '',
  startDate: '',
  endDate: '',
  entryDate: '',
  vehicleUsed: '',
  days: '',
  calculatedDays: '',
  manPower: '',
  manHours: '',
  drivenKm: '',
  jmps: '',
  tra: '',
  equipCL: '',
  vLog: '',
  tbt: '',
  status: '',
  completionDate: '',
  rept: '',
  exp: '',
  iso: '',
  accounts: '',
  it: '',
  submissionDate: '',
  source: '',
  remark: ''
}

const PAGE_SIZE = 100

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
  const diffMs = end.getTime() - start.getTime()
  if (diffMs < 0) return ''
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1
}

function JobLogDescription() {
  const [entries, setEntries] = useState(initialEntries)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [modalState, setModalState] = useState(emptyEntry)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [openSelect, setOpenSelect] = useState(null)
  const selectClickIntent = useRef({ status: false, source: false })

  const nextSerial = useMemo(() => {
    const maxSerial = entries.reduce(
      (acc, entry) => Math.max(acc, Number(entry.sNo) || 0),
      0
    )
    return maxSerial + 1
  }, [entries])

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set(
      entries.map((entry) => entry.status).filter((value) => value)
    )
    return Array.from(uniqueStatuses)
  }, [entries])

  const sourceOptions = useMemo(() => {
    const uniqueSources = new Set(
      entries.map((entry) => entry.source).filter((value) => value)
    )
    return Array.from(uniqueSources)
  }, [entries])

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false
      }

      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        entry.sNo ? String(entry.sNo) : '',
        entry.entryDate,
        entry.client,
        entry.workOrder,
        entry.inspectorName,
        entry.inspectorTeam,
        entry.reference,
        entry.location,
        entry.natureOfJob,
        entry.startDate,
        entry.endDate,
        entry.vehicleUsed,
        entry.status,
        entry.source,
        entry.completionDate,
        entry.submissionDate,
        entry.remark
      ]
        .filter((value) => value)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [entries, searchTerm, statusFilter, sourceFilter])

  const totalEntries = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safePage - 1) * PAGE_SIZE

  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(pageStartIndex, pageStartIndex + PAGE_SIZE)
  }, [filteredEntries, pageStartIndex])

  const pageStart = totalEntries === 0 ? 0 : pageStartIndex + 1
  const pageEnd = totalEntries === 0 ? 0 : pageStartIndex + paginatedEntries.length

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sourceFilter])

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage)
    }
  }, [currentPage, safePage])

  const handleSelectOpen = (name) => {
    setOpenSelect(name)
  }

  const handleSelectClose = (name) => {
    selectClickIntent.current[name] = false
    setOpenSelect((prev) => (prev === name ? null : prev))
  }

  const handleSelectPointerDown = (name) => {
    if (openSelect === name) {
      selectClickIntent.current[name] = true
      return
    }

    selectClickIntent.current[name] = false
    handleSelectOpen(name)
  }

  const handleSelectClick = (name) => {
    if (selectClickIntent.current[name]) {
      handleSelectClose(name)
    }
  }

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value)
    handleSelectClose('status')
  }

  const handleSourceChange = (event) => {
    setSourceFilter(event.target.value)
    handleSelectClose('source')
  }

  const openAddModal = () => {
    setModalMode('add')
    setEditingId(null)
    setModalState({ ...emptyEntry, sNo: nextSerial })
    setIsModalOpen(true)
  }

  const openEditModal = (entry) => {
    setModalMode('edit')
    setEditingId(entry.id)
    setModalState({
      sNo: entry.sNo || '',
      client: entry.client || '',
      workOrder: entry.workOrder || '',
      inspectorName: entry.inspectorName || '',
      inspectorTeam: entry.inspectorTeam || '',
      reference: entry.reference || '',
      location: entry.location || '',
      natureOfJob: entry.natureOfJob || '',
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      entryDate: entry.entryDate || '',
      vehicleUsed: entry.vehicleUsed || '',
      days: entry.days || '',
      calculatedDays: entry.calculatedDays || '',
      manPower: entry.manPower || '',
      manHours: entry.manHours || '',
      drivenKm: entry.drivenKm || '',
      jmps: entry.jmps || '',
      tra: entry.tra || '',
      equipCL: entry.equipCL || '',
      vLog: entry.vLog || '',
      tbt: entry.tbt || '',
      status: entry.status || '',
      completionDate: entry.completionDate || '',
      rept: entry.rept || '',
      exp: entry.exp || '',
      iso: entry.iso || '',
      accounts: entry.accounts || '',
      it: entry.it || '',
      submissionDate: entry.submissionDate || '',
      source: entry.source || '',
      remark: entry.remark || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalMode('add')
    setEditingId(null)
    setModalState(emptyEntry)
  }

  const handleModalChange = (field, value) => {
    setModalState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const computedDays = calculateDays(modalState.startDate, modalState.endDate)
    const resolvedDays = computedDays ? String(computedDays) : ''

    if (modalMode === 'add') {
      const newEntry = {
        id: `job-${Date.now()}`,
        ...modalState,
        days: resolvedDays,
        sNo: nextSerial
      }
      setEntries((prev) => [newEntry, ...prev])
    } else if (editingId) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                ...modalState,
                days: resolvedDays
              }
            : entry
        )
      )
    }

    closeModal()
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const renderValue = (value) => (value ? value : '-')

  return (
    <div className="all-records-page job-log-page">
      <div className="all-records-header">
        <div className="all-records-header-content">
          <p className="eyebrow">Inspection Log Description</p>
          <h2>Job Log Description</h2>
          <p className="panel-subtitle">Track inspection activities and field job entries.</p>
        </div>
        <div className="all-records-header-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={openAddModal}
          >
            Add Entry
          </button>
        </div>
      </div>

      <div className="all-records-filters">
        <input
          type="text"
          className="all-records-search"
          placeholder="Search by client, work order, inspector, reference, location..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className={`all-records-filter-select${openSelect === 'status' ? ' select-open' : ''}`}
          value={statusFilter}
          onChange={handleStatusChange}
          onPointerDown={() => handleSelectPointerDown('status')}
          onClick={() => handleSelectClick('status')}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown') {
              handleSelectOpen('status')
            } else if (event.key === 'Escape') {
              handleSelectClose('status')
            }
          }}
          onBlur={() => handleSelectClose('status')}
        >
          <option value="all">All Status</option>
          {statusOptions.map((status) => (
            <option key={`status-${status}`} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          className={`all-records-filter-select${openSelect === 'source' ? ' select-open' : ''}`}
          value={sourceFilter}
          onChange={handleSourceChange}
          onPointerDown={() => handleSelectPointerDown('source')}
          onClick={() => handleSelectClick('source')}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown') {
              handleSelectOpen('source')
            } else if (event.key === 'Escape') {
              handleSelectClose('source')
            }
          }}
          onBlur={() => handleSelectClose('source')}
        >
          <option value="all">All Regions</option>
          {sourceOptions.map((source) => (
            <option key={`source-${source}`} value={source}>
              {source}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ghost-btn all-records-filter-btn"
          onClick={() => {
            setSearchTerm('')
            setStatusFilter('all')
            setSourceFilter('all')
          }}
        >
          Clear Filters
        </button>
      </div>

      <div className="job-log-table-shell">
        <div className="all-records-table-container">
          <div className="all-records-table-scroll">
            <table className="all-records-table">
              <thead>
                <tr>
                  <th>S#</th>
                  <th>Entry Date</th>
                  <th>Client</th>
                  <th>Work Order</th>
                  <th>Inspector Name</th>
                  <th>Inspector Team</th>
                  <th>Reference</th>
                  <th>Location</th>
                  <th>Nature of Job</th>
                  <th>Job Start</th>
                  <th>Job End</th>
                  <th>Vehicle Plate No.</th>
                  <th>Days</th>
                  <th>Calculated Days</th>
                  <th>Man Power</th>
                  <th>Man Hrs</th>
                  <th>Driven Km</th>
                  <th>JMPs</th>
                  <th>TRA</th>
                  <th>Equip C/L</th>
                  <th>V. Log</th>
                  <th>TBT</th>
                  <th>Status</th>
                  <th>Completion Date</th>
                  <th>REPT</th>
                  <th>EXP</th>
                  <th>ISO</th>
                  <th>Accounts</th>
                  <th>I.T</th>
                  <th>Submission Date</th>
                  <th>Region</th>
                  <th>Remark</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={33}
                      className="all-records-empty"
                    >
                      No job log entries found for this view.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry, index) => {
                    const displaySerial = totalEntries - (pageStartIndex + index)
                    return (
                      <tr key={entry.id}>
                        <td className="all-records-cell-id">{displaySerial}</td>
                      <td className="all-records-cell-date">{renderValue(entry.entryDate)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.client)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.workOrder)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.inspectorName)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.inspectorTeam)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.reference)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.location)}</td>
                      <td className="all-records-cell-description">{renderValue(entry.natureOfJob)}</td>
                      <td className="all-records-cell-date">{renderValue(entry.startDate)}</td>
                      <td className="all-records-cell-date">{renderValue(entry.endDate)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.vehicleUsed)}</td>
                      <td className="all-records-cell-text">
                        {renderValue(entry.days)}
                      </td>
                      <td className="all-records-cell-text">
                        {renderValue(entry.calculatedDays)}
                      </td>
                      <td className="all-records-cell-text">{renderValue(entry.manPower)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.manHours)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.drivenKm)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.jmps)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.tra)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.equipCL)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.vLog)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.tbt)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.status)}</td>
                      <td className="all-records-cell-date">{renderValue(entry.completionDate)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.rept)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.exp)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.iso)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.accounts)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.it)}</td>
                      <td className="all-records-cell-date">{renderValue(entry.submissionDate)}</td>
                      <td className="all-records-cell-text">{renderValue(entry.source)}</td>
                      <td className="all-records-cell-remarks">{renderValue(entry.remark)}</td>
                      <td className="all-records-cell-actions">
                        <div className="all-records-actions">
                          <button
                            type="button"
                            className="action-btn edit small"
                            onClick={() => openEditModal(entry)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="action-btn delete small"
                            onClick={() => handleDelete(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="all-records-pagination">
          <div className="all-records-pagination-info">
            <span>Showing {pageStart}-{pageEnd} of {totalEntries}</span>
            <span className="all-records-pagination-limit">Rows per page: {PAGE_SIZE}</span>
          </div>
          <div className="all-records-pagination-controls">
            <button
              type="button"
              className="ghost-btn pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={totalEntries === 0 || safePage === 1}
            >
              Previous
            </button>
            <span className="all-records-pagination-page">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="ghost-btn pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={totalEntries === 0 || safePage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'Add Job Log Entry' : 'Edit Job Log Entry'}</h2>
              <button className="close-modal-btn" onClick={closeModal}>
                X
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  <span>S#</span>
                  <input type="text" value={modalState.sNo} readOnly />
                </label>
                <label>
                  <span>Entry Date *</span>
                  <input
                    type="date"
                    value={modalState.entryDate}
                    onChange={(e) => handleModalChange('entryDate', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Client *</span>
                  <input
                    type="text"
                    value={modalState.client}
                    onChange={(e) => handleModalChange('client', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Work Order *</span>
                  <input
                    type="text"
                    value={modalState.workOrder}
                    onChange={(e) => handleModalChange('workOrder', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Inspector Name *</span>
                  <input
                    type="text"
                    value={modalState.inspectorName}
                    onChange={(e) => handleModalChange('inspectorName', e.target.value)}
                    placeholder="Name"
                    required
                  />
                </label>
                <label>
                  <span>Inspector Team</span>
                  <input
                    type="text"
                    value={modalState.inspectorTeam}
                    onChange={(e) => handleModalChange('inspectorTeam', e.target.value)}
                    placeholder="Name1, Name2"
                  />
                </label>
                <label>
                  <span>Reference</span>
                  <input
                    type="text"
                    value={modalState.reference}
                    onChange={(e) => handleModalChange('reference', e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Location *</span>
                  <input
                    type="text"
                    value={modalState.location}
                    onChange={(e) => handleModalChange('location', e.target.value)}
                    placeholder="Islamabad Yard"
                    required
                  />
                </label>
                <label>
                  <span>Nature of Job *</span>
                  <input
                    type="text"
                    value={modalState.natureOfJob}
                    onChange={(e) => handleModalChange('natureOfJob', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Job Start</span>
                  <input
                    type="date"
                    value={modalState.startDate}
                    onChange={(e) => handleModalChange('startDate', e.target.value)}
                  />
                </label>
                <label>
                  <span>Job End</span>
                  <input
                    type="date"
                    value={modalState.endDate}
                    onChange={(e) => handleModalChange('endDate', e.target.value)}
                  />
                </label>
                <label>
                  <span>Vehicle Plate No.</span>
                  <input
                    type="text"
                    value={modalState.vehicleUsed}
                    onChange={(e) => handleModalChange('vehicleUsed', e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Days</span>
                  <input
                    type="number"
                    min="0"
                    value={calculateDays(modalState.startDate, modalState.endDate)}
                    readOnly
                  />
                </label>
                <label>
                  <span>Calculated Days</span>
                  <input
                    type="number"
                    min="0"
                    value={modalState.calculatedDays}
                    onChange={(e) => handleModalChange('calculatedDays', e.target.value)}
                  />
                </label>
                <label>
                  <span>Man Power</span>
                  <input
                    type="number"
                    min="0"
                    value={modalState.manPower}
                    onChange={(e) => handleModalChange('manPower', e.target.value)}
                  />
                </label>
                <label>
                  <span>Man Hrs</span>
                  <input
                    type="number"
                    min="0"
                    value={modalState.manHours}
                    onChange={(e) => handleModalChange('manHours', e.target.value)}
                  />
                </label>
                <label>
                  <span>Driven Km</span>
                  <input
                    type="number"
                    min="0"
                    value={modalState.drivenKm}
                    onChange={(e) => handleModalChange('drivenKm', e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>JMPs</span>
                  <input
                    type="text"
                    value={modalState.jmps}
                    onChange={(e) => handleModalChange('jmps', e.target.value)}
                  />
                </label>
                <label>
                  <span>TRA</span>
                  <input
                    type="text"
                    value={modalState.tra}
                    onChange={(e) => handleModalChange('tra', e.target.value)}
                  />
                </label>
                <label>
                  <span>Equip C/L</span>
                  <input
                    type="text"
                    value={modalState.equipCL}
                    onChange={(e) => handleModalChange('equipCL', e.target.value)}
                  />
                </label>
                <label>
                  <span>V. Log</span>
                  <input
                    type="text"
                    value={modalState.vLog}
                    onChange={(e) => handleModalChange('vLog', e.target.value)}
                  />
                </label>
                <label>
                  <span>TBT</span>
                  <input
                    type="text"
                    value={modalState.tbt}
                    onChange={(e) => handleModalChange('tbt', e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Status</span>
                  <input
                    type="text"
                    value={modalState.status}
                    onChange={(e) => handleModalChange('status', e.target.value)}
                  />
                </label>
                <label>
                  <span>Completion Date</span>
                  <input
                    type="date"
                    value={modalState.completionDate}
                    onChange={(e) => handleModalChange('completionDate', e.target.value)}
                  />
                </label>
                <label>
                  <span>REPT</span>
                  <input
                    type="text"
                    value={modalState.rept}
                    onChange={(e) => handleModalChange('rept', e.target.value)}
                  />
                </label>
                <label>
                  <span>EXP</span>
                  <input
                    type="text"
                    value={modalState.exp}
                    onChange={(e) => handleModalChange('exp', e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>ISO</span>
                  <input
                    type="text"
                    value={modalState.iso}
                    onChange={(e) => handleModalChange('iso', e.target.value)}
                  />
                </label>
                <label>
                  <span>Accounts</span>
                  <input
                    type="text"
                    value={modalState.accounts}
                    onChange={(e) => handleModalChange('accounts', e.target.value)}
                  />
                </label>
                <label>
                  <span>I.T</span>
                  <input
                    type="text"
                    value={modalState.it}
                    onChange={(e) => handleModalChange('it', e.target.value)}
                  />
                </label>
                <label>
                  <span>Submission Date</span>
                  <input
                    type="date"
                    value={modalState.submissionDate}
                    onChange={(e) => handleModalChange('submissionDate', e.target.value)}
                  />
                </label>
                <label>
                  <span>Region *</span>
                  <input
                    type="text"
                    value={modalState.source}
                    onChange={(e) => handleModalChange('source', e.target.value)}
                    placeholder="Islamabad / Karachi / Other"
                    required
                  />
                </label>
              </div>

              <label>
                <span>Remark</span>
                <textarea
                  rows="3"
                  value={modalState.remark}
                  onChange={(e) => handleModalChange('remark', e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {modalMode === 'add' ? 'Add Entry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobLogDescription
