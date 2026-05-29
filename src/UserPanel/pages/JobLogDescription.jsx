import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'

/* ─────────────────────────────────────────────────────────────
   DB ↔ component field mapping helpers
   DB uses snake_case; component uses camelCase
───────────────────────────────────────────────────────────── */
const fromDB = row => ({
  id:             row.id,
  sNo:            row.s_no            != null ? String(row.s_no)            : '',
  client:         row.client          || '',
  workOrder:      row.work_order      || '',
  inspectorName:  row.inspector_name  || '',
  inspectorTeam:  row.inspector_team  || '',
  reference:      row.reference       || '',
  location:       row.location        || '',
  natureOfJob:    row.nature_of_job   || '',
  startDate:      row.start_date      ? row.start_date.slice(0,10)      : '',
  endDate:        row.end_date        ? row.end_date.slice(0,10)        : '',
  entryDate:      row.entry_date      ? row.entry_date.slice(0,10)      : '',
  vehicleUsed:    row.vehicle_used    || '',
  days:           row.days            != null ? String(row.days)            : '',
  calculatedDays: row.calculated_days != null ? String(row.calculated_days) : '',
  manPower:       row.man_power       != null ? String(row.man_power)       : '',
  manHours:       row.man_hours       != null ? String(row.man_hours)       : '',
  drivenKm:       row.driven_km       != null ? String(row.driven_km)       : '',
  jmps:           row.jmps            || '',
  tra:            row.tra             || '',
  equipCL:        row.equip_cl        || '',
  vLog:           row.v_log           || '',
  tbt:            row.tbt             || '',
  status:         row.status          || '',
  completionDate: row.completion_date ? row.completion_date.slice(0,10) : '',
  rept:           row.rept            || '',
  exp:            row.exp             || '',
  iso:            row.iso             || '',
  accounts:       row.accounts        || '',
  it:             row.it              || '',
  submissionDate: row.submission_date ? row.submission_date.slice(0,10) : '',
  source:         row.source          || '',
  remark:         row.remark          || '',
})

const toDB = data => ({
  s_no:            data.sNo            || null,
  client:          data.client         || null,
  work_order:      data.workOrder      || null,
  inspector_name:  data.inspectorName  || null,
  inspector_team:  data.inspectorTeam  || null,
  reference:       data.reference      || null,
  location:        data.location       || null,
  nature_of_job:   data.natureOfJob    || null,
  start_date:      data.startDate      || null,
  end_date:        data.endDate        || null,
  entry_date:      data.entryDate      || null,
  vehicle_used:    data.vehicleUsed    || null,
  days:            data.days           || null,
  calculated_days: data.calculatedDays || null,
  man_power:       data.manPower       || null,
  man_hours:       data.manHours       || null,
  driven_km:       data.drivenKm       || null,
  jmps:            data.jmps           || null,
  tra:             data.tra            || null,
  equip_cl:        data.equipCL        || null,
  v_log:           data.vLog           || null,
  tbt:             data.tbt            || null,
  status:          data.status         || null,
  completion_date: data.completionDate || null,
  rept:            data.rept           || null,
  exp:             data.exp            || null,
  iso:             data.iso            || null,
  accounts:        data.accounts       || null,
  it:              data.it             || null,
  submission_date: data.submissionDate || null,
  source:          data.source         || null,
  remark:          data.remark         || null,
})

/* ─────────────────────────────────────────────────────────────
   Known locations (used for datalist autocomplete)
───────────────────────────────────────────────────────────── */
const KNOWN_LOCATIONS = [
  "Ali North-1","Baudero-1","Bukhari North X-1","Chand South-1","Chanda-5","Gormani-1",
  "Bukhari North-1","Hadaf X-1","Hayat-2","Hilong Yard","KDT-45","Khaddi-2","Lakhman-01",
  "Maroja-1","Mazari-19","Mazari-19 / Hayat-2","Muban-5","Mubarak South-1","Oderolal",
  "Ptis Lab","Ptis Office","Qadir Pur Deep X-1","Qamar X-1","Rajani-10","Rajani-12",
  "Sachoo-01","Sachu-1","Sohrab Deep-7","South Deep-4","South Deep-7","Suhan-1","Sui 109",
  "Sutiari Deep 4","Sutiari Deep 4-Mubarak South-1","Tando Adam","Tando Adam Yard",
  "TRS Department","Unarpur-1","Warar-1","Chanda","Hilong-2","RAJANI-2",
  "Sonro-17/Rajani-09/Gulsher-1","Halipota-6","Gulsher-1","Mazari Yard","Well Serve Yard",
  "Tangri","South Bozdar","Gharo Yard","Rahim X-1","HL Yard","BELA WEST X-1","BELA WEST-1",
  "CHANG-1","KARACHI OFFICE","Khadi-2","Mazari Deep -1","MAZARI SOUTH DEEP-1","PTIS",
  "RAHIM-4","SUKHI SOUTH-1","ZPEC YARD","Hayat-1","Port Qasim Yard","Bin Qasim Yard",
  "Khaur North-1","KHASKHELI YARD","Rajani Deep - 10","Zamzama N-2","Khaur X-1",
  "Roshan-1 / Rehman-5","Rehman -5","Khaskheli","IS YARD SUKKAR","SUKKUR",
  "KHASKHELI BASE","ZAMZAMA SUB - 02","Drillnetic Energy Yard","Naimt West","SMD-1",
  "Guni-1","Bari-09","Naimat Yard","Muqim-1 - Naimat Basal","Muqim-1","Naimat SWD-1",
  "Sutiari Deep-3","Rajani-9","Halipota-06","Moroja-01","MKK Tubing Yard","Sonro - 17",
  "Ghungro East - 1","Kakhman - 1","Lafif - 17","New Makran Eng","Naimat / SWD2","Bari-11",
  "Buzdar Deep - 9","Naimat Basal","Buzdar S - 09","BSD - 09","Saleh - 2","Chahg-1",
  "Mubann V","Rawal - 1","Mazari -17","Ghungru Deep -1","Tando","Bari-10","Rajani-5",
  "South Mazari Deep-1","Sonro - 15","Mazari-12","Dhabi North - 1","Saleh - 5","Rehab - 1",
  "Miano - 24","Sonro - 18","Ramdhani - 1","Sukan - 1","Mehar - 5","CHAK 25 WELL 1",
  "QADIRPUR - 59","Nur West - 1","MELA - 6","KHANJAR KHEL - 1","WASSAN-1","ZIN DEEP - 2",
  "NOOR WEST - 1","NASHPA - 9","SHAWA-X1","SOORGI X-3","KUNNAR - 12","KOT SARANG YARD",
  "RANGLI","KOT SARANG","KHADEJI YARD","PASAKI N-EAST-1","GAHRI X-2","PAND SULTANI",
  "SINOPAK-149","SHAWA-1","GARHI X-2","SIAB - 1","MONGINO-1","WEST DEEP - 2",
  "DHOK HUSSAIN","TOGH-1","QP Deep - 6","HUMAK YARD","CCDC YARD","TALAGANG","ADHI-31",
  "MISIRAL X-1","ADHI-10","PINDORI-10","KHANJAR KHEEL","DHOKE SULTAN 02","PHARPUR X-1",
  "CCDC-23","JSL Yard","Maripur Yard","Manzalai-3","Tolanj East-1 - Manzalai-3",
  "Benari X-1","Nusrat X-1","Makori-1","Siemens Yard","Port Qasim","Siemens Facility",
  "SUKKAR YARD","Nakurji-2 - Nusrat X-1","SPRINT YARD","I 10/3 Yard","GULARCHI",
  "SHAH DINO","RAJPARI-1","REHMAN-5","JSL YARD","Tando M.Khan","Pirani","PAHAR PUR X-1",
  "ADHI-32","CCDC-07","BADEELX-1","Nuricon I 10-3 Yard","I-10 YARD","CREEK WAY HOTEL",
  "RAJHANI-11","Margand X-1","Wireline Yard KK","Bolan East-1 - Sukkur Wireline","Bari-12",
  "Unarpur - 2","Malhan-1","MKK WEST CAMP (C.Y)","RIZQ-3","Mitha - 1","Hawksbay Yard",
  "Sawan Pipe Yard","Miano - 28","Miano - 22","DAMACH-1","Bari-13","MULAKI-02","WFT Yard",
  "Anton-2001","Scomi Yard","GOTKI","KDT 47","Sui-106","Schlumberger","Meher 5","Rehman-6",
  "PASAKHI-2/ N-3","Multi Location","Hilong - 17 / Pirani","IOT Yard","Adhi # 07 Pipe Yard",
  "AYUB X-1","Agility Yard","Gambat South","Tarnal ITS Yard","Adhi Well 9","Nooh X-1",
  "Adhi Well 07","Kandkhot","SUI H125","D- Suktan X- 1","PPL Yard","Mari - 1","Rahib-1",
  "SUI - 108","Jani - 1","Gulsher - 2","WDI - 3","MKK","MITHA - 2","Mari-2","Mari Rig",
  "MPCL YARD","Mari - 119","Mari - 112","Miraj-1","ZIA Yard Karachi","K.K Yard",
  "Dhulian Yard","Balkasar - 1","Latif - 18","Nashpa -5A","Moregend X - 1",
  "Pasaki west Deep 2","Sanghar","YYK","Bharia","Rig-33","Gadab","D & M Yard","Zamzama-3",
  "HL-4002","ZPEC-33","RANGUNWARI -01","ADHI-34","Rig-3","Crescent Mill","Nakurji-1",
  "SCR-1","Joyamir-4","Rig-66","Anton-4001","N-2","Peshawar Ring Road","Hyderabad",
  "Sprint","Sinopec -77","Thora Deep-3","Bitro-1 SLR-215","MMKS-1","Mela-7","MMKS-2",
  "Mulaki East-1","Matli","Hilong-17/ Paniro-1","Mazari-20","Dhoke Sultan South X-1",
  "MEC","Adhi South X-4","Qadirpur-14","Bukhari Deep-4","Sawan-4","Muzaffargarh",
  "Hilong-16","Jhandiyal -2","Ghakkar Phatak Yard","Z S 4 , ZARGHOON","Nuricon Yard",
  "HL-02","N-4","Rajian-11","Kathiar-1","Hilong-5","Jan-2","Sinopec-77","WALI-01",
  "JHANG BAHATAR YARD","South Mazari Deep-2","Khandkot","Mulaki-5","Dharian-1",
  "Karachi Yard","Jang Bahtar Yard","Balkasar Yard","Weatherford Yard","Adhi South X-3",
  "Bari-15","Latif-23","Rehman-07","Jatoi -1","Ranjho-1","Cholistan X-1","Qadirpur-15",
  "Tangri-04","Adhi South X-2","Pasaki-11 / N-55","I.S Enterprises Yard Tarnol","Hilal-1",
  "Miano-25","Pasaki-10","Rahim X-2","Dhoro-1","Lucky Rod X-1","Sui Well-110","Mazari-18",
  "Singhar-01","BOBY DEEP X-1","DEEP X-1 A","Seni Gombat-1","S.Zia Yard Islamabad",
  "Mitto-01","Tando Muhammad Khan","Iqbal-01","Washuk-01","Togh Bala-01","Dakhni Plant",
  "Mazari-11","Sajan-01","Zaur-03","Turk Deep North-01","QP West X-1","SUI-112",
  "Nooriabad","Sui Gas Plant","Kashmore","Khaur Yard","Zia Yard","Sheen Dund-01",
  "Nangpir-01","SHARF-3","MD-21","Baqqa-1","KUC-1","Qadirpur-62 OGDCL","Sial-1 OGDCL",
  "Rig","South Mazari Deep-3","Singhar-1","Deutag Yard Burhama","Mari Deep-19",
  "Parwaz Deep-1","Mehtab-1","SUI","Qadirpur Well","Toot Deep-1/Hilong-2","Saindad-1",
  "Manzalai-07/KCA T-72","mehar-4","Pasakhi WIW-1","Kambir-1","UEPL","NASHPA-5",
  "MAKORI","OGDCL N3","latif 22","Gagani South-1","T 202","North Akri -4","Rig Mari-1",
  "MOL","Burhan yard","Joya mair-1 rig","Sui 72 PPL","baqa-3","miano-20","Pasakhi-7",
  "Tando Alam Mari","Uch plant","Suleman-1","Qadirpur","Khanot-1","Tangri-3","Tando Alam",
  "Hilong-9","MD-18","MPCL Daharki","Mangrio-02","Ludano deep-1","Jugan-1","Pasaki-12",
  "Moolan-2","Sawan Gas Plant","Rig ccdc 26","togh-02","Qasar x-1","Exalo-303","Rajian",
  "Rig CCDC-23","Mela-8 south","Khipro East X-1","Taj-01","Ranjho-2","Bijoro-3","Exalo",
  "Ccdc32","Turk Deep North-2","Bannu- west-1","Rehman-8","Sofiya-03","Patani-1",
  "Turk-1","IPC","Tipu-1","Nuricon energy services limited","Fazil-01","South Mazari-12",
  "Mazari-16","Petro service","Mulaki west-1","Exalo 303","Bari 14","Buzdar South Deep 7",
  "DGK-1","Exalo 2000","umar-4","HL-09","Saman 1","PKL South",
  "IVCC yard Sunder industrial estate Lahore","Naimat west-7","malkani-1","Zaman 01",
  "Bhatti north 1","RIG ZJ30","mehar-3","Mari DEEP-17","Mohar-1","Latif-10 w/o",
  "Taj 03","Latif-10 qadanwari","Naimat west DT-01","Mari Rig-1","mulaki-6","Hl 5",
  "Mehar-6","TAJ-4","Kunnar 10","HL-9","Exalo-305","Lakho 1","Zpec Yard","Islamabad",
  "Tolanj west 2","ccdc adhi","Ratana-05","Tajedi-02","Miano-26","Mithrau-14","Zaur West-2",
  "Tando Alam Oil Complex","kunnar KD-11","KCA DEUTAG","Rig Anton 2001","Sui 43",
  "Sinopec 077","Adhi South-5","Naimat west-8","Ccdc -31","TAAJ-06","TURI-01","Nim East 01",
  "Pasakhi 07","OGDCL N-4","Mazari-14","Kunnar oil field","Umar-5","BALKASSAR YARD",
  "Sawan-10","uet-1","TARNOL-1","kumbh-4","South Buzdar-1","Sutiari Deep 01",
  "SHAHPUARABAD-01","Sahib Dino","Chang - 1","Latif 21","MANZALAI-04","Hilong-21",
  "Bhatti north-2","NMW DT-02","Jugan-2","Saddar 1","DHABI SOUTH-03","Takhat-2","UET-1",
  "Jabery South-3","CNLC yard","KK DT2","CCDC 30","ADHI-35","Sui 115","Minwal X-1",
  "Bobi 11","MSU beta","Khaskheli-19","KK DT-04","Mehar","Kumbh-5","POL","SLR 215",
  "Shewa-2","UMAR - 6","Duetag Drilling","Mari","Adhi south -06","CCDC-30","UET-01",
  "Murad x 1","Mari-105 W/O","CHANDA-07","Sakhi-08","MAKORI-5","Mohar-2","KK DT-06",
  "Kharo-1","Takhat-3","JHANDIAL-3","JHIM EAST - X1","MAIWAND X-1","Sono-9","Taj South-1",
  "BADIN","Adam 02","Jagir-05","SFS Yard Tando Adam","ADHI WDW-1","SANGJANI YARD","MD-20",
  "Taj-08","RAZGIR-01","DHOK PARACHA ISLAMABAD","HALAINI-2","Ghazij - 4","Isra - 01",
  "Sanwal khan","Halipota-7","Qabul-3HZ","Taj-Ws-01","BALOCH 2","Uch-35","Bettani",
  "Brohi -1","MD-22","Ghazij-05","OGDCL","Mohar-3","Turk Deep North 01","Rizq-5",
  "Dabhi South-02","TAJ-10","BROHI-1","MAHAAN-1","Spinwam - 01","Pk Battani - 2",
  "Takhat 04","Baqar Deep 02","Unar pur - 1","Sono - 7","OCTG / Daharki Yard",
  "Sukhi Deep-1","Sawan North Deep -1","Kandewaro-1","Tando Ala Yar","Walidad-1",
  "Baloch -2","Ghazij - 6","Tes-1 Unerpur-1","Rafat-1","Sohnal-1","H-13/4 Islamabad",
  "Soghari North-1","126H Well","Sabzkhani-1","Takhat-5 / TES-1","Shahu - 1",
  "Zorkham South-5","Ghajij-7","Shawal-2","Pateji X-1","Surhadi-1","SND-1 / HILONG-21",
  "CHAK 202-1 . Sadqabad","Takri -01","Surhadi-1 / Tes-1","Sonro-10 W/O / Anton-2001",
  "DARS WEST-1","MAMI KHEL-1 Kohat","IWSS ISB YARD","Umar-8","Chack-02","Lodano-4",
  "Dhok Sultan -3","Bettani Deep-1","Sabzkani-1 / Rig Hilong 9","Bhittai-6","Baragzai X-1",
  "Ghazij - 8","Umar-04","Well Chuck 2-2","Samabhi-1","K-5","Soharb Deep-1",
  "Anton-2001 / Dhabi-6","Chak 202-2","FAAKIR-1","Bilal X-1","DHAMACH-1","HALIPOTA-8",
  "MAKORI DEEP-03","Water Disposal Well-5","Bolan East-2","Soho -1","Umer 9","OGDCL ZJ 30",
  "UEPL Takri-2","RAJAHU-1","Bolan west-1","Takri-2","Tubing Yard (kk)","Ghazij CF-A1",
  "FAAKIR-01","LAL X-1/ HL-21","Khaitian-1","Pasaki-14","Gurgalot X-1","WIW Umar-11",
  "Toot deep-01","Jakarho North-1","Chakar-1","Qadirpur 64","Shawal-4","Barki-1","BSD-10",
  "BITRISM EAST -1","Jhakrao N-01","Jhandial-2","Sahan-1","Makhad x-1","Exalo 305",
  "Sonro-9 / Anton-2001","Sahan-1 / Anton-2001","Zarghun South Ghazij-1","BLT-1",
  "OGDCL SK-750","RAJIAN -02","Dars deep 01A","Pasakhi 13 ( OGDCL )","Ghazij-11 Well",
  "Hassu 1","Dharian-01","TIBRI-1","Pindori -9","MORO BYPASS","PALI DEEP 01",
  "EXALO RIZQ 06 SEWAN","Mari Deep-24 Well","Kausar -1 SWD-1","Chandio-01",
  "Well Gaha Wah-1","S.ZIA-UL-HAQ YARD","Miano TGS HZ 1","IWSS","Kunnar WIW 1 Rig N5",
  "Speen-1 well","BSD-11","Tando Allahyar","Dars West-3","SAHITO-1","Sujawal Block",
  "REHMAN-09","NWDT-03","pasaki-13","WIW-1 KUNNAR","THUL WEST-1 KANDANWARI","Shams-1 Well",
  "SUMRO-1 WELL","CCDC-27","Queeta Al Noor Restaurant","Pasakhi North East-02","Lahore",
  "Adhi/Punjab","Soho -2 well","Said Pur-01","BSD-2","well SONO-10","well chack-203-1",
  "SONO-10","Mari-127H","Lashkani-1","Chak 63-5","Mari-128H","Khirun-1-OGDCL",
  "TDM-OGDCL",
].sort()

const emptyEntry = {
  sNo:'', client:'', workOrder:'', inspectorName:'', inspectorTeam:'',
  reference:'', location:'', natureOfJob:'', startDate:'', endDate:'',
  entryDate:'', vehicleUsed:'', days:'', calculatedDays:'', manPower:'',
  manHours:'', drivenKm:'', jmps:'', tra:'', equipCL:'', vLog:'', tbt:'',
  status:'', completionDate:'', rept:'', exp:'', iso:'', accounts:'', it:'',
  submissionDate:'', source:'', remark:''
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
  { label: 'Identification',       span: 7, color: '#eef3ff', textColor: '#2f74bf', borderColor: '#c9dcf5' },
  { label: 'Job Details',          span: 5, color: '#fff8ef', textColor: '#c87e1c', borderColor: '#ffe4c4' },
  { label: 'Operational Metrics',  span: 5, color: '#f0fff8', textColor: '#1d814c', borderColor: '#c3ecd4' },
  { label: 'Safety Documentation', span: 5, color: '#fdf5ff', textColor: '#7c3aed', borderColor: '#ddb8f7' },
  { label: 'Status & Tracking',    span: 9, color: '#fff5f6', textColor: '#d7263d', borderColor: '#ffd1d8' },
  { label: 'Remark',               span: 1, color: '#f7f7f9', textColor: '#595966', borderColor: '#e0e0e6' },
  { label: 'Actions',              span: 1, color: '#f7f7f9', textColor: '#595966', borderColor: '#e0e0e6' },
]

/* ── Badge components ───────────────────────────────────────── */
function StatusBadge({ value }) {
  if (!value) return <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
  const lower = value.toLowerCase()
  let bg, color, border, icon
  if (lower === 'closed') {
    bg='linear-gradient(135deg,#e8fff3,#d4f8e3)'; color='#1d814c'; border='1px solid #c3ecd4'; icon='✓'
  } else if (lower === 'in progress') {
    bg='linear-gradient(135deg,#fff8ef,#ffefdb)'; color='#c87e1c'; border='1px solid #ffe4c4'; icon='◐'
  } else if (lower === 'pending') {
    bg='linear-gradient(135deg,#f4f4f7,#ededf2)'; color='#7a7a8c'; border='1px solid #dcdce3'; icon='◌'
  } else {
    bg='linear-gradient(135deg,#f0f7ff,#e6f2ff)'; color='#2f74bf'; border='1px solid #d4e6f7'; icon='●'
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px',
      borderRadius:999, fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:bg, color, border }}>
      {icon} {value}
    </span>
  )
}

function YesNoBadge({ value }) {
  if (!value) return <span style={{ color: '#bbb', fontSize: 13 }}>—</span>
  const lower = value.toLowerCase()
  if (['yes','done','completed','updated'].includes(lower))
    return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
      borderRadius:999, fontSize:11, fontWeight:700,
      background:'linear-gradient(135deg,#e8fff3,#d4f8e3)', color:'#1d814c', border:'1px solid #c3ecd4' }}>✓ {value}</span>
  if (lower === 'no')
    return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
      borderRadius:999, fontSize:11, fontWeight:700,
      background:'linear-gradient(135deg,#fff5f6,#ffe8ea)', color:'#d7263d', border:'1px solid #ffd1d8' }}>✗ {value}</span>
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
    borderRadius:999, fontSize:11, fontWeight:700, background:'#f4f4f7',
    color:'#888', border:'1px solid #e0e0e6' }}>◌ {value}</span>
}

/* ── Modal section divider ──────────────────────────────────── */
function ModalSection({ icon, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'8px 0 4px',
      paddingBottom:10, borderBottom:'1px solid #efeff2' }}>
      <span style={{ width:30, height:30, borderRadius:8, background:'rgba(215,38,61,0.08)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:700, color:'#32323c',
        textTransform:'uppercase', letterSpacing:'0.08em' }}>{title}</span>
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

  /* ── Theme tokens ───────────────────────────────────────────
     light = white/red (JLR standalone + LMS)  |  dark = UserPanel
  ──────────────────────────────────────────────────────────── */
  const T = !isUser ? {
    // LMS light theme
    pageBg:        'transparent',
    bannerBg:      'transparent',
    bannerBorder:  '1px solid #e0e0e6',
    titleColor:    '#1f1f27',
    subtitleColor: '#7a7a8c',
    eyebrowColor:  '#d7263d',
    statCardBg:    '#ffffff',
    statCardShadow:(accent) => `0 4px 18px ${accent}12`,
    statBorderFn:  (accent) => `1px solid ${accent}33`,
    filtersBg:     'transparent',
    filtersBorder: '1px solid #e0e0e6',
    inputBg:       '#ffffff',
    inputBorder:   '1px solid #e0e0e6',
    inputColor:    '#1f1f27',
    inputPlaceholder: 'rgba(0,0,0,0.4)',
    searchIconColor: '#aaa',
    clearBtnBorder:  '1px solid #dcdce3',
    clearBtnColor:   '#2a2a32',
  } : {
    // UserPanel dark theme
    pageBg:        'transparent',
    bannerBg:      'linear-gradient(135deg, rgba(255,93,93,0.06) 0%, transparent 60%)',
    bannerBorder:  '1px solid rgba(255,255,255,0.07)',
    titleColor:    '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.55)',
    eyebrowColor:  '#ff5d5d',
    statCardBg:    'rgba(255,255,255,0.05)',
    statCardShadow:(accent) => `0 4px 18px rgba(0,0,0,0.2)`,
    statBorderFn:  (accent) => `1px solid rgba(255,255,255,0.1)`,
    filtersBg:     'rgba(255,255,255,0.03)',
    filtersBorder: '1px solid rgba(255,255,255,0.07)',
    inputBg:       'rgba(255,255,255,0.08)',
    inputBorder:   '1px solid rgba(255,255,255,0.15)',
    inputColor:    '#ffffff',
    inputPlaceholder: 'rgba(255,255,255,0.4)',
    searchIconColor: 'rgba(255,255,255,0.4)',
    clearBtnBorder:  '1px solid rgba(255,255,255,0.15)',
    clearBtnColor:   'rgba(255,255,255,0.75)',
  }

  /* ── State ──────────────────────────────────────────────── */
  const [entries, setEntries]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [importMsg, setImportMsg]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [csvMode, setCsvMode]           = useState('append') // 'replace' | 'append'
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [modalMode, setModalMode]       = useState('add')
  const [modalState, setModalState]     = useState(emptyEntry)
  const [editingId, setEditingId]       = useState(null)
  const [searchTerm, setSearchTerm]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openSelect, setOpenSelect]     = useState(null)
  const selectClickIntent = useRef({ status: false, source: false })
  const csvInputRef = useRef(null)

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

  const nextSerial = useMemo(() => {
    const max = entries.reduce((a, e) => Math.max(a, Number(e.sNo) || 0), 0)
    return max + 1
  }, [entries])

  const stats = useMemo(() => ({
    total:      entries.length,
    closed:     entries.filter(e => e.status?.toLowerCase() === 'closed').length,
    inProgress: entries.filter(e => e.status?.toLowerCase() === 'in progress').length,
    pending:    entries.filter(e => ['pending',''].includes((e.status||'').toLowerCase())).length,
  }), [entries])

  const statusOptions = useMemo(() => [...new Set(entries.map(e => e.status).filter(Boolean))], [entries])
  const sourceOptions = useMemo(() => [...new Set(entries.map(e => e.source).filter(Boolean))], [entries])

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return entries.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (sourceFilter !== 'all' && e.source !== sourceFilter) return false
      if (!q) return true
      return [e.sNo,e.entryDate,e.client,e.workOrder,e.inspectorName,e.inspectorTeam,
        e.reference,e.location,e.natureOfJob,e.startDate,e.endDate,e.vehicleUsed,
        e.status,e.source,e.completionDate,e.submissionDate,e.remark]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [entries, searchTerm, statusFilter, sourceFilter])

  const totalEntries  = filteredEntries.length
  const totalPages    = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  const safePage      = Math.min(currentPage, totalPages)
  const pageStartIdx  = (safePage - 1) * PAGE_SIZE
  const paginatedEntries = useMemo(() =>
    filteredEntries.slice(pageStartIdx, pageStartIdx + PAGE_SIZE),
    [filteredEntries, pageStartIdx])
  const pageStart = totalEntries === 0 ? 0 : pageStartIdx + 1
  const pageEnd   = totalEntries === 0 ? 0 : pageStartIdx + paginatedEntries.length

  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, sourceFilter])
  useEffect(() => { if (currentPage !== safePage) setCurrentPage(safePage) }, [currentPage, safePage])

  const handleSelectOpen  = n => setOpenSelect(n)
  const handleSelectClose = n => { selectClickIntent.current[n] = false; setOpenSelect(p => p === n ? null : p) }
  const handleSelectPD    = n => { if (openSelect === n) { selectClickIntent.current[n] = true; return } selectClickIntent.current[n] = false; handleSelectOpen(n) }
  const handleSelectClick = n => { if (selectClickIntent.current[n]) handleSelectClose(n) }

  const openAddModal = () => {
    setModalMode('add'); setEditingId(null)
    setModalState({ ...emptyEntry, sNo: nextSerial }); setIsModalOpen(true)
  }
  const openEditModal = entry => {
    setModalMode('edit'); setEditingId(entry.id)
    const f = k => entry[k] || ''
    setModalState({
      sNo:f('sNo'), client:f('client'), workOrder:f('workOrder'),
      inspectorName:f('inspectorName'), inspectorTeam:f('inspectorTeam'),
      reference:f('reference'), location:f('location'), natureOfJob:f('natureOfJob'),
      startDate:f('startDate'), endDate:f('endDate'), entryDate:f('entryDate'),
      vehicleUsed:f('vehicleUsed'), days:f('days'), calculatedDays:f('calculatedDays'),
      manPower:f('manPower'), manHours:f('manHours'), drivenKm:f('drivenKm'),
      jmps:f('jmps'), tra:f('tra'), equipCL:f('equipCL'), vLog:f('vLog'), tbt:f('tbt'),
      status:f('status'), completionDate:f('completionDate'), rept:f('rept'),
      exp:f('exp'), iso:f('iso'), accounts:f('accounts'), it:f('it'),
      submissionDate:f('submissionDate'), source:f('source'), remark:f('remark')
    })
    setIsModalOpen(true)
  }
  const closeModal = () => { setIsModalOpen(false); setModalMode('add'); setEditingId(null); setModalState(emptyEntry) }
  const handleModalChange = (k, v) => setModalState(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    const rd = calculateDays(modalState.startDate, modalState.endDate)
    const days = rd ? String(rd) : ''
    const payload = toDB({ ...modalState, days, sNo: modalState.sNo || nextSerial })
    try {
      setSaving(true)
      let res
      if (modalMode === 'add') {
        res = await fetch(API_ENDPOINTS.JOB_LOG, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${editingId}`, {
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
    } catch (err) {
      alert(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setEntries(p => p.filter(e => e.id !== id))
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
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
      setLoading(true); setImportMsg(null); setError(null)
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/upload-csv?mode=${csvMode}`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      const rows = json.data ?? []
      setEntries(Array.isArray(rows) ? rows.map(fromDB) : [])
      const modeLabel = csvMode === 'replace' ? 'replaced all data with' : 'added'
      setImportMsg(`✅ ${modeLabel} ${json.inserted} record(s) — total: ${Array.isArray(rows) ? rows.length : '?'}`)
      setTimeout(() => setImportMsg(null), 6000)
    } catch (err) {
      setError(`CSV import failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  /* ── Delete ALL entries ─────────────────────────────────── */
  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to DELETE ALL ${entries.length} entries?\n\nThis cannot be undone.`)) return
    try {
      setLoading(true); setError(null)
      const res = await fetch(`${API_ENDPOINTS.JOB_LOG}/clear-all`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`)
      setEntries([])
      setImportMsg(`🗑️ All entries deleted. You can now upload a fresh CSV.`)
      setTimeout(() => setImportMsg(null), 8000)
    } catch (err) {
      setError(`Delete all failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const rv = v => v || '—'

  /* ── Theme-aware stat card ──────────────────────────────── */
  const StatCard = ({ accent, label, value }) => (
    <div style={{
      flex: '1 1 140px',
      background: T.statCardBg,
      border: T.statBorderFn(accent),
      borderRadius: 16,
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: T.statCardShadow(accent),
    }}>
      <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.12em', color: accent }}>{label}</span>
      <span style={{ fontSize:28, fontWeight:800, color: !isUser ? accent : '#ffffff' }}>{value}</span>
    </div>
  )

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

  return (
    <div className="all-records-page job-log-page" style={{ background: T.pageBg }}>

      {/* ══ BANNER ════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 24, padding: '32px 32px 28px', flexWrap: 'wrap',
        background: T.bannerBg, borderBottom: T.bannerBorder,
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Eyebrow */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{
              width:4, height:22, borderRadius:4,
              background: !isUser ? '#d7263d' : 'linear-gradient(180deg,#ff5d5d,#ff3b3b)',
              flexShrink:0
            }} />
            <span style={{
              fontSize:11, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.18em', color: T.eyebrowColor
            }}>Inspection Log Description</span>
          </div>
          {/* Title */}
          <h2 style={{ margin:'0 0 6px', fontSize:28, fontWeight:800, color:T.titleColor, lineHeight:1.2 }}>
            Job Log Description
          </h2>
          {/* Subtitle */}
          <p style={{ margin:0, fontSize:14, color:T.subtitleColor, lineHeight:1.6 }}>
            Track inspection activities and field job entries across all regions.
          </p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', paddingTop:4 }}>
          {/* Hidden CSV file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display:'none' }}
            onChange={handleCsvUpload}
          />
          {/* CSV mode toggle */}
          <div style={{
            display:'flex', borderRadius:12, overflow:'hidden',
            border:'1px solid #e0e0e6', fontSize:13, fontWeight:600,
          }}>
            <button type="button" onClick={() => setCsvMode('append')}
              style={{
                padding:'9px 14px', border:'none', cursor:'pointer', transition:'all 0.2s',
                background: csvMode === 'append' ? '#d7263d' : '#fff',
                color:      csvMode === 'append' ? '#fff'    : '#7a7a8c',
              }}>
              ➕ Append
            </button>
            <button type="button" onClick={() => setCsvMode('replace')}
              style={{
                padding:'9px 14px', border:'none', cursor:'pointer', transition:'all 0.2s',
                background: csvMode === 'replace' ? '#d7263d' : '#fff',
                color:      csvMode === 'replace' ? '#fff'    : '#7a7a8c',
              }}>
              🔄 Replace
            </button>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => csvInputRef.current?.click()}
            disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:8 }}
          >
            <span style={{ fontSize:16, lineHeight:1 }}>📂</span> Import CSV
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={loading}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'transparent',
                border:'1px solid #ffd1d8',
                color:'#d7263d',
                padding:'10px 18px', borderRadius:16,
                fontSize:14, fontWeight:600, cursor:'pointer',
                transition:'all 0.2s ease',
              }}
            >
              <span style={{ fontSize:15, lineHeight:1 }}>🗑️</span> Delete All
            </button>
          )}
          <button type="button" className="primary-btn" onClick={openAddModal}
            style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18, lineHeight:1 }}>＋</span> Add Entry
          </button>
        </div>
      </div>

      {/* ══ STATUS MESSAGES ════════════════════════════════════ */}
      {importMsg && (
        <div style={{
          margin:'0 32px', marginTop:16, padding:'12px 18px', borderRadius:12,
          background:'linear-gradient(135deg,#e8fff3,#d4f8e3)',
          border:'1px solid #c3ecd4', color:'#1d814c',
          fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:10,
        }}>
          {importMsg}
          <button type="button" onClick={() => setImportMsg(null)}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#1d814c', fontSize:16 }}>✕</button>
        </div>
      )}
      {error && (
        <div style={{
          margin:'0 32px', marginTop:16, padding:'12px 18px', borderRadius:12,
          background:'linear-gradient(135deg,#fff5f6,#ffe8ea)',
          border:'1px solid #ffd1d8', color:'#d7263d',
          fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:10,
        }}>
          ⚠️ {error}
          <button type="button" onClick={() => setError(null)}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#d7263d', fontSize:16 }}>✕</button>
        </div>
      )}

      {/* ══ STATS BAR ═════════════════════════════════════════ */}
      <div style={{
        display:'flex', gap:16, flexWrap:'wrap',
        padding:'18px 32px',
        background: T.filtersBg,
        borderBottom: T.bannerBorder,
      }}>
        <StatCard accent={!isUser ? '#595966' : 'rgba(255,255,255,0.7)'} label="📋 Total Jobs"     value={stats.total} />
        <StatCard accent="#1d814c"  label="✓ Closed"       value={stats.closed} />
        <StatCard accent="#c87e1c"  label="◐ In Progress"  value={stats.inProgress} />
        <StatCard accent={!isUser ? '#7a7a8c' : 'rgba(255,255,255,0.45)'} label="◌ Pending" value={stats.pending} />
      </div>

      {/* ══ FILTERS ═══════════════════════════════════════════ */}
      <div style={{
        display:'flex', gap:16, padding:'20px 32px',
        background: T.filtersBg,
        borderBottom: T.bannerBorder,
        flexWrap:'wrap', alignItems:'center',
      }}>
        {/* Search */}
        <div style={{ flex:1, minWidth:220, position:'relative' }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            fontSize:15, color:T.searchIconColor, pointerEvents:'none' }}>🔍</span>
          <input
            type="text"
            style={{ ...inputStyle, paddingLeft:40, width:'100%', boxSizing:'border-box' }}
            placeholder="Search client, work order, inspector, reference, location…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Status filter */}
        <select
          style={{ ...inputStyle, minWidth:160, cursor:'pointer' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); handleSelectClose('status') }}
          onPointerDown={() => handleSelectPD('status')}
          onClick={() => handleSelectClick('status')}
          onBlur={() => handleSelectClose('status')}
        >
          <option value="all">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Region filter */}
        <select
          style={{ ...inputStyle, minWidth:160, cursor:'pointer' }}
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); handleSelectClose('source') }}
          onPointerDown={() => handleSelectPD('source')}
          onClick={() => handleSelectClick('source')}
          onBlur={() => handleSelectClose('source')}
        >
          <option value="all">All Regions</option>
          {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Clear */}
        <button
          type="button"
          style={{
            background:'transparent', border: T.clearBtnBorder,
            color: T.clearBtnColor, padding:'12px 18px', borderRadius:16,
            fontSize:14, cursor:'pointer', whiteSpace:'nowrap',
            transition:'all 0.2s ease',
          }}
          onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSourceFilter('all') }}
        >
          ✕ Clear Filters
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
                      textAlign:'center', fontSize:10, fontWeight:800,
                      textTransform:'uppercase', letterSpacing:'0.12em',
                      padding:'8px 12px', whiteSpace:'nowrap',
                    }}>{g.label}</th>
                  ))}
                </tr>
                {/* Column labels */}
                <tr>
                  <th style={{ minWidth:48 }}>S#</th>
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
                  <th title="ISO Compliance">ISO</th>
                  <th>Accounts</th>
                  <th title="IT Department">I.T</th>
                  <th>Submission</th><th>Region</th>
                  <th>Remark</th>
                  <th style={{ textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={33} style={{ padding:'60px 32px', textAlign:'center' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:36 }}>⏳</span>
                        <span style={{ fontSize:15, fontWeight:600, color:'#7a7a8c' }}>Loading job log entries…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={33} style={{ padding:'60px 32px', textAlign:'center' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:44 }}>📋</span>
                        <span style={{ fontSize:16, fontWeight:700, color:'#1f1f27' }}>No job log entries found</span>
                        <span style={{ fontSize:14, color:'#7a7a8c' }}>
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
                    return (
                      <tr key={entry.id}>
                        <td className="all-records-cell-id" style={{ fontWeight:700, color:'#595966', textAlign:'center' }}>{serial}</td>
                        <td className="all-records-cell-date">{rv(entry.entryDate)}</td>
                        <td className="all-records-cell-text" style={{ fontWeight:600 }}>{rv(entry.client)}</td>
                        <td className="all-records-cell-text">
                          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:6,
                            background:'#f0f7ff', color:'#2f74bf', fontSize:12, fontWeight:700 }}>
                            {rv(entry.workOrder)}</span>
                        </td>
                        <td className="all-records-cell-text">{rv(entry.inspectorName)}</td>
                        <td className="all-records-cell-text" style={{ color:'#595966' }}>{rv(entry.inspectorTeam)}</td>
                        <td className="all-records-cell-text" style={{ fontSize:12, color:'#7a7a8c' }}>{rv(entry.reference)}</td>
                        <td className="all-records-cell-text">{rv(entry.location)}</td>
                        <td className="all-records-cell-description">{rv(entry.natureOfJob)}</td>
                        <td className="all-records-cell-date">{rv(entry.startDate)}</td>
                        <td className="all-records-cell-date">{rv(entry.endDate)}</td>
                        <td className="all-records-cell-text">{rv(entry.vehicleUsed)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center', fontWeight:700 }}>{rv(entry.days)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center', fontWeight:700 }}>{rv(entry.calculatedDays)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center' }}>{rv(entry.manPower)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center' }}>{rv(entry.manHours)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center' }}>{rv(entry.drivenKm)}</td>
                        <td className="all-records-cell-text" style={{ textAlign:'center', fontWeight:700 }}>{rv(entry.jmps)}</td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.tra} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.equipCL} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.vLog} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.tbt} /></td>
                        <td><StatusBadge value={entry.status} /></td>
                        <td className="all-records-cell-date">{rv(entry.completionDate)}</td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.rept} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.exp} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.iso} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.accounts} /></td>
                        <td style={{ textAlign:'center' }}><YesNoBadge value={entry.it} /></td>
                        <td className="all-records-cell-date">{rv(entry.submissionDate)}</td>
                        <td>
                          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:6,
                            background:'#f4f4f7', color:'#595966', fontSize:12, fontWeight:600 }}>
                            {rv(entry.source)}</span>
                        </td>
                        <td className="all-records-cell-remarks" style={{ maxWidth:200, fontSize:13, color:'#595966' }}>
                          {rv(entry.remark)}
                        </td>
                        <td className="all-records-cell-actions" style={{ textAlign:'center' }}>
                          <div className="all-records-actions" style={{ justifyContent:'center' }}>
                            <button type="button" className="action-btn edit small"
                              onClick={() => openEditModal(entry)}>✏️ Edit</button>
                            <button type="button" className="action-btn delete small"
                              onClick={() => handleDelete(entry.id)}>🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="all-records-pagination">
          <div className="all-records-pagination-info">
            <span>Showing <strong>{pageStart}</strong>–<strong>{pageEnd}</strong> of <strong>{totalEntries}</strong> entries</span>
            <span className="all-records-pagination-limit">Rows per page: {PAGE_SIZE}</span>
          </div>
          <div className="all-records-pagination-controls">
            <button type="button" className="ghost-btn pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
              disabled={totalEntries === 0 || safePage === 1}>← Previous</button>
            <span className="all-records-pagination-page">
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button type="button" className="ghost-btn pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
              disabled={totalEntries === 0 || safePage === totalPages}>Next →</button>
          </div>
        </div>
      </div>

      {/* ══ MODAL ════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" style={{ maxWidth:900 }}
            onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:12,
                  background:'#fff0f2', border:'1px solid #ffd1d8',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {modalMode === 'add' ? '📋' : '✏️'}
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:22 }}>
                    {modalMode === 'add' ? 'Add Job Log Entry' : 'Edit Job Log Entry'}
                  </h2>
                  <p style={{ margin:0, fontSize:13, color:'#7a7a8c' }}>
                    {modalMode === 'add' ? 'Fill in the job details below.' : 'Update the entry information.'}
                  </p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeModal}>✕</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>

              <ModalSection icon="🪪" title="Identification" />
              <div className="form-row">
                <label><span>S#</span>
                  <input type="text" value={modalState.sNo} readOnly
                    style={{ background:'#f4f4f7', color:'#aaa', cursor:'not-allowed' }} /></label>
                <label><span>Entry Date *</span>
                  <input type="date" value={modalState.entryDate} required
                    onChange={e => handleModalChange('entryDate', e.target.value)} /></label>
                <label><span>Client *</span>
                  <input type="text" value={modalState.client} placeholder="e.g. OGDCL" required
                    onChange={e => handleModalChange('client', e.target.value)} /></label>
                <label><span>Work Order *</span>
                  <input type="text" value={modalState.workOrder} placeholder="WO-XXXX" required
                    onChange={e => handleModalChange('workOrder', e.target.value)} /></label>
                <label><span>Reference</span>
                  <input type="text" value={modalState.reference} placeholder="PTIS-REF-XXX"
                    onChange={e => handleModalChange('reference', e.target.value)} /></label>
              </div>

              <ModalSection icon="👷" title="Inspector Details" />
              <div className="form-row">
                <label><span>Inspector Name *</span>
                  <input type="text" value={modalState.inspectorName} placeholder="Full name" required
                    onChange={e => handleModalChange('inspectorName', e.target.value)} /></label>
                <label><span>Inspector Team</span>
                  <input type="text" value={modalState.inspectorTeam} placeholder="Name1, Name2, …"
                    onChange={e => handleModalChange('inspectorTeam', e.target.value)} /></label>
              </div>

              <ModalSection icon="🗺️" title="Job Details" />
              <div className="form-row">
                <label><span>Location *</span>
                  <input
                    type="text"
                    list="jlr-locations-list"
                    value={modalState.location}
                    placeholder="Type to search or enter new…"
                    required
                    autoComplete="off"
                    onChange={e => handleModalChange('location', e.target.value)}
                  />
                  <datalist id="jlr-locations-list">
                    {KNOWN_LOCATIONS.map(loc => <option key={loc} value={loc} />)}
                  </datalist>
                </label>
                <label><span>Nature of Job *</span>
                  <input type="text" value={modalState.natureOfJob} placeholder="Visual / NDT …" required
                    onChange={e => handleModalChange('natureOfJob', e.target.value)} /></label>
                <label><span>Job Start</span>
                  <input type="date" value={modalState.startDate}
                    onChange={e => handleModalChange('startDate', e.target.value)} /></label>
                <label><span>Job End</span>
                  <input type="date" value={modalState.endDate}
                    onChange={e => handleModalChange('endDate', e.target.value)} /></label>
                <label><span>Vehicle Plate No.</span>
                  <input type="text" value={modalState.vehicleUsed} placeholder="Hilux-12"
                    onChange={e => handleModalChange('vehicleUsed', e.target.value)} /></label>
              </div>

              <ModalSection icon="📊" title="Operational Metrics" />
              <div className="form-row">
                <label><span>Days (auto)</span>
                  <input type="number" readOnly
                    value={calculateDays(modalState.startDate, modalState.endDate)}
                    style={{ background:'#f4f4f7', color:'#aaa', cursor:'not-allowed' }} /></label>
                <label><span>Calculated Days</span>
                  <input type="number" min="0" value={modalState.calculatedDays}
                    onChange={e => handleModalChange('calculatedDays', e.target.value)} /></label>
                <label><span>Man Power</span>
                  <input type="number" min="0" value={modalState.manPower} placeholder="0"
                    onChange={e => handleModalChange('manPower', e.target.value)} /></label>
                <label><span>Man Hrs</span>
                  <input type="number" min="0" value={modalState.manHours} placeholder="0"
                    onChange={e => handleModalChange('manHours', e.target.value)} /></label>
                <label><span>Driven Km</span>
                  <input type="number" min="0" value={modalState.drivenKm} placeholder="0"
                    onChange={e => handleModalChange('drivenKm', e.target.value)} /></label>
                <label><span>JMPs</span>
                  <input type="text" value={modalState.jmps} placeholder="Count / ref"
                    onChange={e => handleModalChange('jmps', e.target.value)} /></label>
              </div>

              <ModalSection icon="🛡️" title="Safety Documentation" />
              <div className="form-row">
                {[['tra','TRA'],['equipCL','Equip C/L'],['vLog','V. Log'],['tbt','TBT']].map(([f,l]) => (
                  <label key={f}><span>{l}</span>
                    <select value={modalState[f]} onChange={e => handleModalChange(f, e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Yes">Yes</option><option value="No">No</option>
                      <option value="Done">Done</option><option value="Completed">Completed</option>
                      <option value="Updated">Updated</option><option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </label>
                ))}
              </div>

              <ModalSection icon="📌" title="Status & Tracking" />
              <div className="form-row">
                <label><span>Status</span>
                  <select value={modalState.status} onChange={e => handleModalChange('status', e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                    <option value="Pending">Pending</option>
                    <option value="On Hold">On Hold</option>
                  </select></label>
                <label><span>Completion Date</span>
                  <input type="date" value={modalState.completionDate}
                    onChange={e => handleModalChange('completionDate', e.target.value)} /></label>
                {[['rept','REPT (Report)'],['exp','EXP (Expenses)'],['iso','ISO'],['accounts','Accounts'],['it','I.T']].map(([f,l]) => (
                  <label key={f}><span>{l}</span>
                    <select value={modalState[f]} onChange={e => handleModalChange(f, e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Yes">Yes</option><option value="No">No</option>
                      <option value="Done">Done</option><option value="Pending">Pending</option>
                    </select>
                  </label>
                ))}
                <label><span>Submission Date</span>
                  <input type="date" value={modalState.submissionDate}
                    onChange={e => handleModalChange('submissionDate', e.target.value)} /></label>
                <label><span>Region *</span>
                  <input type="text" value={modalState.source} required
                    placeholder="Islamabad / Karachi / Other"
                    onChange={e => handleModalChange('source', e.target.value)} /></label>
              </div>

              <label>
                <span style={{ fontSize:13, fontWeight:700, color:'#32323c' }}>💬 Remark</span>
                <textarea rows="3" value={modalState.remark}
                  placeholder="Any notes or observations…"
                  onChange={e => handleModalChange('remark', e.target.value)} />
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}
                  style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {saving
                    ? '⏳ Saving…'
                    : modalMode === 'add' ? '＋ Add Entry' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobLogDescription
