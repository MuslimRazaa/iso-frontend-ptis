import React, { useMemo } from 'react'
import { layoutFields } from '../utils/formLayout'

// A template's fields laid out the way its printed form shows them: page by page,
// fields in the rows they share on the PDF, and the form's own tables (registers,
// checklists, equipment lists) drawn as tables — column headings once on top, a
// line per printed row. Fields without a place on the PDF follow in a plain grid.
//
// Used both where a form is filled and where a submitted one is read, so the two
// look alike. The page decides how a field is drawn:
//   renderField(field) — a field in a row of its own, with its label;
//   renderCell(field)  — the same field inside a table cell, no label, kept small.

const FIELD_COLUMNS = 'repeat(auto-fit, minmax(340px, 1fr))'

const th = {
  padding: '7px 8px', background: '#f4f4f7', borderBottom: '1px solid #d9d9e0', borderRight: '1px solid #e6e6ec',
  fontSize: 11.5, fontWeight: 700, color: '#44444f', textAlign: 'left', verticalAlign: 'bottom', whiteSpace: 'normal',
}
const td = { padding: '4px 6px', borderBottom: '1px solid #ececf0', borderRight: '1px solid #f0f0f4', verticalAlign: 'middle' }

const isWideField = (field) =>
  field.type === 'textarea' || field.type === 'checkbox-group' || field.type === 'radio' || field.type === 'employee-multi'

function FormLayoutView({ fields, renderField, renderCell }) {
  const layout = useMemo(() => layoutFields(fields), [fields])

  return (
    <>
      {layout.pages.map(({ page, blocks }) => (
        <article key={page} className="panel" style={{ padding: 'clamp(12px, 1.5vw, 20px)', marginBottom: 20, border: '1px solid #d9d9e0', background: '#fff', boxShadow: '0 2px 10px rgba(20,20,28,0.06)' }}>
          {layout.pages.length > 1 && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9aa8', marginBottom: 14 }}>
              Page {page + 1}
            </div>
          )}
          {blocks.map((block, i) => block.type === 'tables' ? (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '12px 0', borderTop: i ? '1px solid #efeff3' : 'none', alignItems: 'flex-start' }}>
              {block.tables.map((table, ti) => (
                <div key={ti} style={{ flex: `${table.columns.length + 1} 1 360px`, minWidth: 0, overflowX: 'auto', border: '1px solid #d9d9e0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={th}></th>
                        {table.columns.map((c, ci) => <th key={ci} style={th}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r, ri) => (
                        <tr key={ri}>
                          <td style={{ ...td, fontWeight: 600, color: '#33333f', minWidth: 40, maxWidth: 280, background: '#fafafc' }}>{r.name}</td>
                          {r.cells.map((f, ci) => (
                            <td key={ci} style={{ ...td, minWidth: f && isWideField(f) ? 180 : 90 }}>
                              {f && renderCell(f)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', padding: '12px 0', borderTop: i ? '1px solid #efeff3' : 'none' }}>
              {block.items.map(({ field, weight }) => (
                <div key={field.id} style={{ flex: `${weight} 1 ${isWideField(field) ? 280 : 150}px`, minWidth: 0 }}>
                  {renderField(field)}
                </div>
              ))}
            </div>
          ))}
        </article>
      ))}
      {layout.loose.length > 0 && (
        <article className="panel" style={{ padding: 24, marginBottom: 20, display: 'grid', gridTemplateColumns: FIELD_COLUMNS, gap: '18px 24px', alignItems: 'start' }}>
          {layout.loose.map(field => (
            <div key={field.id} style={isWideField(field) ? { gridColumn: '1 / -1' } : undefined}>{renderField(field)}</div>
          ))}
        </article>
      )}
    </>
  )
}

export default FormLayoutView
