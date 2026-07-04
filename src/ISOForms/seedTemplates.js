// Bump whenever the shape of SEED_TEMPLATES below changes, so ensureSeeded()
// replaces a stale copy already sitting in a browser's localStorage instead
// of leaving it untouched forever.
export const SEED_VERSION = 4

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

  // ── Corrective Action Request Form (FM-002-01) ────────────────────────────
  {
    id: 'seed-fm-002-01',
    name: 'Corrective Action Request Form',
    description: 'FM-002-01 — report a non-conformance, HOD analyses root cause, QHSE follows up.',
    created_by_name: 'Seeded demo template',
    fields: [
      // ── Section A — Reporting Personnel (Requester) ──
      { id: 'f_car_reporter_name',   label: 'Name of Reporting Personnel',        type: 'employee',       required: true,  owner: 'requester', options: '' },
      { id: 'f_car_reporter_dept',   label: 'Department of Reporting Personnel',  type: 'text',           required: true,  owner: 'requester', options: '' },
      { id: 'f_car_reporting_date',  label: 'Reporting Date',                     type: 'date',           required: true,  owner: 'requester', options: '' },
      { id: 'f_car_concerned_dept',  label: 'Concerned Department',               type: 'text',           required: true,  owner: 'requester', options: '' },
      { id: 'f_car_concerned_person',label: 'Name of Concerned Dept. Personnel',  type: 'employee',       required: true,  owner: 'requester', options: '' },
      { id: 'f_car_nc_type',         label: 'Type of Non-Conformance',            type: 'checkbox-group', required: true,  owner: 'requester', options: 'Service/Product Non-Conformance, Internal Audit, Customer Complaint, Regulatory Finding, System/Process Non-Conformance, Vendor/Sub Contracting, Others' },
      { id: 'f_car_nc_type_other',   label: 'Others — Specify',                   type: 'text',           required: false, owner: 'requester', options: '' },
      { id: 'f_car_nc_details',      label: 'Details of Non-Conformity',          type: 'textarea',       required: true,  owner: 'requester', options: '' },

      // ── Section A — Approver (QMS Team Head) ──
      { id: 'f_car_qms_approval',    label: 'Approval from QMS TEAM HEAD',        type: 'dropdown',       required: false, owner: 'approver', options: 'Accepted, Rejected' },
      { id: 'f_car_category',        label: 'Category of Non Conformance',        type: 'checkbox-group', required: false, owner: 'approver', options: 'Minor, Major, Need to Improvement' },

      // ── Section B — Concerned HOD or Personnel ──
      { id: 'f_car_root_cause',      label: 'Root Cause',                         type: 'textarea',       required: false, owner: 'approver', options: '' },
      { id: 'f_car_correction',      label: 'Correction to be Taken',             type: 'textarea',       required: false, owner: 'approver', options: '' },
      { id: 'f_car_target_date',     label: 'Target Date',                        type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_corrective_action', label: 'Corrective Action',                type: 'textarea',       required: false, owner: 'approver', options: '' },

      // ── Section C — Follow-up (QHSE Executive / Internal Auditor) ──
      { id: 'f_car_fu1_status',      label: 'First Follow-up Status',             type: 'dropdown',       required: false, owner: 'approver', options: 'Closed, Pending' },
      { id: 'f_car_fu1_remarks',     label: 'First Follow-up Remarks',            type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu1_verified_by', label: 'First Follow-up Verified By',        type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu1_date',        label: 'First Follow-up Signature/Date',     type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu1_next_date',   label: 'First Follow-up Next Date',          type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu2_status',      label: 'Second Follow-up Status',            type: 'dropdown',       required: false, owner: 'approver', options: 'Closed, Pending' },
      { id: 'f_car_fu2_remarks',     label: 'Second Follow-up Remarks',           type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu2_verified_by', label: 'Second Follow-up Verified By',       type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu2_date',        label: 'Second Follow-up Signature/Date',    type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu2_next_date',   label: 'Second Follow-up Next Date',         type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu3_status',      label: 'Third Follow-up Status',             type: 'dropdown',       required: false, owner: 'approver', options: 'Closed, Pending' },
      { id: 'f_car_fu3_remarks',     label: 'Third Follow-up Remarks',            type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu3_verified_by', label: 'Third Follow-up Verified By',        type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_car_fu3_date',        label: 'Third Follow-up Signature/Date',     type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_car_new_car_no',      label: 'New CAR No.',                        type: 'text',           required: false, owner: 'approver', options: '' },
    ],
  },
]

// Used in the "Related Employee" picker when /api/employees has no backend
// to answer it yet, so the dropdown isn't empty.
export const SEED_EMPLOYEES = [
  { id: 'seed-emp-ismr',    full_name: 'Demo ISMR / Change Team Lead', department_name: 'Quality' },
  { id: 'seed-emp-manager', full_name: 'Demo Department Manager',     department_name: 'Operations' },
]
