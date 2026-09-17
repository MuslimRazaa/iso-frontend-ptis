// Bump whenever the shape of SEED_TEMPLATES below changes, so ensureSeeded()
// replaces a stale copy already sitting in a browser's localStorage instead
// of leaving it untouched forever.
export const SEED_VERSION = 6

// Final Settlement Form (FM-006-03) routes to 5 separate department HODs for
// asset/dues clearance (Part A) — same shape, one row per department, so it's
// generated rather than typed out 5 times over like the requisition rows are.
const SETTLEMENT_DEPTS = [
  { key: 'hod_operations', label: 'HOD Operations' },
  { key: 'hod_accounts',   label: 'HOD Accounts' },
  { key: 'hod_qaqc',       label: 'HOD QA/QC' },
  { key: 'hod_it',         label: 'HOD IT' },
  { key: 'hod_adminhr',    label: 'HOD Admin/HR' },
]
const settlementDeptFields = () => SETTLEMENT_DEPTS.map(({ key, label }) => [
  { id: `f_fs_${key}_dues`, label: `${label} — Dues or Asset, if any`, type: 'textarea',  required: false, owner: key, options: '' },
  { id: `f_fs_${key}_sign`, label: `${label} — Signature`,             type: 'signature', required: false, owner: key, options: '' },
]).flat()

// Requisition Form (FM-014-09) has an 8-row item grid on paper. This app's
// field system has no "repeating row/table" type, so each row is modeled as
// its own fixed set of fields (f_req_item{n}_*) — same pattern CAR already
// uses for its 3 fixed follow-ups (f_car_fu{n}_*).
const REQUISITION_ITEM_ROWS = 8
const requisitionItemFields = () => Array.from({ length: REQUISITION_ITEM_ROWS }, (_, i) => {
  const n = i + 1
  return [
    { id: `f_req_item${n}_desc`,        label: `Item ${n} — Description`,               type: 'text',   required: false, owner: 'requester', options: '' },
    { id: `f_req_item${n}_spec`,        label: `Item ${n} — Specification`,             type: 'text',   required: false, owner: 'requester', options: '' },
    { id: `f_req_item${n}_qty_request`, label: `Item ${n} — Quantity Request`,          type: 'number', required: false, owner: 'requester', options: '' },
    { id: `f_req_item${n}_qty_issued`,  label: `Item ${n} — Quantity Issued`,           type: 'number', required: false, owner: 'approver',  options: '' },
    { id: `f_req_item${n}_date_issued`, label: `Item ${n} — Date Issued`,               type: 'date',   required: false, owner: 'approver',  options: '' },
    { id: `f_req_item${n}_remarks`,     label: `Item ${n} — Any Other Remarks`,         type: 'text',   required: false, owner: 'approver',  options: '' },
  ]
}).flat()

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

  // ── Requisition Form (FM-014-09) ──────────────────────────────────────────
  {
    id: 'seed-fm-014-09',
    name: 'Requisition Form',
    description: 'FM-014-09 — request items (repair/purchase/replace/stock/return), store issues against it.',
    created_by_name: 'Seeded demo template',
    fields: [
      { id: 'f_req_requestor_name',   label: 'Name of Requestor',            type: 'employee',       required: true,  owner: 'requester', options: '' },
      { id: 'f_req_request_date',     label: 'Date of Request',              type: 'date',           required: true,  owner: 'requester', options: '' },
      { id: 'f_req_department',       label: 'Department of Requestor',      type: 'text',           required: true,  owner: 'requester', options: '' },
      { id: 'f_req_priority',         label: 'Priority Level',               type: 'dropdown',       required: true,  owner: 'requester', options: 'Urgent (Within same day), Normal (Within Few days)' },
      { id: 'f_req_against',          label: 'Request Against',              type: 'checkbox-group', required: true,  owner: 'requester', options: 'Repair & Maintenance, Purchase, Replace, Stock, Return' },
      { id: 'f_req_justification',    label: 'Justification for Request',    type: 'textarea',       required: true,  owner: 'requester', options: '' },

      ...requisitionItemFields(),

      { id: 'f_req_estimated_amount', label: 'Estimated Amount (Rs)',        type: 'number',         required: false, owner: 'requester', options: '' },

      { id: 'f_req_recommended_by',   label: 'Recommended By',               type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_req_recommended_remarks', label: 'If any Remarks',            type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_req_recommended_date', label: 'Recommendation Date',          type: 'date',           required: false, owner: 'approver', options: '' },
      { id: 'f_req_approved_by',      label: 'Approved By',                  type: 'employee',       required: false, owner: 'approver', options: '' },
      { id: 'f_req_approved_dept',    label: 'Approving Department',         type: 'text',           required: false, owner: 'approver', options: '' },
      { id: 'f_req_approved_date',    label: 'Approval Date',                type: 'date',           required: false, owner: 'approver', options: '' },
    ],
  },

  // ── Final Settlement Form (FM-006-03) ─────────────────────────────────────
  // A departing employee's clearance form: 5 department HODs each sign off
  // dues/assets independently (Part A), Accounts fills the financial
  // breakdown (Part B) and the payout receipt, HR completes Part C, and the
  // handover of company property is witnessed and verified by both the
  // employee's dept head and Finance. Hand-built rather than auto-detected —
  // Part D and the handover narrative on page 3 are prose with inline blanks
  // ("I, Mr. ___ worked as ___..."), which the generic label-scan detector
  // was never built to read.
  {
    id: 'seed-fm-006-03',
    name: 'Final Settlement Form',
    description: 'FM-006-03 — departing employee clearance: dept dues, accounts breakdown, HR, and asset handover.',
    created_by_name: 'Seeded demo template',
    // Named approval roles this template requires — each resolved to a
    // specific person when the form is submitted, not fixed here.
    approvalRoles: [
      ...SETTLEMENT_DEPTS.map(({ key, label }) => ({ key, label })),
      { key: 'hr',                   label: 'HR' },
      { key: 'dept_head_handover',   label: 'Dept. Head (Handover Verification)' },
      { key: 'finance_handover',     label: 'Finance Dept (Handover Verification)' },
    ],
    fields: [
      // ── Header (Requester — filled when submitting) ──
      { id: 'f_fs_employee',          label: 'Employee',                              type: 'employee',  required: true,  owner: 'requester', options: '' },
      { id: 'f_fs_designation',       label: 'Designation',                           type: 'text',      required: true,  owner: 'requester', options: '' },
      { id: 'f_fs_department',        label: 'Department',                            type: 'text',      required: true,  owner: 'requester', options: '' },
      { id: 'f_fs_resignation_date',  label: 'Resigned From Service — Date',          type: 'date',      required: true,  owner: 'requester', options: '' },

      // ── Part A — one dues/signature pair per department HOD ──
      ...settlementDeptFields(),

      // ── Part B — Accounts (financial breakdown) ──
      { id: 'f_fs_salary',            label: 'Salary',                                type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_medical_reimb',     label: 'Medical Reimbursement Payable',         type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_days_payable',      label: 'No. of Days Payable (Current Month)',   type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_field_work_days',   label: 'Field Work Days',                       type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_leave_encashment',  label: 'Leave Encashment (Days)',               type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_pf_payable',        label: 'Provident Fund Payable, if any',        type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_loan',              label: 'Loan',                                  type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_advance_salaries',  label: 'Advance Salaries',                      type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_advance_others',    label: 'Advance (Others)',                      type: 'number',    required: false, owner: 'hod_accounts', options: '' },
      { id: 'f_fs_accounts_sign',     label: 'Accounts — Sign (HOD)',                 type: 'signature', required: false, owner: 'hod_accounts', options: '' },

      // ── Part C — HR Section, plus the closing receipt ──
      { id: 'f_fs_doj',               label: 'Date of Joining',                       type: 'date',      required: false, owner: 'hr', options: '' },
      { id: 'f_fs_dol',               label: 'Date of Leaving',                       type: 'date',      required: false, owner: 'hr', options: '' },
      { id: 'f_fs_notice_pay_days',   label: 'Notice Pay Payment, if any (Days)',     type: 'number',    required: false, owner: 'hr', options: '' },
      { id: 'f_fs_other_deductions',  label: 'Other Deductions (Leaves Without Pay)', type: 'textarea',  required: false, owner: 'hr', options: '' },
      { id: 'f_fs_payable_before',    label: 'Payable (Before Deductions)',           type: 'number',    required: false, owner: 'hr', options: '' },
      { id: 'f_fs_less_deductions',   label: 'Less Deductions',                       type: 'number',    required: false, owner: 'hr', options: '' },
      { id: 'f_fs_actual_payable',    label: 'Actual Payable (After Deductions)',     type: 'number',    required: false, owner: 'hr', options: '' },
      { id: 'f_fs_receipt_amount',    label: 'Receipt — Amount (Rs)',                 type: 'number',    required: false, owner: 'hr', options: '' },
      { id: 'f_fs_receipt_name',      label: 'Receipt — Full Name',                   type: 'employee',  required: false, owner: 'hr', options: '' },
      { id: 'f_fs_receipt_signature', label: 'Receipt — Signature',                   type: 'signature', required: false, owner: 'hr', options: '' },
      { id: 'f_fs_receipt_date',      label: 'Receipt — Date',                        type: 'date',      required: false, owner: 'hr', options: '' },

      // ── Part D — the employee's own section (Requester) ──
      { id: 'f_fs_pf_details',           label: 'PF — Details',                          type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_bonus_details',        label: 'Bonus — Details',                       type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_address_correspondence', label: 'Address for Correspondence',          type: 'textarea',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_address_remittance',   label: 'Address for Remittance of Dues, if any', type: 'textarea', required: false, owner: 'requester', options: '' },
      { id: 'f_fs_partd_date',           label: 'Part D — Date',                         type: 'date',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_partd_place',          label: 'Part D — Place',                        type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_partd_signature',      label: 'Part D — Employee Signature',           type: 'signature', required: false, owner: 'requester', options: '' },

      // ── Page 3 — handover of materials/assets (Requester records it; Dept
      // Head and Finance verify it as separate roles below) ──
      { id: 'f_fs_ho_name',           label: 'Person Handing Over',                   type: 'employee',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_ho_role',           label: 'Handing Over — Worked As',              type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_to_name',           label: 'Person Taking Over',                    type: 'employee',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_to_role',           label: 'Taking Over — Working As',              type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_ho_date',           label: 'Handover — Date',                       type: 'date',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_ho_signature',      label: 'Handing Over — Signature',              type: 'signature', required: false, owner: 'requester', options: '' },
      { id: 'f_fs_checklist_items',   label: 'Documents / JD Checklist — Items',      type: 'textarea',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_checklist_attached', label: 'Checklist Attached',                   type: 'dropdown',  required: false, owner: 'requester', options: 'Yes, No' },
      { id: 'f_fs_to_date',           label: 'Taking Over — Date',                    type: 'date',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_to_signature',      label: 'Taking Over — Signature',               type: 'signature', required: false, owner: 'requester', options: '' },
      { id: 'f_fs_witness1_name',     label: 'Witness 1',                             type: 'employee',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_witness1_role',     label: 'Witness 1 — Working As',                type: 'text',      required: false, owner: 'requester', options: '' },
      { id: 'f_fs_witness2_name',     label: 'Witness 2',                             type: 'employee',  required: false, owner: 'requester', options: '' },
      { id: 'f_fs_witness2_role',     label: 'Witness 2 — Working As',                type: 'text',      required: false, owner: 'requester', options: '' },

      // ── Page 3 sign-off ──
      { id: 'f_fs_verified_dept_head', label: 'Verified by Dept. Head',               type: 'signature', required: false, owner: 'dept_head_handover', options: '' },
      { id: 'f_fs_verified_finance',   label: 'Verified by Finance Dept',             type: 'signature', required: false, owner: 'finance_handover',   options: '' },
    ],
  },
]

// Used in the "Related Employee" picker when /api/employees has no backend
// to answer it yet, so the dropdown isn't empty.
export const SEED_EMPLOYEES = [
  { id: 'seed-emp-ismr',    full_name: 'Demo ISMR / Change Team Lead', department_name: 'Quality' },
  { id: 'seed-emp-manager', full_name: 'Demo Department Manager',     department_name: 'Operations' },
]
