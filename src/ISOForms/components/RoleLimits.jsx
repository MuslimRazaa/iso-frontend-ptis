import React from 'react'
import MultiSelect from '../../components/MultiSelect'
import EmployeeMultiPicker from './EmployeeMultiPicker'

// The "who can be picked" box of an approval role, used in the template builder.
// Nothing picked = every employee. Departments and named people add up: someone
// shows if they are in a listed department OR listed by name. `onPatch` receives the
// part of the role that changed.
function RoleLimits({ role, departments, employees, onPatch }) {
  return (
    <div style={{ background: '#f7f7fa', border: '1px solid #ececf0', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#595966' }}>
        Who can be picked for this role when filling the form
        <span style={{ fontWeight: 500, color: '#7a7a8c' }}> — optional, leave both empty to allow everyone</span>
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: '#7a7a8c', marginBottom: 4 }}>Only people from these departments</div>
        <MultiSelect
          value={(role.allowedDepartments || []).join(',')}
          onChange={v => onPatch({ allowedDepartments: v ? v.split(',').map(x => x.trim()).filter(Boolean) : undefined })}
          options={departments.map(d => d.name)}
          placeholder="Any department"
          searchPlaceholder="Search departments…"
        />
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: '#7a7a8c', marginBottom: 4 }}>And / or only these people</div>
        <EmployeeMultiPicker
          value={role.allowedEmployeeIds || []}
          onChange={ids => onPatch({ allowedEmployeeIds: ids.length ? ids : undefined })}
          employees={employees}
          style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'text', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}

export default RoleLimits
