// True when a required field has no usable value yet — shared by FormFiller
// (requester fields) and FormDetail (approver fields filled at decision time).
export const isFieldEmpty = (field, value) => {
  if (field.type === 'checkbox-group') return !Array.isArray(value) || value.length === 0
  if (field.type === 'checkbox') return false
  // A signature is stamped on submit / on decision, not typed, so it is never
  // the thing standing between someone and sending the form.
  if (field.type === 'signature') return false
  return value === undefined || value === null || value === ''
}
