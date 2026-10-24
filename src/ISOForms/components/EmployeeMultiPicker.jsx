import React from 'react'
import SearchableSelect from '../../components/SearchableSelect'

// Picks any number of employees: each pick becomes a removable chip, and the
// employees already picked drop out of the list. `value` is an array of employee ids
// (as strings); `onChange` gets the new array.
const empName = (emp) => emp.full_name || emp.name

function EmployeeMultiPicker({ value, onChange, employees = [], style, emptyLabel }) {
  const picked = (Array.isArray(value) ? value : []).map(String)
  const nameOf = (id) => {
    const emp = employees.find(e => String(e.id) === id)
    return emp ? empName(emp) : id
  }

  return (
    <div>
      {picked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {picked.map(id => (
            <span key={id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fdf2f3', color: '#d7263d',
              border: '1px solid #ffd1d8', borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 600,
            }}>
              {nameOf(id)}
              <span onClick={() => onChange(picked.filter(p => p !== id))} title="Remove" style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>×</span>
            </span>
          ))}
        </div>
      )}
      <SearchableSelect
        value=""
        onChange={(id) => { if (id && !picked.includes(String(id))) onChange([...picked, String(id)]) }}
        options={employees.filter(emp => !picked.includes(String(emp.id))).map(emp => ({
          value: String(emp.id),
          label: `${empName(emp)}${(emp.department_name || emp.department) ? ` — ${emp.department_name || emp.department}` : ''}`,
        }))}
        emptyOptionLabel={emptyLabel || (picked.length ? 'Add another employee…' : 'Select employees…')}
        placeholder="Type to search…"
        style={style}
      />
    </div>
  )
}

export default EmployeeMultiPicker
