// The field vocabulary shared by the template builder and the position editor.
//
// Both screens can now create fields, so the type/owner lists and the blank
// record live here — a type added in one place must never be missing from the
// other, which is exactly what two private copies would drift into.

export const FIELD_TYPES = [
  { value: 'text',           label: 'Short Text' },
  { value: 'textarea',       label: 'Long Text' },
  { value: 'number',         label: 'Number' },
  { value: 'date',           label: 'Date' },
  { value: 'dropdown',       label: 'Dropdown (single choice)' },
  { value: 'checkbox',       label: 'Checkbox (yes/no)' },
  { value: 'checkbox-group', label: 'Checkbox Group (multi-select)' },
  { value: 'employee',       label: 'Employee Picker (from Employee Management)' },
  // Placed where the form asks for a signature. Nobody types it: the app stamps
  // the name of whoever completed that part of the form and the time they did,
  // which is what a controlled document needs in place of a written signature.
  { value: 'signature',      label: 'Signature (name + date, filled automatically)' },
]

// Legacy two-role fallback — still the default `owner` on a blank field, and
// still what ownerOptionsFor() returns for a template that hasn't defined any
// named approval roles yet.
export const OWNERS = [
  { value: 'requester', label: 'Requester — filled when submitting' },
  { value: 'approver',  label: 'Approver — filled at approve/reject time' },
]

/** Types whose comma-separated `options` string is meaningful. */
export const hasOptions = (type) => type === 'dropdown' || type === 'checkbox-group'

export const blankField = () => ({
  id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  label: '',
  type: 'text',
  required: false,
  options: '',
  owner: 'requester',
})

// A named approver role a template can require sign-off from (e.g. "HOD QA").
// `key` is what a field's `owner` and an entry's approvals are matched by;
// `label` is what people see.
export const blankApprovalRole = () => ({
  key: `role_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  label: '',
})

// The "Filled by" choices for a template's fields: the requester, plus one
// entry per named approval role — or the single legacy "Approver" role when
// the template hasn't defined any, so old templates keep working unmodified.
export const ownerOptionsFor = (approvalRoles) => {
  const roles = Array.isArray(approvalRoles) && approvalRoles.length
    ? approvalRoles
    : [{ key: 'approver', label: 'Approver' }]
  return [
    OWNERS[0],
    ...roles.map(r => ({ value: r.key, label: `${r.label || r.key} — filled at approve/reject time` })),
  ]
}
