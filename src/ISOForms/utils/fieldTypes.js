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
]

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
