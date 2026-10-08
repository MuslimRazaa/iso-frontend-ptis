import{r as n,u as C,j as e,p as _,A as u,N as R,O as T}from"./index-BEafwQMg.js";import{g as U}from"./currentEmployee-7i7HQ2Bi.js";import{H as B,N as F}from"./HeaderSearchBar-C6W9Uyk8.js";const J=()=>{const[i,l]=n.useState(!1),[a,b]=n.useState(null),[h,v]=n.useState(0),x=C(),d=localStorage.getItem("userEmail")||"user@ptis.com",t=d.split("@")[0].replace(/\./g," ").split(" ").map(r=>r.charAt(0).toUpperCase()+r.slice(1).toLowerCase()).join(" "),o=()=>{localStorage.clear(),sessionStorage.clear(),x("/")};n.useEffect(()=>{U().then(b)},[]);const c=JSON.parse(localStorage.getItem("userPermissions")||"{}"),p=c.iso_forms||c.iso_forms_admin,g=c.cvs||Object.values(c.jlr||{}).some(Boolean),f=async r=>{if(!a)return[];const m=r.toLowerCase(),[y,j,w,S,N]=await Promise.all([p?fetch(`${u.ISO_FORMS_ENTRIES}?employeeId=${a}&email=${encodeURIComponent(d)}`).then(s=>s.ok?s.json():{data:[]}).catch(()=>({data:[]})):{data:[]},p?fetch(`${u.ISO_FORMS_ENTRIES}?relatedEmployeeId=${a}`).then(s=>s.ok?s.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(`${u.TASK_ALLOCATIONS}/employee/${a}`).then(s=>s.ok?s.json():[]).catch(()=>[]),g?fetch(u.JOB_LOG).then(s=>s.ok?s.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(u.COURSES).then(s=>s.ok?s.json():[]).catch(()=>[])]),A=[...y.data||y||[],...j.data||j||[]],k=new Set,H=A.filter(s=>k.has(s.id)?!1:(k.add(s.id),(s.template_name||"").toLowerCase().includes(m))).map(s=>({type:"Form",icon:"📄",id:`form-${s.id}`,title:s.template_name||"Untitled Form",subtitle:`Status: ${s.status||"pending"}`,path:`/user/iso-forms/entries/${s.id}`})),z=Array.isArray(w)?w:[],$=z.filter(s=>(s.course_title||"").toLowerCase().includes(m)).map(s=>({type:"Course",icon:"📚",id:`course-${s.course_id}`,title:s.course_title,subtitle:`Status: ${s.status||"Assigned"}`,path:`/user/learning-management-system/course/${s.course_id}`})),M=new Set(z.map(s=>(s.course_title||"").toLowerCase())),P=(Array.isArray(N)?N:[]).filter(s=>!M.has((s.course_title||"").toLowerCase())).filter(s=>(s.course_title||"").toLowerCase().includes(m)).map(s=>({type:"Available",icon:"➕",id:`available-${s.id}`,title:s.course_title,subtitle:"Not assigned — request access",path:`/user/learning-management-system/my-courses?q=${encodeURIComponent(r)}`})),L=S.data||S||[],O=(Array.isArray(L)?L:[]).filter(s=>[s.client,s.work_order,s.reference,s.nature_of_job,s.inspector_name].filter(Boolean).join(" ").toLowerCase().includes(m)).map(s=>({type:"Job Log",icon:"🗂️",id:`joblog-${s.id}`,title:s.work_order||s.reference||s.client||`Job Log #${s.s_no??s.id}`,subtitle:`${s.client||"Job Log"}${s.status?` · ${s.status}`:""}`,path:`/user/job-log/entries?q=${encodeURIComponent(r)}`}));return[...H,...$,...P,...O]};return e.jsxs(e.Fragment,{children:[e.jsxs("header",{className:"dashboard-header",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",boxShadow:"0 4px 20px rgba(102, 126, 234, 0.2)",position:"sticky",top:0,zIndex:100},children:[e.jsxs("div",{className:"brand-cluster",children:[e.jsx("div",{className:"brand-logo",style:{background:"rgba(255, 255, 255, 0.95)",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.1)"},children:e.jsx("img",{src:_,alt:"PTIS Logo"})}),e.jsxs("div",{children:[e.jsx("p",{className:"brand-label",style:{color:"white"},children:"PTIS User Portal"}),e.jsx("span",{className:"brand-caption",style:{color:"rgba(255, 255, 255, 0.85)"},children:"Employee Dashboard"})]})]}),e.jsxs("div",{className:"header-controls",children:[e.jsx(B,{onSearch:f,placeholder:"Search forms, courses...",onFocus:()=>l(!1),closeSignal:h}),e.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),e.jsx(F,{email:d,onOpen:()=>l(!1),closeSignal:h}),e.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),e.jsxs("div",{className:"user-menu-wrapper",children:[e.jsxs("button",{className:"user-chip",onClick:()=>{l(!i),v(r=>r+1)},style:{background:"rgba(255, 255, 255, 0.2)",border:"1px solid rgba(255, 255, 255, 0.3)",backdropFilter:"blur(10px)",color:"white",transition:"all 0.3s ease"},children:[e.jsx("div",{style:{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#667eea",fontSize:"16px",fontWeight:"700",marginRight:"12px",border:"2px solid rgba(255, 255, 255, 0.5)",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)"},children:t.charAt(0)}),e.jsxs("div",{style:{textAlign:"left"},children:[e.jsx("span",{className:"chip-label",style:{color:"white",opacity:1,fontSize:"12px"},children:t}),e.jsx("strong",{style:{fontSize:"11px",opacity:.85,display:"block",color:"rgba(255, 255, 255, 0.9)"},children:"User Account"})]})]}),i&&e.jsxs("div",{className:"user-menu",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",color:"white"},children:[e.jsxs("div",{style:{padding:"16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.1)",backdropFilter:"blur(10px)"},children:[e.jsx("div",{style:{fontWeight:"600",marginBottom:"4px",color:"white"},children:t}),e.jsx("div",{style:{fontSize:"12px",opacity:.85,color:"rgba(255, 255, 255, 0.9)"},children:d})]}),e.jsxs("button",{type:"button",onClick:o,style:{width:"100%",padding:"14px 16px",marginTop:"8px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"#ffe5e5",fontWeight:"600",transition:"background 0.2s"},onMouseEnter:r=>{r.target.style.background="rgba(255, 93, 93, 0.2)",r.target.style.color="#fff"},onMouseLeave:r=>{r.target.style.background="none",r.target.style.color="#ffe5e5"},children:[e.jsx("span",{children:"🚪"})," Logout"]})]})]})]})]}),e.jsx("style",{jsx:!0,children:`
        .header-controls {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .header-controls {
            width: 100%;
          }
          .header-divider {
            display: none;
          }
        }

        @media (max-width: 400px) {
          .user-chip .chip-label,
          .user-chip strong {
            display: none;
          }
          .user-chip {
            padding: 8px 12px !important;
          }
          .user-chip > div:first-child {
            margin-right: 0 !important;
          }
        }

        .ghost-btn:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .user-chip:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .user-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          border-radius: 14px;
          min-width: 260px;
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `})]})},I={dashboard:"M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",courses:"M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",browse:"M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",cert:"M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",portal:"M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",cv:"M12 6h18v4H12zm0 6h18v4H12zm0 6h12v4H12z",reports:"M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",help:"M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z",logout:"M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V5z"},E=({id:i})=>e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",style:{width:"18px",height:"18px",flexShrink:0},children:e.jsx("path",{d:I[i]||I.dashboard})}),D=()=>{const[i,l]=n.useState(!1),[a,b]=n.useState({}),h=C(),x=(localStorage.getItem("userEmail")||"").split("@")[0].replace(/\./g," ").split(" ").map(o=>o.charAt(0).toUpperCase()+o.slice(1)).join(" ");n.useEffect(()=>{const o=JSON.parse(localStorage.getItem("userPermissions")||"{}");b(o)},[]);const d=()=>{localStorage.clear(),sessionStorage.clear(),h("/")},t=(o,c,p,g=null)=>e.jsxs(R,{to:o,className:({isActive:f})=>`user-nav-item${f?" active":""}`,title:i?"":p,children:[e.jsx("span",{className:"user-nav-icon",children:e.jsx(E,{id:c})}),e.jsx("span",{className:"user-nav-label",children:p}),g&&e.jsx("span",{className:"user-nav-badge",children:g})]});return e.jsxs("aside",{className:`user-sidebar ${i?"expanded":"collapsed"}`,onMouseEnter:()=>l(!0),onMouseLeave:()=>l(!1),children:[e.jsxs("div",{className:"user-sidebar-brand",children:[e.jsx("div",{className:"user-sidebar-logo",children:e.jsx("img",{src:_,alt:"PTIS"})}),e.jsx("span",{className:"user-sidebar-brand-text",children:"PTIS Portal"})]}),e.jsxs("nav",{className:"user-sidebar-nav",children:[e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"MAIN"}),t("/user/dashboard","dashboard","Dashboard")]}),(a.lms||a.portal||a.cvs||a.reports||a.testing)&&e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"MODULES"}),a.lms&&t("/user/learning-management-system","courses","LMS"),a.testing&&t("/user/testing","cert","Testing"),a.portal&&t("/user/portal","portal","PTIS Portal"),a.cvs&&t("/user/job-log","cv","Job Log"),a.reports&&t("/user/reports","reports","Reports")]}),e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"SUPPORT"}),t("/user/help","help","Help Center")]})]}),e.jsxs("div",{className:"user-sidebar-footer",children:[e.jsxs("div",{className:"user-sidebar-user",children:[e.jsx("div",{className:"user-sidebar-avatar",children:x.charAt(0)}),e.jsxs("div",{className:"user-sidebar-user-info",children:[e.jsx("span",{className:"user-sidebar-user-name",children:x}),e.jsx("span",{className:"user-sidebar-user-role",children:"Employee"})]})]}),e.jsx("button",{className:"user-sidebar-logout",onClick:d,title:"Logout",children:e.jsx(E,{id:"logout"})})]}),e.jsx("style",{children:`
        .user-sidebar {
          width: 64px;
          min-height: 100vh;
          background: radial-gradient(circle at 10% 20%, rgba(255,93,93,0.12), transparent 50%),
                      linear-gradient(180deg, #12131d 0%, #0e0f17 100%);
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .user-sidebar.expanded { width: 220px; }

        .user-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 14px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          min-height: 64px;
        }
        .user-sidebar-logo {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.95);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 4px;
        }
        .user-sidebar-logo img { width: 100%; height: 100%; object-fit: contain; }
        .user-sidebar-brand-text {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-sidebar-brand-text { opacity: 1; }

        .user-sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .user-nav-section { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
        .user-nav-section-title {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: rgba(255,255,255,0.25);
          padding: 10px 10px 4px;
          white-space: nowrap;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-nav-section-title { opacity: 1; }

        .user-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 500;
          transition: all 0.18s ease;
          white-space: nowrap;
          position: relative;
          min-height: 40px;
        }
        .user-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
        }
        .user-nav-item.active {
          background: rgba(255,93,93,0.15);
          color: #ff5d5d;
          border-left: 2px solid #ff5d5d;
        }
        .user-nav-icon { display: flex; align-items: center; flex-shrink: 0; }
        .user-nav-label {
          opacity: 0;
          transition: opacity 0.2s;
          overflow: hidden;
        }
        .user-sidebar.expanded .user-nav-label { opacity: 1; }
        .user-nav-badge {
          margin-left: auto;
          background: rgba(255,93,93,0.2);
          color: #ff5d5d;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-nav-badge { opacity: 1; }

        .user-sidebar-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 8px;
          border-top: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .user-sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .user-sidebar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #ff5d5d, #ff8c5a);
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-sidebar-user-info { opacity: 1; }
        .user-sidebar-user-name {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-sidebar-user-role { font-size: 10px; color: rgba(255,255,255,0.4); }
        .user-sidebar-logout {
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: all 0.18s;
          opacity: 0;
        }
        .user-sidebar.expanded .user-sidebar-logout { opacity: 1; }
        .user-sidebar-logout:hover { background: rgba(255,93,93,0.15); color: #ff5d5d; }
      `})]})},q=()=>e.jsxs("div",{style:{display:"flex",minHeight:"100vh",background:"#0e0f14"},children:[e.jsx(D,{}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",minWidth:0},children:[e.jsx(J,{}),e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"hidden",minWidth:0},children:e.jsx(T,{})})]})]});export{q as default};
