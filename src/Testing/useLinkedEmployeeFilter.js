import { useCallback, useMemo, useState } from 'react'

// The Employee ID / Employee Name pickers used by the Test Results table, shared
// so the Practical Results and Certificates tables follow exactly the same rule.
//
// Both are multi-selects (a comma-joined string, '' = no filter). Picking an ID
// fills in its name and picking a name fills in its ID, so the two always
// describe the same people. A row is shown when it matches EITHER picker —
// they are alternatives, not a narrowing AND — and everything is shown when
// neither has a pick.

const toList = (v) => (v || '').split(',').map(s => s.trim()).filter(Boolean)
const text = (v) => (v ?? '').toString().trim()

/** True when `row` (with ID / NAME) is covered by the picked IDs or names. */
export const employeeMatches = (row, idValue, nameValue) => {
  const ids = toList(idValue).map(v => v.toLowerCase())
  const names = toList(nameValue).map(v => v.toLowerCase())
  if (!ids.length && !names.length) return true
  return ids.includes(text(row.ID).toLowerCase()) || names.includes(text(row.NAME).toLowerCase())
}

export function useLinkedEmployeeFilter(results, initialId = '') {
  const [filterEmpId, setFilterEmpId] = useState(initialId)
  const [pickedName, setPickedName] = useState('')

  // Unique employees, taken from the results themselves (by ID).
  const pairs = useMemo(() => {
    const idToName = new Map()
    for (const r of results || []) {
      const id = text(r?.ID)
      if (id && !idToName.has(id)) idToName.set(id, text(r?.NAME))
    }
    return [...idToName.entries()].sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0]))
  }, [results])

  const idOptions = useMemo(() => pairs.map(([id]) => id), [pairs])
  const nameOptions = useMemo(
    () => [...new Set(pairs.map(([, name]) => name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [pairs])
  // Two employees sharing a display name resolve to the first one seen — an
  // unavoidable ambiguity of matching by name at all.
  const idToName = useMemo(() => new Map(pairs.filter(([, n]) => n)), [pairs])
  const nameToId = useMemo(() => {
    const m = new Map()
    for (const [id, name] of pairs) if (name && !m.has(name)) m.set(name, id)
    return m
  }, [pairs])

  const onIdChange = useCallback((val) => {
    setFilterEmpId(val)
    setPickedName([...new Set(toList(val).map(id => idToName.get(id)).filter(Boolean))].join(', '))
  }, [idToName])
  const onNameChange = useCallback((val) => {
    setPickedName(val)
    setFilterEmpId([...new Set(toList(val).map(name => nameToId.get(name)).filter(Boolean))].join(', '))
  }, [nameToId])
  const clearEmployee = useCallback(() => { setFilterEmpId(''); setPickedName('') }, [])

  // The name that goes with the picked ID(s). Normally set the moment an ID is
  // picked; but a filter that STARTS with an ID (opened from a link) has no name
  // yet — and its employees may not even be loaded — so the name is worked out
  // from the ID here, which keeps the two pickers in step from the first render.
  const filterEmpName = pickedName || [...new Set(toList(filterEmpId).map(id => idToName.get(id)).filter(Boolean))].join(', ')

  return { filterEmpId, filterEmpName, idOptions, nameOptions, onIdChange, onNameChange, clearEmployee }
}
