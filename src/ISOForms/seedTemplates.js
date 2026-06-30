// Bump whenever the shape of SEED_TEMPLATES below changes, so ensureSeeded()
// replaces a stale copy already sitting in a browser's localStorage instead
// of leaving it untouched forever.
export const SEED_VERSION = 3

// Real PTIS form (FM-001-04), modeled as a template so the module has
// something to click through before the backend exists.
export const SEED_TEMPLATES = [
  {
    id: 'seed-fm-001-04',
    name: 'Document Change Request Form',
    description: 'FM-001-04 — request a change, then ISMR/Change Team review impact and decide.',
    created_by_name: 'Seeded demo template',
    fields: [
      { id: 'f_dcr_requested_by',   label: 'Change Requested By',                       type: 'employee',       required: true,  owner: 'requester', options: '' },
      { id: 'f_dcr_designation',    label: 'Requestor Designation',                     type: 'text',           required: true,  owner: 'requester', options: '' },
      { id: 'f_dcr_date',           label: 'Date of Request',                           type: 'date',           required: true,  owner: 'requester', options: '' },
      { id: 'f_dcr_change_type',    label: 'Change Type',                               type: 'checkbox-group', required: true,  owner: 'requester', options: 'Hardware, Software, Network, Application, H&S Protocols, Operational Procedure, Environment, Other' },
      { id: 'f_dcr_change_type_other', label: 'Specify Details (if Other selected)',    type: 'text',           required: false, owner: 'requester', options: '' },
      { id: 'f_dcr_instances',      label: 'Instances of Change',                       type: 'checkbox-group', required: true,  owner: 'requester', options: 'Scheduled, Unscheduled, Emergency, Other' },
      { id: 'f_dcr_instances_other', label: 'Specify Details (if Other selected)',      type: 'text',           required: false, owner: 'requester', options: '' },
      { id: 'f_dcr_priority',       label: 'Priority of Change Implementation',         type: 'dropdown',       required: true,  owner: 'requester', options: 'Urgent, Normal, Low' },
      { id: 'f_dcr_resources',      label: 'Required Resources',                        type: 'textarea',       required: false, owner: 'requester', options: '' },
      { id: 'f_dcr_description',    label: 'Description of Change',                     type: 'textarea',       required: true,  owner: 'requester', options: '' },

      { id: 'f_dcr_impact_level',   label: 'Impact Level',                              type: 'dropdown',       required: true,  owner: 'approver', options: 'Significant, Negligible, No Impact, NA' },
      { id: 'f_dcr_affected_area',  label: 'Affected Area',                             type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_dcr_impact_other',   label: 'Other (Description)',                       type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_dcr_closed_by',      label: 'Closed By',                                 type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_dcr_closing_date',   label: 'Date of Closing',                           type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_dcr_closing_status', label: 'Status',                                    type: 'dropdown',       required: false, owner: 'approver', options: 'Successfully Completed, CAR(s) Generated, Terminated, Postponed' },
    ],
  },
]

// Used in the "Related Employee" picker when /api/employees has no backend
// to answer it yet, so the dropdown isn't empty.
export const SEED_EMPLOYEES = [
  { id: 'seed-emp-ismr',    full_name: 'Demo ISMR / Change Team Lead', department_name: 'Quality' },
  { id: 'seed-emp-manager', full_name: 'Demo Department Manager',     department_name: 'Operations' },
]
