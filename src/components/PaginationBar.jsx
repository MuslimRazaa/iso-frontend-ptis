import React, { useId, useState } from 'react'

// Same pagination rule/UI as JLR's Job Entries table everywhere else in the
// app now uses it: "Showing X–Y of Z", Previous/Next, "Page X of Y", plus a
// "Go to" box — typing a page number and jumping straight there, without
// stepping through every page in between, is missing from a plain
// Previous/Next control.
function PaginationBar({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'entries' }) {
  const gotoId = useId()
  const [gotoValue, setGotoValue] = useState('')

  if (totalItems === 0 && totalPages <= 1) return null

  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems)

  // A stale typed value from a previous page shouldn't linger once the page
  // actually changes — cleared right in the handler that changes it, not in
  // an effect reacting to `page` after the fact.
  const changePage = (n) => { onPageChange(n); setGotoValue('') }

  const handleGoto = (e) => {
    e.preventDefault()
    const n = parseInt(gotoValue, 10)
    if (Number.isNaN(n)) return
    changePage(Math.min(totalPages, Math.max(1, n)))
  }

  return (
    <div className="all-records-pagination">
      <div className="all-records-pagination-info">
        <span>Showing <strong>{pageStart}</strong>–<strong>{pageEnd}</strong> of <strong>{totalItems}</strong> {itemLabel}</span>
        {pageSize ? <span className="all-records-pagination-limit">Rows per page: {pageSize}</span> : null}
      </div>
      <div className="all-records-pagination-controls">
        <button
          type="button" className="ghost-btn pagination-btn"
          onClick={() => changePage(Math.max(1, page - 1))}
          disabled={totalItems === 0 || page === 1}
        >← Previous</button>
        <span className="all-records-pagination-page">
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
        <button
          type="button" className="ghost-btn pagination-btn"
          onClick={() => changePage(Math.min(totalPages, page + 1))}
          disabled={totalItems === 0 || page === totalPages}
        >Next →</button>

        <form className="all-records-pagination-goto" onSubmit={handleGoto}>
          <label htmlFor={gotoId}>Go to</label>
          <input
            id={gotoId}
            type="number"
            min={1}
            max={totalPages}
            value={gotoValue}
            onChange={(e) => setGotoValue(e.target.value)}
            placeholder={String(page)}
            disabled={totalItems === 0 || totalPages <= 1}
          />
          <button
            type="submit" className="ghost-btn pagination-btn"
            disabled={totalItems === 0 || totalPages <= 1 || !gotoValue}
          >Go</button>
        </form>
      </div>
    </div>
  )
}

export default PaginationBar
