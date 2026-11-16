import React, { useMemo } from 'react'
import SearchableSelect from '../components/SearchableSelect'
import MultiSelect from '../components/MultiSelect'

// The standards of a course: one standard (one test) or several (a test for each).
// Used by Add Course and by Edit Course so both pick standards the same way — a searchable
// dropdown for one, and the same tag picker the Job Log uses for Inspector Team for several.
//
// `singleId` is one standard id; `multiIds` is a list of ids (both as strings).
export default function StandardPicker({
  standards, mode, onModeChange, singleId, onSingleChange, multiIds, onMultiChange, selectStyle,
}) {
  // MultiSelect keeps its picks as one comma-separated string of names, so a name with a comma
  // in it would split in two; the label shown for a standard has any comma swapped for a space.
  const labelOf = (s) => `${s.standard_name} (${s.short_name})`.replace(/,/g, ' ')
  const byLabel = useMemo(() => new Map((standards || []).map(s => [labelOf(s), String(s.id)])), [standards])
  const byId = useMemo(() => new Map((standards || []).map(s => [String(s.id), labelOf(s)])), [standards])
  const options = useMemo(() => (standards || []).map(s => ({ name: labelOf(s), label: labelOf(s) })), [standards])

  const multiValue = (multiIds || []).map(id => byId.get(String(id))).filter(Boolean).join(',')
  const handleMulti = (csv) => {
    const names = String(csv || '').split(',').map(x => x.trim()).filter(Boolean)
    onMultiChange(names.map(n => byLabel.get(n)).filter(Boolean))
  }

  const radio = { display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', fontWeight: 500 }

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, margin: '4px 0 10px' }}>
        <label style={radio}>
          <input type="radio" name="standardMode" checked={mode === 'single'} onChange={() => onModeChange('single')} />
          Single standard
        </label>
        <label style={radio}>
          <input type="radio" name="standardMode" checked={mode === 'multiple'} onChange={() => onModeChange('multiple')} />
          Multiple standards (a test for each)
        </label>
      </div>

      {mode === 'single' ? (
        <SearchableSelect
          value={singleId}
          onChange={onSingleChange}
          options={(standards || []).map(s => ({ value: s.id, label: `${s.standard_name} (${s.short_name})` }))}
          emptyOptionLabel="Select standard"
          placeholder="Type to search…"
          style={selectStyle}
        />
      ) : (
        <>
          <MultiSelect
            value={multiValue}
            options={options}
            onChange={handleMulti}
            placeholder="Select standards…"
            searchPlaceholder="Search standard…"
          />
          <span style={{ display: 'block', fontSize: 12.5, color: '#7a7a8c', marginTop: 6 }}>
            Selected: {(multiIds || []).length} — the user will take {(multiIds || []).length} test(s) after the course.
          </span>
        </>
      )}
    </div>
  )
}
