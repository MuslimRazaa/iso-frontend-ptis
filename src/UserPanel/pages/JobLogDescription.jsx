import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'
import PaginationBar from '../../components/PaginationBar'
import StyledSelect from '../../components/StyledSelect'
import StyledDatePicker from '../../components/StyledDatePicker'
import InfoTooltip from '../../components/InfoTooltip'
import { showToast } from '../../components/Toast'
import { getActorId, getActorName } from '../../utils/actorIdentity'
import { BsBriefcase, BsBoxSeam, BsWallet2, BsLaptop, BsClipboardData, BsPencilSquare } from 'react-icons/bs'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import {
  Plus, RefreshCw, Upload, Trash2, Search, Calendar, AlertTriangle, X,
  ClipboardList, CheckCircle2, Clock, CircleDashed, Pencil, Download, FileSpreadsheet,
  ChevronRight, ChevronDown, Users
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   DB ↔ component field mapping helpers
   DB uses snake_case; component uses camelCase
───────────────────────────────────────────────────────────── */
const fromDBInspectorChange = c => ({
  id: c.id,
  fieldType: c.field_type,
  changeType: c.change_type,
  oldValue: c.old_value || '',
  newValue: c.new_value || '',
  startDate: c.start_date ? c.start_date.slice(0, 10) : '',
  endDate: c.end_date ? c.end_date.slice(0, 10) : '',
  reason: c.reason || '',
  createdBy: c.created_by || '',
})

const fromDB = row => ({
  id: row.id,
  sNo: row.s_no != null ? String(row.s_no) : '',
  client: row.client || '',
  workOrder: row.work_order || '',
  inspectorName: row.inspector_name || '',
  inspectorTeam: row.inspector_team || '',
  reference: row.reference || '',
  location: row.location || '',
  natureOfJob: row.nature_of_job || '',
  startDate: row.start_date ? row.start_date.slice(0, 10) : '',
  endDate: row.end_date ? row.end_date.slice(0, 10) : '',
  entryDate: row.entry_date ? row.entry_date.slice(0, 10) : '',
  vehicleUsed: row.vehicle_used || '',
  days: row.days != null ? String(row.days) : '',
  calculatedDays: row.calculated_days != null ? String(row.calculated_days) : '',
  manPower: row.man_power != null ? String(row.man_power) : '',
  manHours: row.man_hours != null ? String(row.man_hours) : '',
  drivenKm: row.driven_km != null ? String(row.driven_km) : '',
  jmps: row.jmps || '',
  tra: row.tra || '',
  equipCL: row.equip_cl || '',
  vLog: row.v_log || '',
  tbt: row.tbt || '',
  status: row.status || '',
  completionDate: row.completion_date ? row.completion_date.slice(0, 10) : '',
  rept: row.rept || '',
  exp: row.exp || '',
  accounts: row.accounts || '',
  it: row.it || '',
  submissionDate: row.submission_date ? row.submission_date.slice(0, 10) : '',
  source: row.source || '',
  remark: row.remark || '',
  remarks: row.remarks || '',
  // Per-department remarks
  remarkOperations: row.remark_operations || '',
  remarkQhse: row.remark_qhse || '',
  remarkInventory: row.remark_inventory || '',
  remarkAccounts: row.remark_accounts || '',
  remarkIt: row.remark_it || '',
  // Inventory department fields
  stockRequisition: row.stock_requisition || '',
  goodsIssueNote: row.goods_issue_note || '',
  consumption: row.consumption || '',
  gatePass: row.gate_pass || '',
  inspectorChanges: Array.isArray(row.inspector_changes) ? row.inspector_changes.map(fromDBInspectorChange) : [],
})

const toDB = data => ({
  s_no: data.sNo || null,
  client: data.client || null,
  work_order: data.workOrder || null,
  inspector_name: data.inspectorName || null,
  inspector_team: data.inspectorTeam || null,
  reference: data.reference || null,
  location: data.location || null,
  nature_of_job: data.natureOfJob || null,
  start_date: data.startDate || null,
  end_date: data.endDate || null,
  entry_date: data.entryDate || null,
  vehicle_used: data.vehicleUsed || null,
  days: data.days || null,
  calculated_days: data.calculatedDays || null,
  man_power: data.manPower || null,
  man_hours: data.manHours || null,
  driven_km: data.drivenKm || null,
  jmps: data.jmps || null,
  tra: data.tra || null,
  equip_cl: data.equipCL || null,
  v_log: data.vLog || null,
  tbt: data.tbt || null,
  status: data.status || null,
  completion_date: data.completionDate || null,
  rept: data.rept || null,
  exp: data.exp || null,
  accounts: data.accounts || null,
  it: data.it || null,
  submission_date: data.submissionDate || null,
  source: data.source || null,
  remark: data.remark || null,
  remarks: data.remarks || null,
  remark_operations: data.remarkOperations || null,
  remark_qhse: data.remarkQhse || null,
  remark_inventory: data.remarkInventory || null,
  remark_accounts: data.remarkAccounts || null,
  remark_it: data.remarkIt || null,
  stock_requisition: data.stockRequisition || null,
  goods_issue_note: data.goodsIssueNote || null,
  consumption: data.consumption || null,
  gate_pass: data.gatePass || null,
})

/* ─────────────────────────────────────────────────────────────
   Known locations (used for datalist autocomplete)
───────────────────────────────────────────────────────────── */
const KNOWN_LOCATIONS = [
  "Ali North-1", "Baudero-1", "Bukhari North X-1", "Chand South-1", "Chanda-5", "Gormani-1",
  "Bukhari North-1", "Hadaf X-1", "Hayat-2", "Hilong Yard", "KDT-45", "Khaddi-2", "Lakhman-01",
  "Maroja-1", "Mazari-19", "Mazari-19 / Hayat-2", "Muban-5", "Mubarak South-1", "Oderolal",
  "Ptis Lab", "Ptis Office", "Qadir Pur Deep X-1", "Qamar X-1", "Rajani-10", "Rajani-12",
  "Sachoo-01", "Sachu-1", "Sohrab Deep-7", "South Deep-4", "South Deep-7", "Suhan-1", "Sui 109",
  "Sutiari Deep 4", "Sutiari Deep 4-Mubarak South-1", "Tando Adam", "Tando Adam Yard",
  "TRS Department", "Unarpur-1", "Warar-1", "Chanda", "Hilong-2", "RAJANI-2",
  "Sonro-17/Rajani-09/Gulsher-1", "Halipota-6", "Gulsher-1", "Mazari Yard", "Well Serve Yard",
  "Tangri", "South Bozdar", "Gharo Yard", "Rahim X-1", "HL Yard", "BELA WEST X-1", "BELA WEST-1",
  "CHANG-1", "KARACHI OFFICE", "Khadi-2", "Mazari Deep -1", "MAZARI SOUTH DEEP-1", "PTIS",
  "RAHIM-4", "SUKHI SOUTH-1", "ZPEC YARD", "Hayat-1", "Port Qasim Yard", "Bin Qasim Yard",
  "Khaur North-1", "KHASKHELI YARD", "Rajani Deep - 10", "Zamzama N-2", "Khaur X-1",
  "Roshan-1 / Rehman-5", "Rehman -5", "Khaskheli", "IS YARD SUKKAR", "SUKKUR",
  "KHASKHELI BASE", "ZAMZAMA SUB - 02", "Drillnetic Energy Yard", "Naimt West", "SMD-1",
  "Guni-1", "Bari-09", "Naimat Yard", "Muqim-1 - Naimat Basal", "Muqim-1", "Naimat SWD-1",
  "Sutiari Deep-3", "Rajani-9", "Halipota-06", "Moroja-01", "MKK Tubing Yard", "Sonro - 17",
  "Ghungro East - 1", "Kakhman - 1", "Lafif - 17", "New Makran Eng", "Naimat / SWD2", "Bari-11",
  "Buzdar Deep - 9", "Naimat Basal", "Buzdar S - 09", "BSD - 09", "Saleh - 2", "Chahg-1",
  "Mubann V", "Rawal - 1", "Mazari -17", "Ghungru Deep -1", "Tando", "Bari-10", "Rajani-5",
  "South Mazari Deep-1", "Sonro - 15", "Mazari-12", "Dhabi North - 1", "Saleh - 5", "Rehab - 1",
  "Miano - 24", "Sonro - 18", "Ramdhani - 1", "Sukan - 1", "Mehar - 5", "CHAK 25 WELL 1",
  "QADIRPUR - 59", "Nur West - 1", "MELA - 6", "KHANJAR KHEL - 1", "WASSAN-1", "ZIN DEEP - 2",
  "NOOR WEST - 1", "NASHPA - 9", "SHAWA-X1", "SOORGI X-3", "KUNNAR - 12", "KOT SARANG YARD",
  "RANGLI", "KOT SARANG", "KHADEJI YARD", "PASAKI N-EAST-1", "GAHRI X-2", "PAND SULTANI",
  "SINOPAK-149", "SHAWA-1", "GARHI X-2", "SIAB - 1", "MONGINO-1", "WEST DEEP - 2",
  "DHOK HUSSAIN", "TOGH-1", "QP Deep - 6", "HUMAK YARD", "CCDC YARD", "TALAGANG", "ADHI-31",
  "MISIRAL X-1", "ADHI-10", "PINDORI-10", "KHANJAR KHEEL", "DHOKE SULTAN 02", "PHARPUR X-1",
  "CCDC-23", "JSL Yard", "Maripur Yard", "Manzalai-3", "Tolanj East-1 - Manzalai-3",
  "Benari X-1", "Nusrat X-1", "Makori-1", "Siemens Yard", "Port Qasim", "Siemens Facility",
  "SUKKAR YARD", "Nakurji-2 - Nusrat X-1", "SPRINT YARD", "I 10/3 Yard", "GULARCHI",
  "SHAH DINO", "RAJPARI-1", "REHMAN-5", "JSL YARD", "Tando M.Khan", "Pirani", "PAHAR PUR X-1",
  "ADHI-32", "CCDC-07", "BADEELX-1", "Nuricon I 10-3 Yard", "I-10 YARD", "CREEK WAY HOTEL",
  "RAJHANI-11", "Margand X-1", "Wireline Yard KK", "Bolan East-1 - Sukkur Wireline", "Bari-12",
  "Unarpur - 2", "Malhan-1", "MKK WEST CAMP (C.Y)", "RIZQ-3", "Mitha - 1", "Hawksbay Yard",
  "Sawan Pipe Yard", "Miano - 28", "Miano - 22", "DAMACH-1", "Bari-13", "MULAKI-02", "WFT Yard",
  "Anton-2001", "Scomi Yard", "GOTKI", "KDT 47", "Sui-106", "Schlumberger", "Meher 5", "Rehman-6",
  "PASAKHI-2/ N-3", "Multi Location", "Hilong - 17 / Pirani", "IOT Yard", "Adhi # 07 Pipe Yard",
  "AYUB X-1", "Agility Yard", "Gambat South", "Tarnal ITS Yard", "Adhi Well 9", "Nooh X-1",
  "Adhi Well 07", "Kandkhot", "SUI H125", "D- Suktan X- 1", "PPL Yard", "Mari - 1", "Rahib-1",
  "SUI - 108", "Jani - 1", "Gulsher - 2", "WDI - 3", "MKK", "MITHA - 2", "Mari-2", "Mari Rig",
  "MPCL YARD", "Mari - 119", "Mari - 112", "Miraj-1", "ZIA Yard Karachi", "K.K Yard",
  "Dhulian Yard", "Balkasar - 1", "Latif - 18", "Nashpa -5A", "Moregend X - 1",
  "Pasaki west Deep 2", "Sanghar", "YYK", "Bharia", "Rig-33", "Gadab", "D & M Yard", "Zamzama-3",
  "HL-4002", "ZPEC-33", "RANGUNWARI -01", "ADHI-34", "Rig-3", "Crescent Mill", "Nakurji-1",
  "SCR-1", "Joyamir-4", "Rig-66", "Anton-4001", "N-2", "Peshawar Ring Road", "Hyderabad",
  "Sprint", "Sinopec -77", "Thora Deep-3", "Bitro-1 SLR-215", "MMKS-1", "Mela-7", "MMKS-2",
  "Mulaki East-1", "Matli", "Hilong-17/ Paniro-1", "Mazari-20", "Dhoke Sultan South X-1",
  "MEC", "Adhi South X-4", "Qadirpur-14", "Bukhari Deep-4", "Sawan-4", "Muzaffargarh",
  "Hilong-16", "Jhandiyal -2", "Ghakkar Phatak Yard", "Z S 4 , ZARGHOON", "Nuricon Yard",
  "HL-02", "N-4", "Rajian-11", "Kathiar-1", "Hilong-5", "Jan-2", "Sinopec-77", "WALI-01",
  "JHANG BAHATAR YARD", "South Mazari Deep-2", "Khandkot", "Mulaki-5", "Dharian-1",
  "Karachi Yard", "Jang Bahtar Yard", "Balkasar Yard", "Weatherford Yard", "Adhi South X-3",
  "Bari-15", "Latif-23", "Rehman-07", "Jatoi -1", "Ranjho-1", "Cholistan X-1", "Qadirpur-15",
  "Tangri-04", "Adhi South X-2", "Pasaki-11 / N-55", "I.S Enterprises Yard Tarnol", "Hilal-1",
  "Miano-25", "Pasaki-10", "Rahim X-2", "Dhoro-1", "Lucky Rod X-1", "Sui Well-110", "Mazari-18",
  "Singhar-01", "BOBY DEEP X-1", "DEEP X-1 A", "Seni Gombat-1", "S.Zia Yard Islamabad",
  "Mitto-01", "Tando Muhammad Khan", "Iqbal-01", "Washuk-01", "Togh Bala-01", "Dakhni Plant",
  "Mazari-11", "Sajan-01", "Zaur-03", "Turk Deep North-01", "QP West X-1", "SUI-112",
  "Nooriabad", "Sui Gas Plant", "Kashmore", "Khaur Yard", "Zia Yard", "Sheen Dund-01",
  "Nangpir-01", "SHARF-3", "MD-21", "Baqqa-1", "KUC-1", "Qadirpur-62 OGDCL", "Sial-1 OGDCL",
  "Rig", "South Mazari Deep-3", "Singhar-1", "Deutag Yard Burhama", "Mari Deep-19",
  "Parwaz Deep-1", "Mehtab-1", "SUI", "Qadirpur Well", "Toot Deep-1/Hilong-2", "Saindad-1",
  "Manzalai-07/KCA T-72", "mehar-4", "Pasakhi WIW-1", "Kambir-1", "UEPL", "NASHPA-5",
  "MAKORI", "OGDCL N3", "latif 22", "Gagani South-1", "T 202", "North Akri -4", "Rig Mari-1",
  "MOL", "Burhan yard", "Joya mair-1 rig", "Sui 72 PPL", "baqa-3", "miano-20", "Pasakhi-7",
  "Tando Alam Mari", "Uch plant", "Suleman-1", "Qadirpur", "Khanot-1", "Tangri-3", "Tando Alam",
  "Hilong-9", "MD-18", "MPCL Daharki", "Mangrio-02", "Ludano deep-1", "Jugan-1", "Pasaki-12",
  "Moolan-2", "Sawan Gas Plant", "Rig ccdc 26", "togh-02", "Qasar x-1", "Exalo-303", "Rajian",
  "Rig CCDC-23", "Mela-8 south", "Khipro East X-1", "Taj-01", "Ranjho-2", "Bijoro-3", "Exalo",
  "Ccdc32", "Turk Deep North-2", "Bannu- west-1", "Rehman-8", "Sofiya-03", "Patani-1",
  "Turk-1", "IPC", "Tipu-1", "Nuricon energy services limited", "Fazil-01", "South Mazari-12",
  "Mazari-16", "Petro service", "Mulaki west-1", "Exalo 303", "Bari 14", "Buzdar South Deep 7",
  "DGK-1", "Exalo 2000", "umar-4", "HL-09", "Saman 1", "PKL South",
  "IVCC yard Sunder industrial estate Lahore", "Naimat west-7", "malkani-1", "Zaman 01",
  "Bhatti north 1", "RIG ZJ30", "mehar-3", "Mari DEEP-17", "Mohar-1", "Latif-10 w/o",
  "Taj 03", "Latif-10 qadanwari", "Naimat west DT-01", "Mari Rig-1", "mulaki-6", "Hl 5",
  "Mehar-6", "TAJ-4", "Kunnar 10", "HL-9", "Exalo-305", "Lakho 1", "Zpec Yard", "Islamabad",
  "Tolanj west 2", "ccdc adhi", "Ratana-05", "Tajedi-02", "Miano-26", "Mithrau-14", "Zaur West-2",
  "Tando Alam Oil Complex", "kunnar KD-11", "KCA DEUTAG", "Rig Anton 2001", "Sui 43",
  "Sinopec 077", "Adhi South-5", "Naimat west-8", "Ccdc -31", "TAAJ-06", "TURI-01", "Nim East 01",
  "Pasakhi 07", "OGDCL N-4", "Mazari-14", "Kunnar oil field", "Umar-5", "BALKASSAR YARD",
  "Sawan-10", "uet-1", "TARNOL-1", "kumbh-4", "South Buzdar-1", "Sutiari Deep 01",
  "SHAHPUARABAD-01", "Sahib Dino", "Chang - 1", "Latif 21", "MANZALAI-04", "Hilong-21",
  "Bhatti north-2", "NMW DT-02", "Jugan-2", "Saddar 1", "DHABI SOUTH-03", "Takhat-2", "UET-1",
  "Jabery South-3", "CNLC yard", "KK DT2", "CCDC 30", "ADHI-35", "Sui 115", "Minwal X-1",
  "Bobi 11", "MSU beta", "Khaskheli-19", "KK DT-04", "Mehar", "Kumbh-5", "POL", "SLR 215",
  "Shewa-2", "UMAR - 6", "Duetag Drilling", "Mari", "Adhi south -06", "CCDC-30", "UET-01",
  "Murad x 1", "Mari-105 W/O", "CHANDA-07", "Sakhi-08", "MAKORI-5", "Mohar-2", "KK DT-06",
  "Kharo-1", "Takhat-3", "JHANDIAL-3", "JHIM EAST - X1", "MAIWAND X-1", "Sono-9", "Taj South-1",
  "BADIN", "Adam 02", "Jagir-05", "SFS Yard Tando Adam", "ADHI WDW-1", "SANGJANI YARD", "MD-20",
  "Taj-08", "RAZGIR-01", "DHOK PARACHA ISLAMABAD", "HALAINI-2", "Ghazij - 4", "Isra - 01",
  "Sanwal khan", "Halipota-7", "Qabul-3HZ", "Taj-Ws-01", "BALOCH 2", "Uch-35", "Bettani",
  "Brohi -1", "MD-22", "Ghazij-05", "OGDCL", "Mohar-3", "Turk Deep North 01", "Rizq-5",
  "Dabhi South-02", "TAJ-10", "BROHI-1", "MAHAAN-1", "Spinwam - 01", "Pk Battani - 2",
  "Takhat 04", "Baqar Deep 02", "Unar pur - 1", "Sono - 7", "OCTG / Daharki Yard",
  "Sukhi Deep-1", "Sawan North Deep -1", "Kandewaro-1", "Tando Ala Yar", "Walidad-1",
  "Baloch -2", "Ghazij - 6", "Tes-1 Unerpur-1", "Rafat-1", "Sohnal-1", "H-13/4 Islamabad",
  "Soghari North-1", "126H Well", "Sabzkhani-1", "Takhat-5 / TES-1", "Shahu - 1",
  "Zorkham South-5", "Ghajij-7", "Shawal-2", "Pateji X-1", "Surhadi-1", "SND-1 / HILONG-21",
  "CHAK 202-1 . Sadqabad", "Takri -01", "Surhadi-1 / Tes-1", "Sonro-10 W/O / Anton-2001",
  "DARS WEST-1", "MAMI KHEL-1 Kohat", "IWSS ISB YARD", "Umar-8", "Chack-02", "Lodano-4",
  "Dhok Sultan -3", "Bettani Deep-1", "Sabzkani-1 / Rig Hilong 9", "Bhittai-6", "Baragzai X-1",
  "Ghazij - 8", "Umar-04", "Well Chuck 2-2", "Samabhi-1", "K-5", "Soharb Deep-1",
  "Anton-2001 / Dhabi-6", "Chak 202-2", "FAAKIR-1", "Bilal X-1", "DHAMACH-1", "HALIPOTA-8",
  "MAKORI DEEP-03", "Water Disposal Well-5", "Bolan East-2", "Soho -1", "Umer 9", "OGDCL ZJ 30",
  "UEPL Takri-2", "RAJAHU-1", "Bolan west-1", "Takri-2", "Tubing Yard (kk)", "Ghazij CF-A1",
  "FAAKIR-01", "LAL X-1/ HL-21", "Khaitian-1", "Pasaki-14", "Gurgalot X-1", "WIW Umar-11",
  "Toot deep-01", "Jakarho North-1", "Chakar-1", "Qadirpur 64", "Shawal-4", "Barki-1", "BSD-10",
  "BITRISM EAST -1", "Jhakrao N-01", "Jhandial-2", "Sahan-1", "Makhad x-1", "Exalo 305",
  "Sonro-9 / Anton-2001", "Sahan-1 / Anton-2001", "Zarghun South Ghazij-1", "BLT-1",
  "OGDCL SK-750", "RAJIAN -02", "Dars deep 01A", "Pasakhi 13 ( OGDCL )", "Ghazij-11 Well",
  "Hassu 1", "Dharian-01", "TIBRI-1", "Pindori -9", "MORO BYPASS", "PALI DEEP 01",
  "EXALO RIZQ 06 SEWAN", "Mari Deep-24 Well", "Kausar -1 SWD-1", "Chandio-01",
  "Well Gaha Wah-1", "S.ZIA-UL-HAQ YARD", "Miano TGS HZ 1", "IWSS", "Kunnar WIW 1 Rig N5",
  "Speen-1 well", "BSD-11", "Tando Allahyar", "Dars West-3", "SAHITO-1", "Sujawal Block",
  "REHMAN-09", "NWDT-03", "pasaki-13", "WIW-1 KUNNAR", "THUL WEST-1 KANDANWARI", "Shams-1 Well",
  "SUMRO-1 WELL", "CCDC-27", "Queeta Al Noor Restaurant", "Pasakhi North East-02", "Lahore",
  "Adhi/Punjab", "Soho -2 well", "Said Pur-01", "BSD-2", "well SONO-10", "well chack-203-1",
  "SONO-10", "Mari-127H", "Lashkani-1", "Chak 63-5", "Mari-128H", "Khirun-1-OGDCL",
  "TDM-OGDCL",
].sort()

const emptyEntry = {
  sNo: '', client: '', workOrder: '', inspectorName: '', inspectorTeam: '',
  reference: '', location: '', natureOfJob: '', startDate: '', endDate: '',
  entryDate: '', vehicleUsed: '', days: '', calculatedDays: '', manPower: '',
  manHours: '', drivenKm: '', jmps: '', tra: '', equipCL: '', vLog: '', tbt: '',
  status: '', completionDate: '', rept: '', exp: '', accounts: '', it: '',
  submissionDate: '', source: '', remark: '', remarks: '',
  remarkOperations: '', remarkQhse: '', remarkInventory: '', remarkAccounts: '', remarkIt: '',
  stockRequisition: '', goodsIssueNote: '', consumption: '', gatePass: ''
}

// Region (stored in the `source` column) — fixed dropdown choices.
const REGION_OPTIONS = ['South Region', 'North Region']

// Reference — fixed dropdown choices; "Others" switches to a manual text box.
const REFERENCE_OPTIONS = ['Via Email', 'Via Phone call', 'Via Whatsapp']

// QHSE compliance dropdowns (Equip C/L, V. Log, REPT) — only these three values.
const QHSE_OPTIONS = ['Yes', 'No', 'NA']

// ── CSV / Excel export ───────────────────────────────────────
// Ordered [Column header, camelCase key] pairs. Headers match the backend's
// CSV HEADER_MAP (routes/jobLog.js) so an exported file re-imports cleanly.
// Unmapped extras (per-department remarks) are included for completeness and
// are simply ignored by the importer.
const EXPORT_COLUMNS = [
  ['S#', 'sNo'],
  ['Entry Date', 'entryDate'],
  ['Client', 'client'],
  ['Work Order', 'workOrder'],
  ['Inspector Name', 'inspectorName'],
  ['Inspector Team', 'inspectorTeam'],
  ['Reference', 'reference'],
  ['Location', 'location'],
  ['Nature of Job', 'natureOfJob'],
  ['Start Date', 'startDate'],
  ['End Date', 'endDate'],
  ['Vehicle Used', 'vehicleUsed'],
  ['Days', 'days'],
  ['Calculated Days', 'calculatedDays'],
  ['Man Power', 'manPower'],
  ['Man Hours', 'manHours'],
  ['Driven KM', 'drivenKm'],
  ['JMPs', 'jmps'],
  ['TRA', 'tra'],
  ['Equip C/L', 'equipCL'],
  ['V. Log', 'vLog'],
  ['TBT', 'tbt'],
  ['Status', 'status'],
  ['Completion Date', 'completionDate'],
  ['REPT', 'rept'],
  ['EXP', 'exp'],
  ['Accounts', 'accounts'],
  ['IT', 'it'],
  ['Submission Date', 'submissionDate'],
  ['Region', 'source'],
  ['Remark', 'remark'],
  ['Remarks', 'remarks'],
  ['Remark Operations', 'remarkOperations'],
  ['Remark QHSE', 'remarkQhse'],
  ['Remark Inventory', 'remarkInventory'],
  ['Remark Accounts', 'remarkAccounts'],
  ['Remark IT', 'remarkIt'],
  ['Stock Requisition', 'stockRequisition'],
  ['Goods Issue Note', 'goodsIssueNote'],
  ['Consumption', 'consumption'],
  ['Gate Pass', 'gatePass'],
]

// Wrap a value for CSV: quote when it contains a comma, quote or newline; escape
// embedded quotes by doubling them.
const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Build a CSV (with UTF-8 BOM so Excel reads it correctly) from the given rows
// and trigger a download. Shared by the date-range export and the filtered
// export so both produce an identical, import-compatible file.
const downloadJlrCsv = (rows, label) => {
  const header = EXPORT_COLUMNS.map(([h]) => csvCell(h)).join(',')
  const lines = rows.map(row => EXPORT_COLUMNS.map(([, key]) => csvCell(row[key])).join(','))
  const csv = '﻿' + [header, ...lines].join('\r\n')
  const fname = `JLR_Export_${label}.csv`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fname
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return fname
}

/* ─────────────────────────────────────────────────────────────
   Field → JLR department mapping (used by permission system)
───────────────────────────────────────────────────────────── */
const FIELD_DEPT = {
  // Operations
  sNo: 'operations', client: 'operations', workOrder: 'operations',
  inspectorName: 'operations', inspectorTeam: 'operations', reference: 'operations',
  location: 'operations', natureOfJob: 'operations',
  startDate: 'operations', endDate: 'operations', entryDate: 'operations',
  vehicleUsed: 'operations', days: 'operations', calculatedDays: 'operations',
  manPower: 'operations', manHours: 'operations', drivenKm: 'operations',
  jmps: 'operations', status: 'operations', completionDate: 'operations',
  source: 'operations', remark: 'operations', remarks: 'operations',
  remarkOperations: 'operations',
  // QHSE
  tra: 'qhse', equipCL: 'qhse', vLog: 'qhse', tbt: 'qhse',
  rept: 'qhse', submissionDate: 'qhse', remarkQhse: 'qhse',
  // Inventory
  stockRequisition: 'inventory', goodsIssueNote: 'inventory',
  consumption: 'inventory', gatePass: 'inventory', remarkInventory: 'inventory',
  // Accounts
  exp: 'accounts', accounts: 'accounts', remarkAccounts: 'accounts',
  // IT
  it: 'it', remarkIt: 'it',
}

const PAGE_SIZE = 100

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const s = new Date(`${startDate}T00:00:00`)
  const e = new Date(`${endDate}T00:00:00`)
  if (isNaN(s) || isNaN(e)) return ''
  const diff = e - s
  if (diff < 0) return ''
  return Math.floor(diff / 86400000) + 1
}

/* ── Column group definitions ───────────────────────────────── */
const COL_GROUPS = [
  { label: 'Identification', span: 8, color: '#eef3ff', textColor: '#2f74bf', borderColor: '#c9dcf5' },
  { label: 'Job Details', span: 5, color: '#fff8ef', textColor: '#c87e1c', borderColor: '#ffe4c4' },
  { label: 'Operational Metrics', span: 6, color: '#f0fff8', textColor: '#1d814c', borderColor: '#c3ecd4' },
  { label: 'Safety Documentation', span: 4, color: '#fdf5ff', textColor: '#7c3aed', borderColor: '#ddb8f7' },
  { label: 'Status & Tracking', span: 8, color: '#fff5f6', textColor: '#d7263d', borderColor: '#ffd1d8' },
  { label: 'Inventory', span: 4, color: '#fff9e6', textColor: '#a87800', borderColor: '#f4dd9d' },
  { label: 'Remarks', span: 2, color: '#f7f7f9', textColor: '#595966', borderColor: '#e0e0e6' },
  { label: 'Actions', span: 1, color: '#f7f7f9', textColor: '#595966', borderColor: '#e0e0e6' },
]

/* ── Badge components ───────────────────────────────────────── */
// Status filter value for the Pending card: "pending" OR not set yet.
const STATUS_PENDING_ANY = '__pending_or_blank__'

function StatusBadge({ value }) {
  if (!value) return <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
  const lower = value.toLowerCase()
  let bg, color, border, icon
  if (lower === 'closed') {
    bg = 'linear-gradient(135deg,#e8fff3,#d4f8e3)'; color = '#1d814c'; border = '1px solid #c3ecd4'; icon = '✓'
  } else if (lower === 'in progress') {
    bg = 'linear-gradient(135deg,#fff8ef,#ffefdb)'; color = '#c87e1c'; border = '1px solid #ffe4c4'; icon = '◐'
  } else if (lower === 'pending') {
    bg = 'linear-gradient(135deg,#f4f4f7,#ededf2)'; color = '#7a7a8c'; border = '1px solid #dcdce3'; icon = '◌'
  } else {
    bg = 'linear-gradient(135deg,#f0f7ff,#e6f2ff)'; color = '#2f74bf'; border = '1px solid #d4e6f7'; icon = '●'
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px',
      borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: bg, color, border
    }}>
      {icon} {value}
    </span>
  )
}

function YesNoBadge({ value }) {
  if (!value) return <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
  const lower = value.toLowerCase()
  if (['yes', 'done', 'completed', 'updated'].includes(lower))
    return <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: 'linear-gradient(135deg,#e8fff3,#d4f8e3)', color: '#1d814c', border: '1px solid #c3ecd4'
    }}>✓ {value}</span>
  if (lower === 'no')
    return <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: 'linear-gradient(135deg,#fff5f6,#ffe8ea)', color: '#d7263d', border: '1px solid #ffd1d8'
    }}>✗ {value}</span>
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
    borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#f4f4f7',
    color: '#888', border: '1px solid #e0e0e6'
  }}>◌ {value}</span>
}

/* ── Modal section divider ──────────────────────────────────── */
function ModalSection({ Icon, title, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px',
      paddingBottom: 10, borderBottom: '1px solid #efeff2'
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 8, background: '#fdf2f3', color: '#d7263d',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0
      }}>
        {Icon ? <Icon /> : null}
      </span>
      <span style={{
        fontSize: 12.5, fontWeight: 700, color: '#32323c',
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>{title}</span>
      {hint && (
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#9a9aaa',
          letterSpacing: '0.04em'
        }}>{hint}</span>
      )}
    </div>
  )
}

/* Searchable multi-select (select2-style) — value is a comma-separated string */
function MultiSelect({ value, onChange, options, placeholder = 'Select…', disabled, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  const selected = (value || '').split(',').map(s => s.trim()).filter(Boolean)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const commit = (arr) => onChange(arr.join(', '))
  const toggle = (name) =>
    commit(selected.includes(name) ? selected.filter(s => s !== name) : [...selected, name])
  const remove = (name) => commit(selected.filter(s => s !== name))

  const q = query.trim()
  const canAdd = !!onAdd && q.length > 0 && !options.some(o => o.toLowerCase() === q.toLowerCase())
  const doAdd = async () => {
    const added = (onAdd && await onAdd(q)) || q
    if (added && !selected.includes(added)) commit([...selected, added])
    setQuery('')
  }

  const filtered = options.filter(
    o => o.toLowerCase().includes(query.toLowerCase()) || selected.includes(o)
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        style={{
          minHeight: 42, width: '100%', boxSizing: 'border-box',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          padding: selected.length ? '6px 36px 6px 8px' : '0 36px 0 12px',
          border: '1px solid #e0e0e6', borderRadius: 8,
          background: disabled ? '#f4f4f7' : '#ffffff',
          color: disabled ? '#aaa' : '#1f1f27',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', fontSize: 14,
        }}
      >
        {selected.length === 0 && (
          <span style={{ color: '#9a9aaa' }}>{placeholder}</span>
        )}
        {selected.map(name => (
          <span key={name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fdf2f3', color: '#d7263d', border: '1px solid #ffd1d8',
            borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 600,
          }}>
            {name}
            {!disabled && (
              <span
                onClick={(e) => { e.stopPropagation(); remove(name) }}
                style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}
              >×</span>
            )}
          </span>
        ))}
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9a9aaa', fontSize: 11, pointerEvents: 'none',
        }}>▼</span>
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #efeff2', position: 'sticky', top: 0, background: '#fff' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inspector…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1px solid #e0e0e6', borderRadius: 6, fontSize: 13, outline: 'none',
              }}
            />
          </div>
          {canAdd && (
            <div onClick={doAdd}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13.5, color: '#d7263d', fontWeight: 600, borderBottom: '1px solid #efeff2' }}>
              + Add “{q}”
            </div>
          )}
          {filtered.length === 0 && !canAdd && (
            <div style={{ padding: '12px 14px', color: '#9a9aaa', fontSize: 13 }}>No matches</div>
          )}
          {filtered.map(name => {
            const isSel = selected.includes(name)
            return (
              <div key={name} onClick={() => toggle(name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13.5,
                  background: isSel ? '#fdf2f3' : '#fff', color: '#1f1f27',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f7f7f9' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff' }}
              >
                <input type="checkbox" readOnly checked={isSel} style={{ accentColor: '#d7263d' }} />
                {name}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* Single-select, searchable dropdown (used for Client & Location).
   Pass onAdd to allow admins to add a new value inline ("+ Add …"). */
function SearchSelect({ value, onChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', disabled, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = query.trim()
  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()))
  const canAdd = !!onAdd && q.length > 0 && !options.some(o => o.toLowerCase() === q.toLowerCase())

  const pick = (name) => { onChange(name); setOpen(false); setQuery('') }
  const doAdd = async () => {
    const added = (onAdd && await onAdd(q)) || q
    if (added) pick(added)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        style={{
          minHeight: 42, width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center',
          padding: '0 36px 0 12px', border: '1px solid #e0e0e6', borderRadius: 8,
          background: disabled ? '#f4f4f7' : '#ffffff',
          color: disabled ? '#aaa' : (value ? '#1f1f27' : '#9a9aaa'),
          cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', fontSize: 14,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9a9aaa', fontSize: 11, pointerEvents: 'none',
        }}>▼</span>
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #efeff2', position: 'sticky', top: 0, background: '#fff' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1px solid #e0e0e6', borderRadius: 6, fontSize: 13, outline: 'none',
              }}
            />
          </div>
          {canAdd && (
            <div onClick={doAdd}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13.5, color: '#d7263d', fontWeight: 600, borderBottom: '1px solid #efeff2' }}>
              + Add “{q}”
            </div>
          )}
          {filtered.length === 0 && !canAdd && (
            <div style={{ padding: '12px 14px', color: '#9a9aaa', fontSize: 13 }}>No matches</div>
          )}
          {filtered.map(name => {
            const isSel = name === value
            return (
              <div key={name} onClick={() => pick(name)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13.5,
                  background: isSel ? '#fdf2f3' : '#fff', color: '#1f1f27',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f7f7f9' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff' }}
              >
                {name}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
function JobLogDescription() {
  const location = useLocation()

  /* Detect theme context:
     - /user/*     → dark theme (UserPanel)
     - everything else (/job-log, /learning-management-system) → light theme
  */
  const isUser = location.pathname.startsWith('/user')

  /* ── Theme tokens (always white/red — admin & user side both) */
  const T = {
    pageBg: '#ffffff',
    bannerBg: '#ffffff',
    bannerBorder: '1px solid #e0e0e6',
    titleColor: '#1f1f27',
    subtitleColor: '#7a7a8c',
    eyebrowColor: '#d7263d',
    statCardBg: '#ffffff',
    statCardShadow: (accent) => `0 4px 18px ${accent}12`,
    statBorderFn: (accent) => `1px solid ${accent}33`,
    filtersBg: '#ffffff',
    filtersBorder: '1px solid #e0e0e6',
    inputBg: '#ffffff',
    inputBorder: '1px solid #e0e0e6',
    inputColor: '#1f1f27',
    inputPlaceholder: 'rgba(0,0,0,0.4)',
    searchIconColor: '#aaa',
    clearBtnBorder: '1px solid #dcdce3',
    clearBtnColor: '#2a2a32',
  }

  /* ── State ──────────────────────────────────────────────── */
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [csvMode, setCsvMode] = useState('append') // 'replace' | 'append'
  const [csvHovered, setCsvHovered] = useState(null) // 'append' | 'replace' | null — which toggle segment the pointer is over
  const [jlrPerms, setJlrPerms] = useState(null)     // null = loading / unknown

  /* ── Fetch current user's JLR permissions ───────────────────
     - On admin routes (/job-log, /lms) → full access (no restrictions)
     - On user routes (/user/*)         → load from backend by email
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isUser) {
      // Admin context — grant full access
      setJlrPerms({ operations: true, qhse: true, inventory: true, accounts: true, it: true, full: true })
      return
    }
    const email = localStorage.getItem('userEmail')
    if (!email) {
      // No login info — lock everything (read-only)
      setJlrPerms({ operations: false, qhse: false, inventory: false, accounts: false, it: false, full: false })
      return
    }
    fetch(`${API_BASE_URL}/api/employees/permissions/email/${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (p?.jlr) setJlrPerms(p.jlr)
        else setJlrPerms({ operations: false, qhse: false, inventory: false, accounts: false, it: false, full: false })
      })
      .catch(() => setJlrPerms({ operations: false, qhse: false, inventory: false, accounts: false, it: false, full: false }))
  }, [isUser])

  /* ── Permission checker — used by form inputs & action buttons */
  const canEdit = (dept) => {
    if (!jlrPerms) return false               // still loading → lock
    if (jlrPerms.full) return true            // full access overrides
    return !!jlrPerms[dept]
  }
  const canAccessAnyJlr = jlrPerms && (
    jlrPerms.full || jlrPerms.operations || jlrPerms.qhse ||
    jlrPerms.inventory || jlrPerms.accounts || jlrPerms.it
  )
  const isAdminContext = !isUser   // shorthand for "no permission restrictions apply"
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [modalState, setModalState] = useState(emptyEntry)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  /* ── Add/Replace Inspector tab (edit mode only) ─────────────── */
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'inspector'
  const [inspectorChangesList, setInspectorChangesList] = useState([])
  const [changeMode, setChangeMode] = useState('add')       // 'add' | 'replace' | 'remove'
  const [changeField, setChangeField] = useState('inspector') // 'inspector' | 'team'
  const [changeOldValue, setChangeOldValue] = useState('')
  const [changeNewValue, setChangeNewValue] = useState('')
  const [changeStart, setChangeStart] = useState('')
  const [changeEnd, setChangeEnd] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [changeSaving, setChangeSaving] = useState(false)
  const [changeError, setChangeError] = useState('')

  const resetInspectorChangeForm = () => {
    setChangeMode('add'); setChangeField('inspector')
    setChangeOldValue(''); setChangeNewValue('')
    setChangeStart(''); setChangeEnd(''); setChangeReason('')
    setChangeError('')
  }
  // Rows whose expand-history sub-row is currently open in the View table.
  const [expandedRows, setExpandedRows] = useState(() => new Set())
  const toggleRowExpanded = (id) => setExpandedRows(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  // Arriving from a dashboard stat card: land already filtered to what it
  // counted, same as the status dropdown would produce by hand. The dashboard
  // sends a stable token ('closed', 'in_progress', 'pending') rather than a
  // guessed spelling — this page is what knows how a status is actually
  // spelled in the register, and resolves it once statusOptions is ready below.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatusToken = searchParams.get('status')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('entryDesc') // entryDesc | entryAsc | sNoDesc | sNoAsc | clientAsc
  const [dateFrom, setDateFrom] = useState('') // entry-date range filter (inclusive)
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const csvInputRef = useRef(null)

  /* ── CSV / Excel export (admin) ─────────────────────────── */
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('') // 'YYYY-MM-DD' (inclusive)
  const [exportTo, setExportTo] = useState('')     // 'YYYY-MM-DD' (inclusive)

  /* ── Delete-All guarded flow ─────────────────────────────── */
  const [deleteStep, setDeleteStep] = useState(null) // null|'confirm1'|'password'|'confirm2'|'countdown'
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteCountdown, setDeleteCountdown] = useState(5)

  // Rows whose entry date falls in the From–To range (both inclusive; blank
  // bound = open-ended). Rows with no entry date are excluded once a bound is
  // set; with both bounds blank, everything is exported.
  const exportRows = useMemo(() => {
    return entries.filter(e => {
      if (!exportFrom && !exportTo) return true
      if (!e.entryDate) return false
      if (exportFrom && e.entryDate < exportFrom) return false
      if (exportTo && e.entryDate > exportTo) return false
      return true
    })
  }, [entries, exportFrom, exportTo])

  // Date-range export (from the modal, used when no table filters are active).
  const handleExport = () => {
    if (exportRows.length === 0) return
    const label = (exportFrom || exportTo)
      ? `${exportFrom || 'start'}_to_${exportTo || 'end'}`
      : 'All'
    const fname = downloadJlrCsv(exportRows, label)
    setShowExport(false)
    const msg = `Exported ${exportRows.length} entr${exportRows.length === 1 ? 'y' : 'ies'} → ${fname}`
    showToast(msg, 'success')
  }

  /* ── Fetch all entries from API ─────────────────────────── */
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch(API_ENDPOINTS.JOB_LOG)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const json = await res.json()
      const rows = json.data ?? json
      setEntries(Array.isArray(rows) ? rows.map(fromDB) : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  /* ── Managed dropdown lists: Customers, Locations, Inspectors ── */
  const [customers, setCustomers] = useState([])      // [{ id, name }]
  const [jlLocations, setJlLocations] = useState([])  // [{ id, name }]
  const [jlInspectors, setJlInspectors] = useState([])// [{ id, name }]
  const [jlTeams, setJlTeams] = useState([])          // [{ id, name }]

  const fetchList = useCallback(async (path, setter) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${path}`)
      const json = await res.json()
      setter(Array.isArray(json.data) ? json.data : [])
    } catch { /* keep previous list on failure */ }
  }, [])

  const fetchCustomers   = useCallback(() => fetchList('customers',  setCustomers),   [fetchList])
  const fetchJlLocations = useCallback(() => fetchList('locations',  setJlLocations), [fetchList])
  const fetchInspectors  = useCallback(() => fetchList('inspectors', setJlInspectors),[fetchList])
  const fetchTeams       = useCallback(() => fetchList('teams',      setJlTeams),     [fetchList])

  useEffect(() => { fetchCustomers(); fetchJlLocations(); fetchInspectors(); fetchTeams() },
    [fetchCustomers, fetchJlLocations, fetchInspectors, fetchTeams])

  // Generic admin add → POST, refresh that list, return the saved name so the
  // caller can immediately select it.
  const addToList = async (path, name, refresh, label) => {
    const clean = (name || '').trim()
    if (!clean) return ''
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      await refresh()
      return json.data?.name || clean
    } catch (err) {
      showToast(`Add ${label} failed: ${err.message}`, 'error')
      return ''
    }
  }
  const addCustomer  = (name) => addToList('customers',  name, fetchCustomers,   'customer')
  const addLocation  = (name) => addToList('locations',  name, fetchJlLocations, 'location')
  const addInspector = (name) => addToList('inspectors', name, fetchInspectors,  'inspector')
  const addTeam      = (name) => addToList('teams',      name, fetchTeams,       'team member')

  // Full ERP employee roster — merged straight into the Inspector Name /
  // Team Member dropdowns below, so every real employee is pickable with no
  // separate "add" or "link" step. The ERP's Attendance module then
  // recognizes a job's Inspector/Team names automatically by matching them
  // exactly against employees.full_name — no manual linking required.
  const [jlrEmployees, setJlrEmployees] = useState([]) // [{ id, empCode, name }]
  const fetchJlrEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/employees`)
      const json = await res.json()
      setJlrEmployees(Array.isArray(json.data) ? json.data : [])
    } catch { /* keep previous list on failure */ }
  }, [])
  useEffect(() => { fetchJlrEmployees() }, [fetchJlrEmployees])

  // Inspector Name options = every ERP employee + anyone separately added
  // via "+ Add" (labour/helpers with no ERP record — never affects
  // attendance since their name won't match any employee's full_name).
  const inspectorOptions = useMemo(
    () => Array.from(new Set([...jlrEmployees.map(e => e.name), ...jlInspectors.map(i => i.name)]))
      .sort((a, b) => a.localeCompare(b)),
    [jlrEmployees, jlInspectors]
  )

  // Team Member options = the same, plus the team-member roster (seeded +
  // admin-added labour/helpers).
  const teamOptions = useMemo(
    () => Array.from(new Set([
      ...jlrEmployees.map(e => e.name),
      ...jlInspectors.map(i => i.name),
      ...jlTeams.map(t => t.name),
    ])).sort((a, b) => a.localeCompare(b)),
    [jlrEmployees, jlInspectors, jlTeams]
  )

  const appendInspector = (field, name) => {
    const cur = (modalState[field] || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!cur.includes(name)) handleModalChange(field, [...cur, name].join(', '))
  }

  // Themed "Add new …" modal — opened ONLY by the + Add buttons (never by
  // clicking a field or its dropdown).
  const [addModal, setAddModal] = useState(null) // { kind, label, field } | null
  const [addModalValue, setAddModalValue] = useState('')
  const [addModalSaving, setAddModalSaving] = useState(false)
  const openAdd = (kind, label, field) => { setAddModalValue(''); setAddModal({ kind, label, field }) }
  const closeAdd = () => { setAddModal(null); setAddModalValue(''); setAddModalSaving(false) }
  const submitAddModal = async (e) => {
    e?.preventDefault?.()
    if (!addModal) return
    const name = addModalValue.trim()
    if (!name) return
    setAddModalSaving(true)
    let saved = ''
    if (addModal.kind === 'customer') saved = await addCustomer(name)
    else if (addModal.kind === 'location') saved = await addLocation(name)
    else if (addModal.kind === 'team') saved = await addTeam(name)
    else saved = await addInspector(name)
    setAddModalSaving(false)
    if (saved) {
      if (addModal.kind === 'inspector' || addModal.kind === 'team') appendInspector(addModal.field, saved)
      else handleModalChange(addModal.field, saved)
      closeAdd()
    }
  }

  const nextSerial = useMemo(() => {
    const max = entries.reduce((a, e) => Math.max(a, Number(e.sNo) || 0), 0)
    return max + 1
  }, [entries])

  // Everything except the status filter itself — the stats bar reacts to
  // region/date/search so its counts always match what's on screen, but
  // still shows all four statuses side by side rather than zeroing the
  // other three out the moment one status card is clicked.
  const statsBaseEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return entries.filter(e => {
      if (sourceFilter !== 'all' && e.source !== sourceFilter) return false
      if (dateFrom && (!e.entryDate || e.entryDate < dateFrom)) return false
      if (dateTo && (!e.entryDate || e.entryDate > dateTo)) return false
      if (!q) return true
      return [
        e.sNo, e.entryDate, e.client, e.workOrder, e.inspectorName, e.inspectorTeam,
        e.reference, e.location, e.natureOfJob, e.startDate, e.endDate, e.vehicleUsed,
        e.days, e.calculatedDays, e.manPower, e.manHours, e.drivenKm,
        e.jmps, e.tra, e.equipCL, e.vLog, e.tbt, e.status, e.completionDate,
        e.rept, e.exp, e.accounts, e.it, e.submissionDate, e.source,
        e.remark, e.remarks, e.stockRequisition, e.goodsIssueNote, e.consumption, e.gatePass,
      ].filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [entries, sourceFilter, dateFrom, dateTo, searchTerm])

  const stats = useMemo(() => ({
    total: statsBaseEntries.length,
    closed: statsBaseEntries.filter(e => e.status?.toLowerCase() === 'closed').length,
    inProgress: statsBaseEntries.filter(e => e.status?.toLowerCase() === 'in progress').length,
    pending: statsBaseEntries.filter(e => ['pending', ''].includes((e.status || '').toLowerCase())).length,
  }), [statsBaseEntries])

  const statusOptions = useMemo(() => [...new Set(entries.map(e => e.status).filter(Boolean))], [entries])
  // Cards know a status by name; the rows spell it however it was entered.
  const statusValueFor = useCallback(
    (name) => statusOptions.find(s => s.toLowerCase() === name) || name,
    [statusOptions])

  // Apply a token from the URL once the real spellings are known — a
  // dashboard link can arrive before statusOptions has anything in it.
  useEffect(() => {
    if (!requestedStatusToken) return
    if (requestedStatusToken === 'pending') setStatusFilter(STATUS_PENDING_ANY)
    else if (requestedStatusToken === 'all') setStatusFilter('all')
    else setStatusFilter(statusValueFor(requestedStatusToken.replace('_', ' ')))
    // Only on arrival — the admin's own choice from here must not be overridden
    // by a URL that is now stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedStatusToken, statusOptions])

  // The sidebar's "Add New Entry" shortcut arrives as ?add=1 — wait for
  // entries to load first so nextSerial (used to pre-fill S#) is correct,
  // then open the modal once and drop the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (loading || searchParams.get('add') !== '1') return
    if (canAccessAnyJlr) openAddModal()
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('add'); return next }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams, canAccessAnyJlr])
  const sourceOptions = useMemo(() => [...new Set(entries.map(e => e.source).filter(Boolean))], [entries])

  const filteredEntries = useMemo(() => {
    const list = statsBaseEntries.filter(e => {
      if (statusFilter === STATUS_PENDING_ANY) {
        if (!['pending', ''].includes((e.status || '').toLowerCase())) return false
      } else if (statusFilter !== 'all' && e.status !== statusFilter) return false
      return true
    })

    // Sorting (default: entry date newest first).
    // Entry-date comparator: rows with NO entry date ALWAYS sink to the bottom,
    // regardless of direction. `dir` orders the real dates (-1 newest first, 1 oldest first).
    const cmpEntry = (x, y, dir) => {
      const a = x.entryDate, b = y.entryDate
      if (!a && !b) return 0
      if (!a) return 1   // x has no date → x goes last
      if (!b) return -1  // y has no date → y goes last
      return a < b ? -dir : a > b ? dir : 0
    }
    const num = v => (v === '' || v == null ? NaN : Number(v))
    const sorted = [...list]
    sorted.sort((x, y) => {
      switch (sortBy) {
        case 'entryAsc':  return cmpEntry(x, y, 1)
        case 'entryDesc': return cmpEntry(x, y, -1)
        case 'sNoAsc':    return (num(x.sNo) || 0) - (num(y.sNo) || 0)
        case 'sNoDesc':   return (num(y.sNo) || 0) - (num(x.sNo) || 0)
        case 'clientAsc': return String(x.client).localeCompare(String(y.client))
        default:          return cmpEntry(x, y, -1)
      }
    })
    return sorted
  }, [statsBaseEntries, statusFilter, sortBy])

  // Any active table filter/search? (sort order isn't a filter.) When true, the
  // Export button switches to "Export by Filter" and exports exactly the rows
  // the user is currently looking at, bypassing the date-range modal.
  const hasActiveFilters =
    searchTerm.trim() !== '' || statusFilter !== 'all' || sourceFilter !== 'all' ||
    dateFrom !== '' || dateTo !== ''

  const handleExportClick = () => {
    if (hasActiveFilters) {
      if (filteredEntries.length === 0) return
      const fname = downloadJlrCsv(filteredEntries, 'Filtered')
      const msg = `Exported ${filteredEntries.length} filtered entr${filteredEntries.length === 1 ? 'y' : 'ies'} → ${fname}`
      showToast(msg, 'success')
    } else {
      // No filters → the from/to date-range modal (default behaviour).
      setExportFrom(''); setExportTo(''); setShowExport(true)
    }
  }

  const totalEntries = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStartIdx = (safePage - 1) * PAGE_SIZE
  const paginatedEntries = useMemo(() =>
    filteredEntries.slice(pageStartIdx, pageStartIdx + PAGE_SIZE),
    [filteredEntries, pageStartIdx])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, sourceFilter, sortBy, dateFrom, dateTo])
  useEffect(() => { if (currentPage !== safePage) setCurrentPage(safePage) }, [currentPage, safePage])

  const openAddModal = () => {
    setModalMode('add'); setEditingId(null)
    setModalState({ ...emptyEntry, sNo: nextSerial }); setIsModalOpen(true)
    setActiveTab('details'); setInspectorChangesList([]); resetInspectorChangeForm()
  }
  const openEditModal = entry => {
    setModalMode('edit'); setEditingId(entry.id)
    setActiveTab('details'); setInspectorChangesList(entry.inspectorChanges || []); resetInspectorChangeForm()
    const f = k => entry[k] || ''
    setModalState({
      sNo: f('sNo'), client: f('client'), workOrder: f('workOrder'),
      inspectorName: f('inspectorName'), inspectorTeam: f('inspectorTeam'),
      reference: f('reference'), location: f('location'), natureOfJob: f('natureOfJob'),
      startDate: f('startDate'), endDate: f('endDate'), entryDate: f('entryDate'),
      vehicleUsed: f('vehicleUsed'), days: f('days'), calculatedDays: f('calculatedDays'),
      manPower: f('manPower'), manHours: f('manHours'), drivenKm: f('drivenKm'),
      jmps: f('jmps'), tra: f('tra'), equipCL: f('equipCL'), vLog: f('vLog'), tbt: f('tbt'),
      status: f('status'), completionDate: f('completionDate'), rept: f('rept'),
      exp: f('exp'), accounts: f('accounts'), it: f('it'),
      submissionDate: f('submissionDate'), source: f('source'), remark: f('remark'), remarks: f('remarks'),
      remarkOperations: f('remarkOperations'), remarkQhse: f('remarkQhse'),
      remarkInventory: f('remarkInventory'), remarkAccounts: f('remarkAccounts'), remarkIt: f('remarkIt'),
      stockRequisition: f('stockRequisition'), goodsIssueNote: f('goodsIssueNote'),
      consumption: f('consumption'), gatePass: f('gatePass'),
    })
    setIsModalOpen(true)
  }
  const closeModal = () => {
    setIsModalOpen(false); setModalMode('add'); setEditingId(null); setModalState(emptyEntry)
    setActiveTab('details'); setInspectorChangesList([]); resetInspectorChangeForm()
  }
  const handleModalChange = (k, v) => setModalState(p => ({ ...p, [k]: v }))

  // Man Hours is auto-calculated: Calculated Days × Man Power × 10 (not manual).
  useEffect(() => {
    const cd = parseFloat(modalState.calculatedDays)
    const mp = parseFloat(modalState.manPower)
    const mh = (Number.isFinite(cd) && Number.isFinite(mp)) ? String(cd * mp * 10) : ''
    setModalState(prev => (prev.manHours === mh ? prev : { ...prev, manHours: mh }))
  }, [modalState.calculatedDays, modalState.manPower])

  // Reference dropdown: fixed options + "Others" (manual). Track the chosen
  // option separately so "Others" stays selected even before text is typed.
  const [refChoice, setRefChoice] = useState('')
  useEffect(() => {
    if (!isModalOpen) return
    const r = modalState.reference || ''
    setRefChoice(REFERENCE_OPTIONS.includes(r) ? r : (r ? 'Others' : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, editingId])

  // Who is acting, for the audit trail — this app has no session to read it
  // from server-side, so it rides along as a query param on every mutating
  // request, the same way ISO Forms already does it.
  const actorQuery = () => {
    const actorId = getActorId()
    const params = new URLSearchParams({ actorName: getActorName() })
    if (actorId) params.set('actorId', actorId)
    return params.toString()
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const rd = calculateDays(modalState.startDate, modalState.endDate)
    const days = rd ? String(rd) : ''
    const payload = toDB({ ...modalState, days, sNo: modalState.sNo || nextSerial })
    try {
      setSaving(true)
      let res
      if (modalMode === 'add') {
        res = await fetch(`${API_ENDPOINTS.JOB_LOG}?${actorQuery()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${editingId}?${actorQuery()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      await fetchEntries()
      closeModal()
      showToast(modalMode === 'add' ? 'Entry added successfully!' : 'Entry updated successfully!', 'success')
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Current comma-split roster for the field being edited on the Add/Replace
  // Inspector tab — this is the "who's currently on it" list for Replace.
  const currentRosterFor = (field) =>
    (modalState[field === 'team' ? 'inspectorTeam' : 'inspectorName'] || '')
      .split(',').map(s => s.trim()).filter(Boolean)

  const splitNames = (s) => (s || '').split(',').map(v => v.trim()).filter(Boolean)

  // Who can be taken off this job for the chosen field: the current roster
  // plus anyone brought in by an add/replace record, minus people who
  // already have a removal record (the server allows one removal per person;
  // delete that record from the history below to change it).
  const removableMembersFor = (field) => {
    const roster = currentRosterFor(field)
    const brought = inspectorChangesList
      .filter(c => c.fieldType === field && (c.changeType === 'add' || c.changeType === 'replace'))
      .map(c => c.newValue)
    const gone = new Set(inspectorChangesList.filter(c => c.changeType === 'remove').map(c => c.oldValue.trim().toLowerCase()))
    return Array.from(new Set([...roster, ...brought].filter(Boolean))).filter(n => !gone.has(n.trim().toLowerCase()))
  }

  // Pair people being replaced with their replacements:
  // equal counts → matched 1:1 in selection order; one side has exactly one
  // entry → that single person covers/replaces every entry on the other side.
  // Any other combination is ambiguous and rejected with a clear message.
  const pairReplacements = (oldArr, newArr) => {
    if (oldArr.length === newArr.length) return oldArr.map((o, i) => [o, newArr[i]])
    if (newArr.length === 1) return oldArr.map(o => [o, newArr[0]])
    if (oldArr.length === 1) return newArr.map(n => [oldArr[0], n])
    return null
  }

  const postInspectorChange = async (payload) => {
    const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${editingId}/inspector-changes?${actorQuery()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
    return fromDBInspectorChange(json.data)
  }

  const submitInspectorChange = async e => {
    e.preventDefault()
    setChangeError('')

    if (changeMode === 'remove') {
      // Attendance in the ERP is counted day by day from these two dates, so
      // every check that can be made here is made before anything is saved.
      const member = changeOldValue.trim()
      if (!member) { setChangeError('Select who is being removed from this job.'); return }
      if (!changeStart || !changeEnd) { setChangeError('Both dates are required: the day they started on this job, and the last day they were on it.'); return }
      if (!modalState.startDate) { setChangeError("Set this job's Start Date first (Job Details tab) — a person's days on the job are counted from it."); return }
      if (changeStart > changeEnd) { setChangeError('"On the job from" cannot be after "Last day on the job".'); return }
      if (changeStart < modalState.startDate) { setChangeError(`They cannot have started before the job did (job start: ${modalState.startDate}).`); return }
      if (modalState.endDate && changeEnd > modalState.endDate) { setChangeError(`They cannot stay past the job's end date (${modalState.endDate}).`); return }
      if (!window.confirm(`Remove ${member} from this job?\n\nTheir field attendance for this job will be counted only from ${changeStart} to ${changeEnd}. Days after ${changeEnd} will no longer count for them.`)) return
      try {
        setChangeSaving(true)
        const created = await postInspectorChange({
          field_type: changeField,
          change_type: 'remove',
          old_value: member,
          new_value: null,
          start_date: changeStart,
          end_date: changeEnd,
          reason: changeReason.trim() || null,
        })
        setInspectorChangesList(prev => [...prev, created])
        resetInspectorChangeForm()
        fetchEntries()
        showToast(`${member} removed from the job.`, 'success')
      } catch (err) {
        setChangeError(err.message)
        showToast(err.message, 'error')
      } finally {
        setChangeSaving(false)
      }
      return
    }

    const newArr = splitNames(changeNewValue)
    const oldArr = splitNames(changeOldValue)

    if (newArr.length === 0 || !changeStart || !changeEnd) {
      setChangeError('At least one inspector/team member and both dates are required.')
      return
    }

    let jobs = [] // [{ old_value, new_value }]
    if (changeMode === 'add') {
      jobs = newArr.map(n => ({ old_value: null, new_value: n }))
    } else {
      if (oldArr.length === 0 || !changeReason.trim()) {
        setChangeError('Replace requires who is being replaced and a reason.')
        return
      }
      const paired = pairReplacements(oldArr, newArr)
      if (!paired) {
        setChangeError('Select either the same number of people on both sides, or exactly one on one side.')
        return
      }
      jobs = paired.map(([o, n]) => ({ old_value: o, new_value: n }))
    }

    try {
      setChangeSaving(true)
      const created = []
      for (const job of jobs) {
        created.push(await postInspectorChange({
          field_type: changeField,
          change_type: changeMode,
          old_value: job.old_value,
          new_value: job.new_value,
          start_date: changeStart,
          end_date: changeEnd,
          reason: changeReason.trim() || null,
        }))
      }
      setInspectorChangesList(prev => [...prev, ...created])
      resetInspectorChangeForm()
      fetchEntries() // keep the View table's cached history in sync in the background
      showToast(changeMode === 'add' ? 'Inspector/team member added.' : 'Replacement recorded.', 'success')
    } catch (err) {
      setChangeError(err.message)
      showToast(err.message, 'error')
    } finally {
      setChangeSaving(false)
    }
  }

  // "End Replacement" — caps an ongoing replacement's end_date at today so it
  // stops reading as active, without deleting its history.
  const endReplacementNow = async (change) => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${editingId}/inspector-changes/${change.id}?${actorQuery()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end_date: today }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      const updated = fromDBInspectorChange(json.data)
      setInspectorChangesList(prev => prev.map(c => c.id === updated.id ? updated : c))
      fetchEntries()
      showToast('Replacement ended.', 'success')
    } catch (err) {
      showToast(`Could not end replacement: ${err.message}`, 'error')
    }
  }

  const deleteInspectorChange = async changeId => {
    if (!window.confirm('Delete this inspector change record?')) return
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${editingId}/inspector-changes/${changeId}?${actorQuery()}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      setInspectorChangesList(prev => prev.filter(c => c.id !== changeId))
      fetchEntries()
      showToast('Inspector change record deleted.', 'success')
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${id}?${actorQuery()}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setEntries(p => p.filter(e => e.id !== id))
      showToast('Entry deleted successfully!', 'success')
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  /* ── CSV upload ─────────────────────────────────────────── */
  const handleCsvUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    // reset input so same file can be re-uploaded
    e.target.value = ''
    const formData = new FormData()
    formData.append('csv', file)
    try {
      setLoading(true); setError(null)
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/upload-csv?mode=${csvMode}&${actorQuery()}`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      const rows = json.data ?? []
      setEntries(Array.isArray(rows) ? rows.map(fromDB) : [])
      const modeLabel = csvMode === 'replace' ? 'replaced all data with' : 'added'
      const msg = `${modeLabel} ${json.inserted} record(s) — total: ${Array.isArray(rows) ? rows.length : '?'}`
      showToast(msg, 'success')
    } catch (err) {
      showToast(`CSV import failed: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }
  /* ── Delete ALL entries ─────────────────────────────────── */
  // Multi-step "Delete All" guard:
  //   confirm1 → password → confirm2 → 5s undo countdown → actual delete.
  // Opening the flow just sets the first step; each modal button advances it.
  const handleDeleteAll = () => {
    setDeletePassword(''); setDeleteError(''); setDeleteStep('confirm1')
  }
  const closeDelete = () => setDeleteStep(null)

  const verifyDeletePassword = () => {
    const stored = localStorage.getItem('adminPassword') || 'admin123'
    if (deletePassword === stored) { setDeleteError(''); setDeleteStep('confirm2') }
    else setDeleteError('Incorrect admin password. Please try again.')
  }

  // The real deletion — only reached if the undo window elapses without an undo.
  const performDeleteAll = async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/clear-all?${actorQuery()}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      setEntries([])
      showToast('All entries deleted.', 'success')
    } catch (err) {
      showToast(`Delete all failed: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 5-second undo countdown. Entering the 'countdown' step arms a 5s timer;
  // leaving the step (Undo, or unmount) clears it so nothing gets deleted.
  useEffect(() => {
    if (deleteStep !== 'countdown') return
    setDeleteCountdown(5)
    const tick = setInterval(() => setDeleteCountdown(c => (c > 0 ? c - 1 : 0)), 1000)
    const done = setTimeout(() => { setDeleteStep(null); performDeleteAll() }, 5000)
    return () => { clearInterval(tick); clearTimeout(done) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteStep])

  const rv = v => v || '—'

  /* ── Theme-aware stat card ──────────────────────────────── */
  // Clicking a card filters the table to what it counts, and clicking it again
  // clears that filter. With one card picked the others grey out, so the bar
  // shows what the table below is now listing.
  const applyStatusFilter = (value) => {
    setStatusFilter(prev => (prev === value ? 'all' : value))
  }
  const statusCardActive = (value) => statusFilter === value
  const anyStatusPicked = statusFilter !== 'all'

  const StatCard = ({ accent, label, value, Icon, filterValue }) => {
    const clickable = filterValue !== undefined
    const active = clickable && statusCardActive(filterValue)
    const dimmed = clickable && anyStatusPicked && !active
    return (
    <div
      onClick={clickable ? () => applyStatusFilter(filterValue) : undefined}
      title={clickable ? `Show only ${label}` : undefined}
      style={{
      flex: '1 1 180px',
      background: T.statCardBg,
      border: active ? `2px solid ${accent}` : T.statBorderFn(accent),
      borderRadius: 20,
      padding: 24,
      minHeight: 140,
      boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      boxShadow: T.statCardShadow(accent),
      cursor: clickable ? 'pointer' : 'default',
      transition: 'filter 0.25s ease, opacity 0.25s ease, border-color 0.2s ease, transform 0.2s ease',
      ...(dimmed ? { filter: 'grayscale(1)', opacity: 0.45 } : null),
    }}
      onMouseEnter={clickable ? (e) => {
        if (!active) e.currentTarget.style.border = `2px solid ${accent}`
        e.currentTarget.style.transform = 'translateY(-2px)'
      } : undefined}
      onMouseLeave={clickable ? (e) => {
        if (!active) e.currentTarget.style.border = T.statBorderFn(accent)
        e.currentTarget.style.transform = ''
      } : undefined}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: accent,
        display: 'inline-flex', alignItems: 'center', gap: 6
      }}>{Icon && <Icon size={13} />}{label}</span>
      <span style={{ fontSize: 34, fontWeight: 800, color: accent }}>{value}</span>
    </div>
    )
  }

  /* ── Theme-aware input style ──────────────────────────────── */
  const inputStyle = {
    background: T.inputBg,
    border: T.inputBorder,
    color: T.inputColor,
    borderRadius: 16,
    padding: '12px 16px',
    fontSize: 14,
    transition: 'all 0.2s ease',
    outline: 'none',
    fontFamily: 'inherit',
  }

  // Matches the plain .modal-form select CSS (style.css) — the trigger
  // button for a StyledSelect standing in for one of those <select>s needs
  // that same look inline, since the CSS rule only targets the <select> tag.
  const modalSelectStyle = {
    border: '1px solid #dcdce3',
    borderRadius: 14,
    padding: '12px 14px',
    background: '#f9f9fb',
    color: '#14141c',
    fontFamily: 'inherit',
    fontSize: 14,
    cursor: 'pointer',
    width: '100%',
  }

  return (
    <div className="all-records-page job-log-page" style={{
      background: T.pageBg, minHeight: '100vh', color: T.titleColor
    }}>

      {/* ══ BANNER ════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 24, padding: '32px 32px 28px', flexWrap: 'wrap',
        background: T.bannerBg, borderBottom: T.bannerBorder,
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 4, height: 22, borderRadius: 4,
              background: '#d7263d',
              flexShrink: 0
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.18em', color: T.eyebrowColor
            }}>Inspection Log Description</span>
          </div>
          {/* Title */}
          <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: T.titleColor, lineHeight: 1.2 }}>
            Job Log Description
          </h2>
          {/* Subtitle */}
          <p style={{ margin: 0, fontSize: 14, color: T.subtitleColor, lineHeight: 1.6 }}>
            Track inspection activities and field job entries across all regions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4 }}>
          {/* Hidden CSV file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCsvUpload}
          />
          {/* CSV mode toggle — admin / full access only */}
          {(isAdminContext || jlrPerms?.full) && (
            <div style={{
              display: 'flex', borderRadius: 12, overflow: 'hidden',
              border: '1px solid #e0e0e6', fontSize: 13, fontWeight: 600,
            }}>
              <button type="button" onClick={() => setCsvMode('append')}
                onMouseEnter={() => setCsvHovered('append')}
                onMouseLeave={() => setCsvHovered(null)}
                style={{
                  padding: '9px 14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: csvMode === 'append' ? '#d7263d' : '#fff',
                  color: csvMode === 'append' ? '#fff' : (csvHovered === 'append' ? '#d7263d' : '#7a7a8c'),
                  transform: csvMode !== 'append' && csvHovered === 'append' ? 'translateY(-2px)' : 'translateY(0)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: '100%', boxSizing: 'border-box',
                }}>
                <Plus size={15} /> Append
              </button>
              <button type="button" onClick={() => setCsvMode('replace')}
                onMouseEnter={() => setCsvHovered('replace')}
                onMouseLeave={() => setCsvHovered(null)}
                style={{
                  padding: '9px 14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: csvMode === 'replace' ? '#d7263d' : '#fff',
                  color: csvMode === 'replace' ? '#fff' : (csvHovered === 'replace' ? '#d7263d' : '#7a7a8c'),
                  transform: csvMode !== 'replace' && csvHovered === 'replace' ? 'translateY(-2px)' : 'translateY(0)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: '100%', boxSizing: 'border-box',
                }}>
                <RefreshCw size={15} /> Replace
              </button>
            </div>
          )}
          {(isAdminContext || jlrPerms?.full) && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => csvInputRef.current?.click()}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Upload size={16} /> Import CSV
            </button>
          )}
          {/* Read-only, unlike Import/Delete: it downloads exactly what is
              already on screen, so any user who can see the register — not
              only admins / full JLR access — can export it. */}
          {entries.length > 0 && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleExportClick}
              disabled={loading || entries.length === 0}
              title={hasActiveFilters ? 'Export the currently filtered/searched rows' : 'Export by date range'}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={16} /> {hasActiveFilters ? 'Export by Filter' : 'Export'}
            </button>
          )}
          {entries.length > 0 && (isAdminContext || jlrPerms?.full) && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent',
                border: '1px solid #ffd1d8',
                color: '#d7263d',
                padding: '10px 18px', borderRadius: 16,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fdecea'
                e.currentTarget.style.borderColor = '#d7263d'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#ffd1d8'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Trash2 size={15} /> Delete All
            </button>
          )}
          {canAccessAnyJlr && (
            <button type="button" className="primary-btn" onClick={openAddModal}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={17} /> Add Entry
            </button>
          )}
        </div>
      </div>

      {/* ══ STATUS MESSAGES ════════════════════════════════════ */}
      {error && (
        <div style={{
          margin: '0 32px', marginTop: 16, padding: '12px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg,#fff5f6,#ffe8ea)',
          border: '1px solid #ffd1d8', color: '#d7263d',
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} /> {error}
          <button type="button" onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#d7263d', display: 'inline-flex' }}><X size={16} /></button>
        </div>
      )}

      {/* ══ STATS BAR ═════════════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: '18px 32px',
        background: T.filtersBg,
        borderBottom: T.bannerBorder,
      }}>
        <StatCard accent="#595966" Icon={ClipboardList} label="Total Jobs" value={stats.total} filterValue="all" />
        <StatCard accent="#1d814c" Icon={CheckCircle2} label="Closed" value={stats.closed} filterValue={statusValueFor('closed')} />
        <StatCard accent="#c87e1c" Icon={Clock} label="In Progress" value={stats.inProgress} filterValue={statusValueFor('in progress')} />
        <StatCard accent="#7a7a8c" Icon={CircleDashed} label="Pending" value={stats.pending} filterValue={STATUS_PENDING_ANY} />
      </div>

      {/* ══ FILTERS ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: 16, padding: '20px 32px',
        background: T.filtersBg,
        borderBottom: T.bannerBorder,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: T.searchIconColor, pointerEvents: 'none', display: 'inline-flex'
          }}><Search size={15} /></span>
          <input
            type="text"
            style={{ ...inputStyle, paddingLeft: 40, width: '100%', boxSizing: 'border-box' }}
            placeholder="Search any field — client, WO, inspector, location, status, remarks…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Status filter */}
        <StyledSelect
          style={{ ...inputStyle, minWidth: 160, cursor: 'pointer' }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          extraOptions={[{ value: STATUS_PENDING_ANY, label: 'Pending / not set' }]}
          emptyOptionLabel="All Status"
          emptyOptionValue="all"
        />
        {/* Region filter */}
        <StyledSelect
          style={{ ...inputStyle, minWidth: 160, cursor: 'pointer' }}
          value={sourceFilter}
          onChange={setSourceFilter}
          options={sourceOptions}
          emptyOptionLabel="All Regions"
          emptyOptionValue="all"
        />
        {/* Sort */}
        <StyledSelect
          style={{ ...inputStyle, minWidth: 180, cursor: 'pointer' }}
          value={sortBy}
          onChange={setSortBy}
          options={[]}
          extraOptions={[
            { value: 'entryDesc', label: 'Entry Date — Newest first' },
            { value: 'entryAsc', label: 'Entry Date — Oldest first' },
            { value: 'sNoDesc', label: 'S# — High to Low' },
            { value: 'sNoAsc', label: 'S# — Low to High' },
            { value: 'clientAsc', label: 'Client — A to Z' },
          ]}
        />
        {/* Entry-date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Filter by entry date">
          <span style={{ fontSize: 12, fontWeight: 600, color: T.clearBtnColor, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> From</span>
          <StyledDatePicker value={dateFrom} max={dateTo || undefined}
            style={{ ...inputStyle, padding: '10px 10px', minWidth: 0, cursor: 'pointer' }}
            onChange={setDateFrom} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.clearBtnColor }}>To</span>
          <StyledDatePicker value={dateTo} min={dateFrom || undefined}
            style={{ ...inputStyle, padding: '10px 10px', minWidth: 0, cursor: 'pointer' }}
            onChange={setDateTo} />
        </div>
        {/* Clear */}
        <button
          type="button"
          style={{
            background: 'transparent', border: T.clearBtnBorder,
            color: T.clearBtnColor, padding: '12px 18px', borderRadius: 16,
            fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSourceFilter('all'); setDateFrom(''); setDateTo(''); setSortBy('entryDesc') }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#d7263d'
            e.currentTarget.style.color = '#d7263d'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = T.clearBtnBorder.split(' ').pop()
            e.currentTarget.style.color = T.clearBtnColor
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><X size={14} /> Clear Filters</span>
        </button>
      </div>

      {/* ══ TABLE SHELL ════════════════════════════════════════ */}
      <div className="job-log-table-shell">
        <div className="all-records-table-container">
          <div className="all-records-table-scroll">
            <table className="all-records-table">
              <thead>
                {/* Column group labels */}
                <tr>
                  {COL_GROUPS.map(g => (
                    <th key={g.label} colSpan={g.span} style={{
                      background: g.color, color: g.textColor,
                      borderBottom: `2px solid ${g.borderColor}`,
                      borderRight: `2px solid ${g.borderColor}`,
                      textAlign: 'center', fontSize: 10, fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                      padding: '8px 12px', whiteSpace: 'nowrap',
                    }}>{g.label}</th>
                  ))}
                </tr>
                {/* Column labels */}
                <tr>
                  <th style={{ minWidth: 32 }}></th>
                  <th style={{ minWidth: 48 }}>S#</th>
                  <th>Entry Date</th><th>Client</th><th>Work Order</th>
                  <th>Inspector Name</th><th>Inspector Team</th><th>Reference</th>
                  <th>Location</th><th>Nature of Job</th>
                  <th>Job Start</th><th>Job End</th><th>Vehicle Plate</th>
                  <th title="Days on job">Days</th>
                  <th title="Calculated days (start→end)">Calc. Days</th>
                  <th title="No. of personnel">Man Power</th>
                  <th title="Total man-hours">Man Hrs</th>
                  <th title="Km driven">Driven Km</th>
                  <th title="Job Method Procedures">JMPs</th>
                  <th title="Task Risk Assessment">TRA</th>
                  <th title="Equipment Checklist">Equip C/L</th>
                  <th title="Vehicle Log">V. Log</th>
                  <th title="Tool Box Talk">TBT</th>
                  <th>Status</th><th>Completion</th>
                  <th title="Report">REPT</th>
                  <th title="Expenses">EXP</th>
                  <th>Accounts</th>
                  <th title="IT Department">I.T</th>
                  <th>Submission</th><th>Region</th>
                  <th title="Stock Requisition">Stock Req</th>
                  <th title="Goods Issue Note">GIN</th>
                  <th>Consumption</th>
                  <th title="Gate Pass">Gate Pass</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={37} style={{ padding: '60px 32px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 36 }}>⏳</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#7a7a8c' }}>Loading job log entries…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={37} style={{ padding: '60px 32px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <ClipboardList size={44} color="#b9c0cf" />
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#1f1f27' }}>No job log entries found</span>
                        <span style={{ fontSize: 14, color: '#7a7a8c' }}>
                          {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all'
                            ? 'Try adjusting your filters or search term.'
                            : 'Click "Add Entry" to create the first entry, or import a CSV.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry, idx) => {
                    const serial = totalEntries - (pageStartIdx + idx)
                    const changes = entry.inspectorChanges || []
                    const inspectorReplaceReason = changes
                      .filter(c => c.fieldType === 'inspector' && c.changeType === 'replace')
                      .map(c => `${c.oldValue} → ${c.newValue} (${c.startDate} – ${c.endDate})\n${c.reason || ''}`.trim())
                      .join('\n\n')
                    const teamReplaceReason = changes
                      .filter(c => c.fieldType === 'team' && c.changeType === 'replace')
                      .map(c => `${c.oldValue} → ${c.newValue} (${c.startDate} – ${c.endDate})\n${c.reason || ''}`.trim())
                      .join('\n\n')
                    const isExpanded = expandedRows.has(entry.id)
                    return (
                      <React.Fragment key={entry.id}>
                      <tr>
                        <td style={{ textAlign: 'center' }}>
                          {changes.length > 0 && (
                            <button type="button" onClick={() => toggleRowExpanded(entry.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7a8c', display: 'flex', alignItems: 'center' }}
                              title="Show inspector/team change history">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="all-records-cell-id" style={{ fontWeight: 700, color: '#595966', textAlign: 'center' }}>{serial}</td>
                        <td className="all-records-cell-date">{rv(entry.entryDate)}</td>
                        <td className="all-records-cell-text" style={{ fontWeight: 600 }}>{rv(entry.client)}</td>
                        <td className="all-records-cell-text">
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                            background: '#f0f7ff', color: '#2f74bf', fontSize: 12, fontWeight: 700
                          }}>
                            {rv(entry.workOrder)}</span>
                        </td>
                        <td className="all-records-cell-text">
                          {rv(entry.inspectorName)}
                          {inspectorReplaceReason && <InfoTooltip text={inspectorReplaceReason} />}
                        </td>
                        <td className="all-records-cell-text" style={{ color: '#595966' }}>
                          {rv(entry.inspectorTeam)}
                          {teamReplaceReason && <InfoTooltip text={teamReplaceReason} />}
                        </td>
                        <td className="all-records-cell-text" style={{ fontSize: 12, color: '#7a7a8c' }}>{rv(entry.reference)}</td>
                        <td className="all-records-cell-text">{rv(entry.location)}</td>
                        <td className="all-records-cell-description">{rv(entry.natureOfJob)}</td>
                        <td className="all-records-cell-date">{rv(entry.startDate)}</td>
                        <td className="all-records-cell-date">{rv(entry.endDate)}</td>
                        <td className="all-records-cell-text">{rv(entry.vehicleUsed)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center', fontWeight: 700 }}>{rv(entry.days)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center', fontWeight: 700 }}>{rv(entry.calculatedDays)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center' }}>{rv(entry.manPower)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center' }}>{rv(entry.manHours)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center' }}>{rv(entry.drivenKm)}</td>
                        <td className="all-records-cell-text" style={{ textAlign: 'center', fontWeight: 700 }}>{rv(entry.jmps)}</td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.tra} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.equipCL} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.vLog} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.tbt} /></td>
                        <td><StatusBadge value={entry.status} /></td>
                        <td className="all-records-cell-date">{rv(entry.completionDate)}</td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.rept} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.exp} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.accounts} /></td>
                        <td style={{ textAlign: 'center' }}><YesNoBadge value={entry.it} /></td>
                        <td className="all-records-cell-date">{rv(entry.submissionDate)}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                            background: '#f4f4f7', color: '#595966', fontSize: 12, fontWeight: 600
                          }}>
                            {rv(entry.source)}</span>
                        </td>
                        <td className="all-records-cell-text" style={{ fontSize: 12, color: '#a87800' }}>{rv(entry.stockRequisition)}</td>
                        <td className="all-records-cell-text" style={{ fontSize: 12, color: '#a87800' }}>{rv(entry.goodsIssueNote)}</td>
                        <td className="all-records-cell-text" style={{ fontSize: 12, color: '#a87800' }}>{rv(entry.consumption)}</td>
                        <td className="all-records-cell-text" style={{ fontSize: 12, color: '#a87800' }}>{rv(entry.gatePass)}</td>
                        <td className="all-records-cell-remarks" style={{ maxWidth: 240, fontSize: 13, color: '#595966', whiteSpace: 'pre-line' }}>
                          {rv([
                            entry.remarkOperations && `Operations: ${entry.remarkOperations}`,
                            entry.remarkQhse && `QHSE: ${entry.remarkQhse}`,
                            entry.remarkInventory && `Inventory: ${entry.remarkInventory}`,
                            entry.remarkAccounts && `Accounts: ${entry.remarkAccounts}`,
                            entry.remarkIt && `IT: ${entry.remarkIt}`,
                            entry.remark, entry.remarks,
                          ].filter(Boolean).join('\n'))}
                        </td>
                        <td className="all-records-cell-actions" style={{ textAlign: 'center' }}>
                          <div className="all-records-actions" style={{ justifyContent: 'center' }}>
                            {canAccessAnyJlr ? (
                              <button type="button" className="action-btn edit small"
                                onClick={() => openEditModal(entry)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Pencil size={13} /> Edit</button>
                            ) : (
                              <span style={{ fontSize: 12, color: '#aaa' }}>View only</span>
                            )}
                            {(isAdminContext || jlrPerms?.full) && (
                              <button type="button" className="action-btn delete small"
                                onClick={() => handleDelete(entry.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={13} /> Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && changes.map(c => (
                        <tr key={`${entry.id}-change-${c.id}`} style={{ background: '#fafafd' }}>
                          <td></td>
                          <td colSpan={36} style={{ padding: '8px 16px', fontSize: 12.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6,
                                background: '#f0f7ff', color: '#2f74bf', fontWeight: 700
                              }}>{rv(entry.workOrder)}</span>
                              <span style={{ color: '#7a7a8c', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                                {c.fieldType === 'team' ? 'Inspector Team' : 'Inspector Name'}
                              </span>
                              <span style={{
                                padding: '2px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5,
                                background: c.changeType === 'replace' ? '#fff5f6' : c.changeType === 'remove' ? '#fff7e6' : '#f0fff8',
                                color: c.changeType === 'replace' ? '#d7263d' : c.changeType === 'remove' ? '#b26a00' : '#1d814c',
                              }}>{c.changeType}</span>
                              <span style={{ fontWeight: 600, color: '#1f1f27' }}>
                                {c.changeType === 'replace' ? `${c.oldValue} → ${c.newValue}` : c.changeType === 'remove' ? `− ${c.oldValue}` : `+ ${c.newValue}`}
                              </span>
                              <span style={{ color: '#595966' }}>{c.changeType === 'remove' ? `on the job ${c.startDate} – ${c.endDate}` : `${c.startDate} – ${c.endDate}`}</span>
                              {c.reason && <InfoTooltip text={c.reason} />}
                            </div>
                          </td>
                        </tr>
                      ))}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          totalItems={totalEntries}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="entries"
        />
      </div>

      {/* ══ MODAL ════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 900 }}>

            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: '#fdf2f3', border: '1px solid #ffd1d8', color: '#d7263d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                }}>
                  {modalMode === 'add' ? <BsClipboardData /> : <BsPencilSquare />}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>
                    {modalMode === 'add' ? 'Add Job Log Entry' : 'Edit Job Log Entry'}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>
                    {modalMode === 'add' ? 'Fill in the job details below.' : 'Update the entry information.'}
                  </p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeModal} style={{ display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
            </div>

            {modalMode === 'edit' && (
              <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0' }}>
                {[
                  { key: 'details', label: 'Job Details' },
                  { key: 'inspector', label: 'Add / Replace / Remove Inspector' },
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700,
                      border: '1px solid #e0e0e6', borderBottom: activeTab === t.key ? '1px solid #fff' : '1px solid #e0e0e6',
                      background: activeTab === t.key ? '#fff' : '#f4f4f7',
                      color: activeTab === t.key ? '#d7263d' : '#7a7a8c',
                      cursor: 'pointer', marginBottom: -1, position: 'relative', zIndex: activeTab === t.key ? 1 : 0,
                    }}
                  >{t.label}</button>
                ))}
              </div>
            )}

            {activeTab === 'details' && (
            <form className="modal-form" onSubmit={handleSubmit}>

              <ModalSection Icon={BsBriefcase} title="Operations" hint="Job & field details" />
              <div className="form-row">
                <label><span>S#</span>
                  <input type="text" value={modalState.sNo} readOnly
                    style={{ background: '#f4f4f7', color: '#aaa', cursor: 'not-allowed' }} /></label>
                <label><span>Entry Date *</span>
                  <StyledDatePicker value={modalState.entryDate}
                    disabled={!canEdit('operations')}
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('entryDate', v)} /></label>
                <div className="field-col"><span>Client *</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SearchSelect
                        value={modalState.client}
                        options={Array.from(new Set([
                          ...customers.map(c => c.name),
                          ...(modalState.client ? [modalState.client] : []),
                        ]))}
                        placeholder="— Select customer —"
                        searchPlaceholder="Search customer…"
                        disabled={!canEdit('operations')}
                        onChange={val => handleModalChange('client', val)} />
                    </div>
                    {isAdminContext && (
                      <button type="button" className="ghost-btn" onClick={() => openAdd('customer', 'Customer', 'client')}
                        disabled={!canEdit('operations')} title="Add new customer"
                        style={{ padding: '0 12px', whiteSpace: 'nowrap', flexShrink: 0, height: 42 }}>+ Add</button>
                    )}
                  </div></div>
                <label><span>Work Order *</span>
                  <input type="text" value={modalState.workOrder} placeholder="WO-XXXX" required
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('workOrder', e.target.value)} /></label>
                <label><span>Reference</span>
                  <StyledSelect
                    value={refChoice}
                    disabled={!canEdit('operations')}
                    options={REFERENCE_OPTIONS}
                    extraOptions={[{ value: 'Others', label: 'Others (enter manually)' }]}
                    emptyOptionLabel="— Select —"
                    style={modalSelectStyle}
                    onChange={v => {
                      setRefChoice(v)
                      if (v === 'Others') {
                        // keep any existing custom text; clear if it was a fixed option
                        if (REFERENCE_OPTIONS.includes(modalState.reference)) handleModalChange('reference', '')
                      } else {
                        handleModalChange('reference', v) // fixed option or '' (Select)
                      }
                    }} />
                  {refChoice === 'Others' && (
                    <input type="text" value={modalState.reference} placeholder="Enter reference…"
                      style={{ marginTop: 6 }}
                      disabled={!canEdit('operations')}
                      onChange={e => handleModalChange('reference', e.target.value)} />
                  )}
                </label>
              </div>

              <div className="form-row">
                <div className="field-col"><span>Inspector Name *</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MultiSelect
                        value={modalState.inspectorName}
                        options={inspectorOptions}
                        placeholder="Select inspector(s)…"
                        disabled={!canEdit('operations')}
                        onChange={val => handleModalChange('inspectorName', val)} />
                    </div>
                    {isAdminContext && (
                      <button type="button" className="ghost-btn" onClick={() => openAdd('inspector', 'Inspector', 'inspectorName')}
                        disabled={!canEdit('operations')} title="Add new inspector"
                        style={{ padding: '0 12px', whiteSpace: 'nowrap', flexShrink: 0, height: 42 }}>+ Add</button>
                    )}
                  </div></div>
                <div className="field-col"><span>Inspector Team</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MultiSelect
                        value={modalState.inspectorTeam}
                        options={teamOptions}
                        placeholder="Select team members…"
                        disabled={!canEdit('operations')}
                        onChange={val => handleModalChange('inspectorTeam', val)} />
                    </div>
                    {isAdminContext && (
                      <button type="button" className="ghost-btn" onClick={() => openAdd('team', 'Team member', 'inspectorTeam')}
                        disabled={!canEdit('operations')} title="Add new team member"
                        style={{ padding: '0 12px', whiteSpace: 'nowrap', flexShrink: 0, height: 42 }}>+ Add</button>
                    )}
                  </div></div>
              </div>

              <div className="form-row">
                <div className="field-col"><span>Location *</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SearchSelect
                        value={modalState.location}
                        options={Array.from(new Set([
                          ...jlLocations.map(l => l.name),
                          ...KNOWN_LOCATIONS,
                          ...(modalState.location ? [modalState.location] : []),
                        ])).sort((a, b) => String(a).localeCompare(String(b)))}
                        placeholder="— Select location —"
                        searchPlaceholder="Search location…"
                        disabled={!canEdit('operations')}
                        onChange={val => handleModalChange('location', val)} />
                    </div>
                    {isAdminContext && (
                      <button type="button" className="ghost-btn" onClick={() => openAdd('location', 'Location', 'location')}
                        disabled={!canEdit('operations')} title="Add new location"
                        style={{ padding: '0 12px', whiteSpace: 'nowrap', flexShrink: 0, height: 42 }}>+ Add</button>
                    )}
                  </div></div>
                <label><span>Nature of Job *</span>
                  <input type="text" value={modalState.natureOfJob} placeholder="Visual / NDT …" required
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('natureOfJob', e.target.value)} /></label>
                <label><span>Job Start</span>
                  <StyledDatePicker value={modalState.startDate}
                    disabled={!canEdit('operations')}
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('startDate', v)} /></label>
                <label><span>Job End</span>
                  <StyledDatePicker value={modalState.endDate}
                    disabled={!canEdit('operations')}
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('endDate', v)} /></label>
                <label><span>Vehicle Plate No.</span>
                  <input type="text" value={modalState.vehicleUsed} placeholder="Hilux-12"
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('vehicleUsed', e.target.value)} /></label>
              </div>

              <div className="form-row">
                <label><span>Days (auto)</span>
                  <input type="number" readOnly
                    value={calculateDays(modalState.startDate, modalState.endDate)}
                    style={{ background: '#f4f4f7', color: '#aaa', cursor: 'not-allowed' }} /></label>
                <label><span>Calculated Days</span>
                  <input type="number" min="0" value={modalState.calculatedDays}
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('calculatedDays', e.target.value)} /></label>
                <label><span>Man Power</span>
                  <input type="number" min="0" value={modalState.manPower} placeholder="0"
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('manPower', e.target.value)} /></label>
                <label><span>Man Hrs (auto)</span>
                  <input type="number" readOnly value={modalState.manHours}
                    title="Calculated Days × Man Power × 10"
                    placeholder="0"
                    style={{ background: '#f4f4f7', color: '#777', cursor: 'not-allowed' }} /></label>
                <label><span>Driven Km</span>
                  <input type="number" min="0" value={modalState.drivenKm} placeholder="0"
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('drivenKm', e.target.value)} /></label>
                <label><span>JMPs</span>
                  <input type="number" min="0" value={modalState.jmps} placeholder="0"
                    disabled={!canEdit('operations')}
                    onChange={e => handleModalChange('jmps', e.target.value.replace(/[^0-9]/g, ''))} /></label>
              </div>

              <div className="form-row">
                <label><span>Status</span>
                  <StyledSelect
                    value={modalState.status}
                    disabled={!canEdit('operations')}
                    options={['In Progress', 'Closed', 'Pending', 'On Hold']}
                    emptyOptionLabel="— Select —"
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('status', v)}
                  /></label>
                <label><span>Completion Date</span>
                  <StyledDatePicker value={modalState.completionDate}
                    disabled={!canEdit('operations')}
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('completionDate', v)} /></label>
                <label><span>Region *</span>
                  <StyledSelect
                    value={modalState.source}
                    disabled={!canEdit('operations')}
                    options={modalState.source && !REGION_OPTIONS.includes(modalState.source)
                      ? [...REGION_OPTIONS, modalState.source]
                      : REGION_OPTIONS}
                    emptyOptionLabel="— Select region —"
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('source', v)}
                  /></label>
              </div>

              <label><span>Operations Remarks</span>
                <textarea rows="2" value={modalState.remarkOperations}
                  placeholder="Operations notes…"
                  disabled={!canEdit('operations')}
                  onChange={e => handleModalChange('remarkOperations', e.target.value)} />
              </label>

              <ModalSection Icon={MdOutlineHealthAndSafety} title="QHSE" hint="Safety & compliance" />
              <div className="form-row">
                <label><span>TRA</span>
                  <input type="number" min="0" value={modalState.tra}
                    placeholder="e.g. 3"
                    disabled={!canEdit('qhse')}
                    onChange={e => handleModalChange('tra', e.target.value)} /></label>
                <label><span>TBT</span>
                  <input type="number" min="0" value={modalState.tbt}
                    placeholder="e.g. 5"
                    disabled={!canEdit('qhse')}
                    onChange={e => handleModalChange('tbt', e.target.value)} /></label>
                {[['equipCL', 'Equip C/L'], ['vLog', 'V. Log'], ['rept', 'REPT (Report)']].map(([f, l]) => (
                  <label key={f}><span>{l}</span>
                    <StyledSelect
                      value={modalState[f]}
                      disabled={!canEdit('qhse')}
                      // Legacy rows may hold an older value (e.g. "Done") — keep it
                      // selectable so editing an entry never silently clears it.
                      options={modalState[f] && !QHSE_OPTIONS.includes(modalState[f])
                        ? [...QHSE_OPTIONS, modalState[f]]
                        : QHSE_OPTIONS}
                      emptyOptionLabel="— Select —"
                      style={modalSelectStyle}
                      onChange={v => handleModalChange(f, v)}
                    />
                  </label>
                ))}
                <label><span>Submission Date</span>
                  <StyledDatePicker value={modalState.submissionDate}
                    disabled={!canEdit('qhse')}
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('submissionDate', v)} /></label>
              </div>
              <label><span>QHSE Remarks</span>
                <textarea rows="2" value={modalState.remarkQhse}
                  placeholder="QHSE notes…"
                  disabled={!canEdit('qhse')}
                  onChange={e => handleModalChange('remarkQhse', e.target.value)} />
              </label>

              <ModalSection Icon={BsBoxSeam} title="Inventory" hint="Stock & materials" />
              <div className="form-row">
                <label><span>Stock Requisition</span>
                  <input type="text" value={modalState.stockRequisition}
                    placeholder="SR-XXXX or notes"
                    disabled={!canEdit('inventory')}
                    onChange={e => handleModalChange('stockRequisition', e.target.value)} /></label>
                <label><span>Goods Issue Note (GIN)</span>
                  <input type="text" value={modalState.goodsIssueNote}
                    placeholder="GIN-XXXX"
                    disabled={!canEdit('inventory')}
                    onChange={e => handleModalChange('goodsIssueNote', e.target.value)} /></label>
                <label><span>Consumption</span>
                  <input type="text" value={modalState.consumption}
                    placeholder="Items consumed"
                    disabled={!canEdit('inventory')}
                    onChange={e => handleModalChange('consumption', e.target.value)} /></label>
                <label><span>Gate Pass</span>
                  <input type="text" value={modalState.gatePass}
                    placeholder="GP-XXXX"
                    disabled={!canEdit('inventory')}
                    onChange={e => handleModalChange('gatePass', e.target.value)} /></label>
              </div>
              <label><span>Inventory Remarks</span>
                <textarea rows="2" value={modalState.remarkInventory}
                  placeholder="Inventory notes…"
                  disabled={!canEdit('inventory')}
                  onChange={e => handleModalChange('remarkInventory', e.target.value)} />
              </label>

              <ModalSection Icon={BsWallet2} title="Accounts" hint="Expenses & sign-off" />
              <div className="form-row">
                {[['exp', 'EXP (Expenses)'], ['accounts', 'Accounts']].map(([f, l]) => (
                  <label key={f}><span>{l}</span>
                    <StyledSelect
                      value={modalState[f]}
                      disabled={!canEdit('accounts')}
                      options={['Yes', 'No', 'Done', 'Pending']}
                      emptyOptionLabel="— Select —"
                      style={modalSelectStyle}
                      onChange={v => handleModalChange(f, v)}
                    />
                  </label>
                ))}
              </div>
              <label><span>Accounts Remarks</span>
                <textarea rows="2" value={modalState.remarkAccounts}
                  placeholder="Accounts notes…"
                  disabled={!canEdit('accounts')}
                  onChange={e => handleModalChange('remarkAccounts', e.target.value)} />
              </label>

              <ModalSection Icon={BsLaptop} title="IT" hint="IT sign-off" />
              <div className="form-row">
                <label><span>I.T</span>
                  <StyledSelect
                    value={modalState.it}
                    disabled={!canEdit('it')}
                    options={['Yes', 'No', 'Done', 'Pending']}
                    emptyOptionLabel="— Select —"
                    style={modalSelectStyle}
                    onChange={v => handleModalChange('it', v)}
                  /></label>
              </div>
              <label><span>IT Remarks</span>
                <textarea rows="2" value={modalState.remarkIt}
                  placeholder="IT notes…"
                  disabled={!canEdit('it')}
                  onChange={e => handleModalChange('remarkIt', e.target.value)} />
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {saving
                    ? 'Saving…'
                    : modalMode === 'add' ? 'Add Entry' : 'Save Changes'}
                </button>
              </div>
            </form>
            )}

            {activeTab === 'inspector' && modalMode === 'edit' && (
              <div className="modal-form">
                <ModalSection Icon={Users} title="Add / Replace / Remove Inspector" hint="Mid-job team changes, with dates" />

                <form onSubmit={submitInspectorChange}>
                  {/* Step 1 — what are you doing, and to which field */}
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: '#9a9aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    1. What do you want to do?
                  </p>
                  <div className="form-row">
                    <div className="field-col"><span>Action</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { v: 'add', label: '+ Add someone new' },
                          { v: 'replace', label: '⇄ Replace someone' },
                          { v: 'remove', label: '− Remove someone' },
                        ].map(m => (
                          <button key={m.v} type="button" onClick={() => { setChangeMode(m.v); setChangeOldValue(''); setChangeNewValue('') }}
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                              cursor: 'pointer',
                              border: changeMode === m.v ? '1px solid #d7263d' : '1px solid #e0e0e6',
                              background: changeMode === m.v ? '#fdf2f3' : '#fff',
                              color: changeMode === m.v ? '#d7263d' : '#595966',
                            }}>{m.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="field-col"><span>On which field?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ v: 'inspector', label: 'Inspector Name' }, { v: 'team', label: 'Inspector Team' }].map(f => (
                          <button key={f.v} type="button"
                            onClick={() => { setChangeField(f.v); setChangeOldValue(''); setChangeNewValue('') }}
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                              cursor: 'pointer',
                              border: changeField === f.v ? '1px solid #d7263d' : '1px solid #e0e0e6',
                              background: changeField === f.v ? '#fdf2f3' : '#fff',
                              color: changeField === f.v ? '#d7263d' : '#595966',
                            }}>{f.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: '20px 0 8px', fontSize: 12.5, fontWeight: 700, color: '#9a9aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    2. {changeMode === 'replace' ? 'Who is being replaced, and by whom?' : changeMode === 'remove' ? 'Who is being removed from this job?' : 'Who is being added?'}
                  </p>
                  {changeMode === 'remove' && (
                    <div className="form-row">
                      <div className="field-col"><span>Person currently on the job *</span>
                        <StyledSelect
                          style={modalSelectStyle}
                          value={changeOldValue}
                          options={removableMembersFor(changeField)}
                          placeholder="Select who is being removed…"
                          onChange={v => {
                            setChangeOldValue(v)
                            if (!changeStart && modalState.startDate) setChangeStart(modalState.startDate) // usually they were on it from day one
                          }} />
                      </div>
                    </div>
                  )}
                  {changeMode === 'replace' && (
                    <div className="form-row">
                      <div className="field-col"><span>Currently on the job (select one or more) *</span>
                        <MultiSelect
                          value={changeOldValue}
                          options={currentRosterFor(changeField)}
                          placeholder="Select who is being replaced…"
                          onChange={setChangeOldValue} />
                      </div>
                    </div>
                  )}

                  {changeMode !== 'remove' && (
                  <div className="form-row">
                    <div className="field-col"><span>{changeMode === 'replace' ? 'Replacing with (select one or more) *' : 'New inspector(s)/team member(s) *'}</span>
                      <MultiSelect
                        value={changeNewValue}
                        options={changeField === 'team' ? teamOptions : inspectorOptions}
                        placeholder="Select one or more…"
                        onChange={setChangeNewValue} />
                    </div>
                  </div>
                  )}
                  {changeMode === 'replace' && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9a9aaa' }}>
                      Tip: pick the same number on both sides to match them one-to-one, or leave just one side with a single person if one person is covering — or being covered by — several.
                    </p>
                  )}

                  <p style={{ margin: '20px 0 8px', fontSize: 12.5, fontWeight: 700, color: '#9a9aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    3. {changeMode === 'remove' ? 'For which days was this person on the job?' : 'For which dates, and why?'}
                  </p>
                  <div className="form-row">
                    <label><span>{changeMode === 'remove' ? 'On the job from *' : 'Start Date *'}</span>
                      <StyledDatePicker value={changeStart} style={modalSelectStyle} onChange={setChangeStart}
                        min={changeMode === 'remove' ? (modalState.startDate || undefined) : undefined}
                        max={changeMode === 'remove' ? (modalState.endDate || undefined) : undefined} /></label>
                    <label><span>{changeMode === 'remove' ? 'Last day on the job *' : 'End Date *'}</span>
                      <StyledDatePicker value={changeEnd} style={modalSelectStyle} onChange={setChangeEnd}
                        min={changeMode === 'remove' ? (changeStart || modalState.startDate || undefined) : undefined}
                        max={changeMode === 'remove' ? (modalState.endDate || undefined) : undefined} /></label>
                  </div>
                  {changeMode === 'remove' && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9a9aaa' }}>
                      Field attendance for this person is counted only from the first date to the last date here (Sundays and holidays in between included, unless they are on leave). Days after the last date no longer count for them; the rest of the team is not affected.
                    </p>
                  )}

                  <label><span>Reason{changeMode === 'replace' ? ' *' : ' (optional)'}</span>
                    <textarea rows="2" value={changeReason}
                      placeholder={changeMode === 'replace' ? 'Why is this person being replaced?' : changeMode === 'remove' ? 'Why are they leaving the job? (optional)' : 'Optional note…'}
                      onChange={e => setChangeReason(e.target.value)} />
                  </label>

                  {changeError && <p style={{ color: '#d7263d', fontSize: 13, fontWeight: 600 }}>{changeError}</p>}

                  <div className="modal-actions">
                    <button type="submit" className="primary-btn" disabled={changeSaving}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {changeSaving ? 'Saving…' : changeMode === 'replace' ? 'Replace' : changeMode === 'remove' ? 'Remove from Job' : '+ Add'}
                    </button>
                  </div>
                </form>

                <ModalSection Icon={ClipboardList} title="History for this entry" hint={`${inspectorChangesList.length} record(s)`} />
                {inspectorChangesList.length === 0 ? (
                  <p style={{ color: '#9a9aaa', fontSize: 13 }}>No add / replace / remove history recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {inspectorChangesList.map(c => {
                      const today = new Date().toISOString().slice(0, 10)
                      const isActiveReplacement = c.changeType === 'replace' && c.endDate >= today
                      return (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexWrap: 'wrap',
                        border: '1px solid #efeff2', borderRadius: 8, fontSize: 13,
                      }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: c.changeType === 'replace' ? '#fff5f6' : c.changeType === 'remove' ? '#fff7e6' : '#f0fff8',
                          color: c.changeType === 'replace' ? '#d7263d' : c.changeType === 'remove' ? '#b26a00' : '#1d814c',
                        }}>{c.changeType}</span>
                        <span style={{ color: '#7a7a8c', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          {c.fieldType === 'team' ? 'Team' : 'Inspector'}
                        </span>
                        <span style={{ flex: 1, fontWeight: 600 }}>
                          {c.changeType === 'replace' ? `${c.oldValue} → ${c.newValue}` : c.changeType === 'remove' ? `− ${c.oldValue}` : `+ ${c.newValue}`}
                        </span>
                        <span style={{ color: '#595966' }}>{c.changeType === 'remove' ? `on the job ${c.startDate} – ${c.endDate}` : `${c.startDate} – ${c.endDate}`}</span>
                        {c.reason && <InfoTooltip text={c.reason} />}
                        {isActiveReplacement && canEdit('operations') && (
                          <button type="button" className="ghost-btn" onClick={() => endReplacementNow(c)}
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            title="Close this replacement's end date to today">
                            End Replacement
                          </button>
                        )}
                        {!isActiveReplacement && c.changeType === 'replace' && (
                          <span style={{ fontSize: 11, color: '#9a9aaa', fontWeight: 600 }}>Ended</span>
                        )}
                        {(isAdminContext || jlrPerms?.full) && (
                          <button type="button" className="action-btn delete small" onClick={() => deleteInspectorChange(c.id)} title="Delete this record entirely">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="ghost-btn" onClick={closeModal}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Themed "Add new …" modal (Customer / Location / Inspector) */}
      {addModal && (
        <div className="modal-overlay" style={{ zIndex: 2100 }}>
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: '#fdf2f3', border: '1px solid #ffd1d8', color: '#d7263d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700,
                }}>+</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Add {addModal.label}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>Saved to the list and selected right away.</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeAdd} style={{ display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
            </div>
            <form className="modal-form" onSubmit={submitAddModal}>
              <label><span>{addModal.label} Name</span>
                <input type="text" autoFocus value={addModalValue}
                  placeholder={`Enter ${addModal.label.toLowerCase()} name…`}
                  onChange={e => setAddModalValue(e.target.value)} />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeAdd} disabled={addModalSaving}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={addModalSaving || !addModalValue.trim()}>
                  {addModalSaving ? 'Saving…' : `Add ${addModal.label}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export to CSV / Excel — pick month & year, exports from all entries */}
      {showExport && (
        <div className="modal-overlay" style={{ zIndex: 2100 }} onMouseDown={e => { if (e.target === e.currentTarget) setShowExport(false) }}>
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: '#fdf2f3', border: '1px solid #ffd1d8', color: '#d7263d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><FileSpreadsheet size={22} /></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Export Data</h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>Pick a From–To date range, or export everything.</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowExport(false)} style={{ display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
            </div>
            <div className="modal-form">
              {/* Single date-range calendar: From → To (by entry date) */}
              <div className="form-row">
                <label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> From</span>
                  <StyledDatePicker value={exportFrom} max={exportTo || undefined}
                    onChange={setExportFrom}
                    style={{ border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px', background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                </label>
                <label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> To</span>
                  <StyledDatePicker value={exportTo} min={exportFrom || undefined}
                    onChange={setExportTo}
                    style={{ border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px', background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                </label>
              </div>
              <p style={{ margin: '0 0 2px', fontSize: 12.5, color: '#9a9aaa' }}>
                Dono khaali chhoro to poora data export hoga. {(exportFrom || exportTo) && (
                  <button type="button" onClick={() => { setExportFrom(''); setExportTo('') }}
                    style={{ background: 'none', border: 'none', color: '#d7263d', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 12.5 }}>
                    Clear dates
                  </button>
                )}
              </p>

              <div style={{
                marginTop: 4, padding: '12px 16px', borderRadius: 12,
                background: exportRows.length ? 'linear-gradient(135deg,#e8fff3,#d4f8e3)' : '#f4f4f7',
                border: `1px solid ${exportRows.length ? '#c3ecd4' : '#e0e0e6'}`,
                color: exportRows.length ? '#1d814c' : '#7a7a8c',
                fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <ClipboardList size={16} />
                {exportRows.length > 0
                  ? `${exportRows.length} entr${exportRows.length === 1 ? 'y' : 'ies'} will be exported`
                  : 'No entries fall in this date range'}
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setShowExport(false)}>Cancel</button>
                <button type="button" className="primary-btn" onClick={handleExport} disabled={exportRows.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE-ALL GUARDED FLOW ═══════════════════════════════
          confirm → admin password → confirm → 5s undo countdown → delete */}
      {deleteStep && (
        <div className="modal-overlay" style={{ zIndex: 2200 }}
          onMouseDown={e => { if (e.target === e.currentTarget && deleteStep !== 'countdown') closeDelete() }}>
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: '#fdf2f3', border: '1px solid #ffd1d8', color: '#d7263d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{deleteStep === 'countdown' ? <Clock size={22} /> : <AlertTriangle size={22} />}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    {deleteStep === 'confirm1' && 'Delete All Entries?'}
                    {deleteStep === 'password' && 'Admin Password Required'}
                    {deleteStep === 'confirm2' && 'Final Confirmation'}
                    {deleteStep === 'countdown' && 'Deleting All Data…'}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>
                    {deleteStep === 'countdown' ? 'You can still undo.' : `${entries.length} entries in the Job Log`}
                  </p>
                </div>
              </div>
              {deleteStep !== 'countdown' && (
                <button className="close-modal-btn" onClick={closeDelete} style={{ display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
              )}
            </div>

            <div className="modal-form">
              {/* Step 1 — first confirmation */}
              {deleteStep === 'confirm1' && (
                <>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#3a3a44', lineHeight: 1.6 }}>
                    Are you sure you want to delete <strong>ALL {entries.length}</strong> entries?
                    This wipes the entire Job Log.
                  </p>
                  <div className="modal-actions">
                    <button type="button" className="ghost-btn" onClick={closeDelete}>Cancel</button>
                    <button type="button" className="primary-btn" onClick={() => { setDeleteError(''); setDeleteStep('password') }}>
                      Continue
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 — admin password */}
              {deleteStep === 'password' && (
                <>
                  <label><span>Enter Admin Password</span>
                    <input type="password" autoFocus value={deletePassword}
                      placeholder="Admin password"
                      onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') verifyDeletePassword() }} />
                  </label>
                  {deleteError && (
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#d7263d', fontWeight: 600 }}>{deleteError}</p>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="ghost-btn" onClick={closeDelete}>Cancel</button>
                    <button type="button" className="primary-btn" onClick={verifyDeletePassword} disabled={!deletePassword}>
                      Verify
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 — final confirmation */}
              {deleteStep === 'confirm2' && (
                <>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#3a3a44', lineHeight: 1.6 }}>
                    Password verified. Do you really want to <strong>delete all {entries.length} entries</strong>?
                    After you confirm, you'll get a 5-second window to undo.
                  </p>
                  <div className="modal-actions">
                    <button type="button" className="ghost-btn" onClick={closeDelete}>No, keep data</button>
                    <button type="button" onClick={() => setDeleteStep('countdown')}
                      style={{
                        background: '#d7263d', color: '#fff', border: 'none',
                        padding: '10px 18px', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                      }}>
                      <Trash2 size={15} /> Yes, delete all
                    </button>
                  </div>
                </>
              )}

              {/* Step 4 — 5s undo countdown (only an Undo button) */}
              {deleteStep === 'countdown' && (
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                  <div style={{
                    width: 88, height: 88, margin: '4px auto 14px', borderRadius: '50%',
                    border: '4px solid #ffd1d8', color: '#d7263d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 38, fontWeight: 800,
                  }}>{deleteCountdown}</div>
                  <p style={{ margin: '0 0 18px', fontSize: 14, color: '#3a3a44' }}>
                    Deleting all data in <strong>{deleteCountdown}s</strong>… press Undo to cancel.
                  </p>
                  <button type="button" onClick={closeDelete}
                    style={{
                      background: '#1d814c', color: '#fff', border: 'none',
                      padding: '12px 28px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    <RefreshCw size={16} /> Undo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobLogDescription
