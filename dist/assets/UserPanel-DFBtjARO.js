import{r as a,u as D,A as k,j as e,p as F,a as $,N as se,O as ae}from"./index-okOJANrg.js";import{g as oe}from"./currentEmployee-Cx2YGUBU.js";const ne=()=>{const[p,w]=a.useState(!1),[o,h]=a.useState(!1),[x,C]=a.useState(""),[S,b]=a.useState(!1),[i,d]=a.useState([]),[N,f]=a.useState(!1),[c,M]=a.useState(null),[z,I]=a.useState([]),m=D(),E=a.useRef(null),j=z.filter(r=>!r.read).length,u=localStorage.getItem("userEmail")||"user@ptis.com",R=u.split("@")[0].replace(/\./g," ").split(" ").map(r=>r.charAt(0).toUpperCase()+r.slice(1).toLowerCase()).join(" "),J=()=>{localStorage.clear(),sessionStorage.clear(),m("/")};a.useEffect(()=>{let r=!1;return(async()=>{try{const n=await fetch(`${$}/api/notifications/${u}`);if(n.ok&&!r){const l=await n.json();I(l.notifications||[])}}catch(n){console.error("Error loading notifications:",n)}})(),()=>{r=!0}},[u]);const V=async r=>{I(s=>s.map(n=>n.id===r?{...n,read:!0}:n));try{await fetch(`${$}/api/notifications/${r}/read`,{method:"PUT"})}catch(s){console.error("Error marking notification as read:",s)}},Y=async()=>{I(r=>r.map(s=>({...s,read:!0})));try{await fetch(`${$}/api/notifications/${u}/read-all`,{method:"PUT"})}catch(r){console.error("Error marking all notifications as read:",r)}},q=r=>{if(!r)return"Just now";const s=new Date,n=new Date(r),l=s-n,g=Math.floor(l/6e4),y=Math.floor(l/36e5),v=Math.floor(l/864e5);return g<1?"Just now":g<60?`${g} minute${g>1?"s":""} ago`:y<24?`${y} hour${y>1?"s":""} ago`:v===1?"Yesterday":v<7?`${v} days ago`:n.toLocaleDateString()},Q=r=>{r.read||V(r.id),r.data?.url?(m(r.data.url),h(!1)):r.data?.type==="task_assigned"&&(m("/user/learning-management-system/my-courses"),h(!1))};a.useEffect(()=>{oe().then(M)},[]),a.useEffect(()=>{const r=s=>{E.current&&!E.current.contains(s.target)&&b(!1)};return document.addEventListener("mousedown",r),()=>document.removeEventListener("mousedown",r)},[]);const L=JSON.parse(localStorage.getItem("userPermissions")||"{}"),A=L.iso_forms||L.iso_forms_admin,_=L.cvs||Object.values(L.jlr||{}).some(Boolean);a.useEffect(()=>{const r=x.trim();if(r.length<2||!c){d([]),f(!1);return}let s=!1;f(!0);const n=setTimeout(async()=>{try{const l=r.toLowerCase(),[g,y,v,T,H]=await Promise.all([A?fetch(`${k.ISO_FORMS_ENTRIES}?employeeId=${c}&email=${encodeURIComponent(u)}`).then(t=>t.ok?t.json():{data:[]}).catch(()=>({data:[]})):{data:[]},A?fetch(`${k.ISO_FORMS_ENTRIES}?relatedEmployeeId=${c}`).then(t=>t.ok?t.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(`${k.TASK_ALLOCATIONS}/employee/${c}`).then(t=>t.ok?t.json():[]).catch(()=>[]),_?fetch(k.JOB_LOG).then(t=>t.ok?t.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(k.COURSES).then(t=>t.ok?t.json():[]).catch(()=>[])]);if(s)return;const K=[...g.data||g||[],...y.data||y||[]],P=new Set,X=K.filter(t=>P.has(t.id)?!1:(P.add(t.id),(t.template_name||"").toLowerCase().includes(l))).map(t=>({type:"Form",icon:"📄",id:`form-${t.id}`,title:t.template_name||"Untitled Form",subtitle:`Status: ${t.status||"pending"}`,path:`/user/iso-forms/entries/${t.id}`})),O=Array.isArray(v)?v:[],Z=O.filter(t=>(t.course_title||"").toLowerCase().includes(l)).map(t=>({type:"Course",icon:"📚",id:`course-${t.course_id}`,title:t.course_title,subtitle:`Status: ${t.status||"Assigned"}`,path:`/user/learning-management-system/course/${t.course_id}`})),ee=new Set(O.map(t=>(t.course_title||"").toLowerCase())),re=(Array.isArray(H)?H:[]).filter(t=>!ee.has((t.course_title||"").toLowerCase())).filter(t=>(t.course_title||"").toLowerCase().includes(l)).map(t=>({type:"Available",icon:"➕",id:`available-${t.id}`,title:t.course_title,subtitle:"Not assigned — request access",path:`/user/learning-management-system/my-courses?q=${encodeURIComponent(r)}`})),W=T.data||T||[],te=(Array.isArray(W)?W:[]).filter(t=>[t.client,t.work_order,t.reference,t.nature_of_job,t.inspector_name].filter(Boolean).join(" ").toLowerCase().includes(l)).map(t=>({type:"Job Log",icon:"🗂️",id:`joblog-${t.id}`,title:t.work_order||t.reference||t.client||`Job Log #${t.s_no??t.id}`,subtitle:`${t.client||"Job Log"}${t.status?` · ${t.status}`:""}`,path:`/user/job-log/entries?q=${encodeURIComponent(r)}`}));d([...X,...Z,...re,...te])}finally{s||f(!1)}},300);return()=>{s=!0,clearTimeout(n)}},[x,c,u,A,_]);const G=r=>{m(r.path),C(""),b(!1)};return e.jsxs(e.Fragment,{children:[e.jsxs("header",{className:"dashboard-header",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",boxShadow:"0 4px 20px rgba(102, 126, 234, 0.2)",position:"sticky",top:0,zIndex:100},children:[e.jsxs("div",{className:"brand-cluster",children:[e.jsx("div",{className:"brand-logo",style:{background:"rgba(255, 255, 255, 0.95)",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.1)"},children:e.jsx("img",{src:F,alt:"PTIS Logo"})}),e.jsxs("div",{children:[e.jsx("p",{className:"brand-label",style:{color:"white"},children:"PTIS User Portal"}),e.jsx("span",{className:"brand-caption",style:{color:"rgba(255, 255, 255, 0.85)"},children:"Employee Dashboard"})]})]}),e.jsxs("div",{className:"header-controls",children:[e.jsxs("div",{className:"search-cluster-wrapper",ref:E,style:{position:"relative"},children:[e.jsxs("div",{className:"search-cluster",style:{background:"rgba(255, 255, 255, 0.15)",backdropFilter:"blur(10px)",border:"1px solid rgba(255, 255, 255, 0.2)",padding:"10px 18px",borderRadius:"12px"},children:[e.jsxs("svg",{viewBox:"0 0 20 20",fill:"none",style:{width:"18px",height:"18px",opacity:.9,color:"white",flexShrink:0},children:[e.jsx("circle",{cx:"8.5",cy:"8.5",r:"5.75",stroke:"currentColor",strokeWidth:"1.5"}),e.jsx("path",{d:"M12.5 12.5L16 16",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]}),e.jsx("input",{type:"text",placeholder:"Search forms, courses...",value:x,onChange:r=>{C(r.target.value),b(!0)},onFocus:()=>b(!0),className:"search-cluster-input",style:{background:"transparent",border:"none",outline:"none",fontSize:"14px",color:"white",width:"100%",minWidth:0}})]}),S&&x.trim().length>=2&&e.jsxs("div",{className:"notif-dropdown",style:{position:"absolute",top:"calc(100% + 12px)",left:0,width:"min(380px, calc(100vw - 32px))",background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%), #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",borderRadius:"14px",zIndex:1e3,overflow:"hidden",color:"white"},children:[e.jsx("div",{style:{padding:"12px 16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.06)"},children:e.jsx("strong",{style:{fontSize:"13px",textTransform:"uppercase",letterSpacing:"0.5px",opacity:.8},children:N?"Searching…":`Results (${i.length})`})}),e.jsxs("div",{style:{maxHeight:"360px",overflowY:"auto"},children:[!N&&i.length===0&&e.jsx("div",{style:{padding:"24px",textAlign:"center",color:"rgba(255,255,255,0.6)"},children:e.jsxs("p",{style:{fontSize:"13px",margin:0},children:['No matches for "',x,'"']})}),i.map(r=>e.jsxs("div",{onClick:()=>G(r),style:{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",display:"flex",alignItems:"center",gap:"12px",transition:"background 0.2s ease"},onMouseEnter:s=>s.currentTarget.style.background="rgba(255,255,255,0.1)",onMouseLeave:s=>s.currentTarget.style.background="transparent",children:[e.jsx("div",{style:{width:"34px",height:"34px",borderRadius:"9px",flexShrink:0,background:"rgba(255, 93, 93, 0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"},children:r.icon}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("p",{style:{fontSize:"13px",fontWeight:600,margin:"0 0 2px 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:r.title}),e.jsx("p",{style:{fontSize:"11px",color:"rgba(255,255,255,0.55)",margin:0},children:r.subtitle})]}),e.jsx("span",{style:{fontSize:"10px",fontWeight:700,textTransform:"uppercase",color:"#ff5d5d",background:"rgba(255, 93, 93, 0.15)",padding:"3px 8px",borderRadius:999,flexShrink:0},children:r.type})]},r.id))]})]})]}),e.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),e.jsxs("div",{className:"notif-wrapper",style:{position:"relative"},children:[e.jsxs("button",{className:"ghost-btn",type:"button",onClick:()=>{h(!o),w(!1)},style:{position:"relative",background:o?"rgba(255, 255, 255, 0.3)":"rgba(255, 255, 255, 0.15)",border:"1px solid rgba(255, 255, 255, 0.25)",color:"white",backdropFilter:"blur(10px)",padding:"10px 14px",cursor:"pointer"},children:[e.jsx("svg",{viewBox:"0 0 24 24",fill:"none",style:{width:"20px",height:"20px"},children:e.jsx("path",{d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})}),j>0&&e.jsx("span",{style:{position:"absolute",top:"4px",right:"8px",minWidth:"16px",height:"16px",padding:"0 3px",borderRadius:"50%",background:"#ff5d5d",border:"2px solid #0e0f14",boxShadow:"0 0 8px rgba(255, 93, 93, 0.6)",fontSize:"10px",fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"},children:j>9?"9+":j})]}),o&&e.jsxs("div",{className:"notif-dropdown",style:{position:"absolute",top:"calc(100% + 12px)",right:0,width:"min(360px, calc(100vw - 32px))",background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%), #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",borderRadius:"14px",zIndex:1e3,overflow:"hidden",color:"white"},children:[e.jsxs("div",{style:{padding:"14px 16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("strong",{style:{fontSize:"14px"},children:"Notifications"}),j>0&&e.jsxs("span",{style:{fontSize:"11px",fontWeight:700,color:"#fff",background:"#ff5d5d",padding:"2px 8px",borderRadius:999},children:[j," unread"]})]}),e.jsx("div",{style:{maxHeight:"340px",overflowY:"auto"},children:z.length===0?e.jsxs("div",{style:{padding:"24px",textAlign:"center",color:"rgba(255,255,255,0.6)"},children:[e.jsx("div",{style:{fontSize:"28px",marginBottom:"8px"},children:"🔔"}),e.jsx("p",{style:{fontSize:"13px",margin:0},children:"No notifications yet"})]}):z.map(r=>e.jsx("div",{onClick:()=>Q(r),style:{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",background:r.read?"transparent":"rgba(255, 93, 93, 0.1)",transition:"background 0.2s ease"},onMouseEnter:s=>s.currentTarget.style.background="rgba(255,255,255,0.1)",onMouseLeave:s=>s.currentTarget.style.background=r.read?"transparent":"rgba(255, 93, 93, 0.1)",children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"},children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("p",{style:{fontSize:"13px",fontWeight:600,margin:"0 0 2px 0"},children:r.title}),e.jsx("p",{style:{fontSize:"12px",color:"rgba(255,255,255,0.7)",margin:0},children:r.body}),e.jsx("p",{style:{fontSize:"11px",color:"rgba(255,255,255,0.5)",margin:"6px 0 0 0"},children:q(r.timestamp)})]}),!r.read&&e.jsx("div",{style:{width:"7px",height:"7px",borderRadius:"50%",background:"#ff5d5d",marginTop:"4px",flexShrink:0}})]})},r.id))}),z.length>0&&e.jsx("div",{style:{padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.15)",textAlign:"center"},children:e.jsx("button",{type:"button",onClick:()=>{Y(),h(!1)},style:{background:"none",border:"none",color:"#ff5d5d",fontSize:"12px",fontWeight:600,cursor:"pointer"},children:"Mark all as read"})})]})]}),e.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),e.jsxs("div",{className:"user-menu-wrapper",children:[e.jsxs("button",{className:"user-chip",onClick:()=>w(!p),style:{background:"rgba(255, 255, 255, 0.2)",border:"1px solid rgba(255, 255, 255, 0.3)",backdropFilter:"blur(10px)",color:"white",transition:"all 0.3s ease"},children:[e.jsx("div",{style:{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#667eea",fontSize:"16px",fontWeight:"700",marginRight:"12px",border:"2px solid rgba(255, 255, 255, 0.5)",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)"},children:R.charAt(0)}),e.jsxs("div",{style:{textAlign:"left"},children:[e.jsx("span",{className:"chip-label",style:{color:"white",opacity:1,fontSize:"12px"},children:R}),e.jsx("strong",{style:{fontSize:"11px",opacity:.85,display:"block",color:"rgba(255, 255, 255, 0.9)"},children:"User Account"})]})]}),p&&e.jsxs("div",{className:"user-menu",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",color:"white"},children:[e.jsxs("div",{style:{padding:"16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.1)",backdropFilter:"blur(10px)"},children:[e.jsx("div",{style:{fontWeight:"600",marginBottom:"4px",color:"white"},children:R}),e.jsx("div",{style:{fontSize:"12px",opacity:.85,color:"rgba(255, 255, 255, 0.9)"},children:u})]}),e.jsxs("button",{type:"button",onClick:()=>m("/user/dashboard"),style:{width:"100%",padding:"12px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"white",transition:"background 0.2s"},onMouseEnter:r=>r.target.style.background="rgba(255, 255, 255, 0.15)",onMouseLeave:r=>r.target.style.background="none",children:[e.jsx("span",{children:"📊"})," Dashboard"]}),e.jsxs("button",{type:"button",onClick:()=>m("/user/my-courses"),style:{width:"100%",padding:"12px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"white",transition:"background 0.2s"},onMouseEnter:r=>r.target.style.background="rgba(255, 255, 255, 0.15)",onMouseLeave:r=>r.target.style.background="none",children:[e.jsx("span",{children:"📚"})," My Courses"]}),e.jsxs("button",{type:"button",style:{width:"100%",padding:"12px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"white",transition:"background 0.2s"},onMouseEnter:r=>r.target.style.background="rgba(255, 255, 255, 0.15)",onMouseLeave:r=>r.target.style.background="none",children:[e.jsx("span",{children:"👤"})," My Profile"]}),e.jsxs("button",{type:"button",style:{width:"100%",padding:"12px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"white",transition:"background 0.2s"},onMouseEnter:r=>r.target.style.background="rgba(255, 255, 255, 0.15)",onMouseLeave:r=>r.target.style.background="none",children:[e.jsx("span",{children:"⚙️"})," Settings"]}),e.jsx("div",{style:{height:"1px",background:"rgba(255, 255, 255, 0.15)",margin:"8px 0"}}),e.jsxs("button",{type:"button",onClick:J,style:{width:"100%",padding:"12px 16px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"#ffe5e5",fontWeight:"600",transition:"background 0.2s"},onMouseEnter:r=>{r.target.style.background="rgba(255, 93, 93, 0.2)",r.target.style.color="#fff"},onMouseLeave:r=>{r.target.style.background="none",r.target.style.color="#ffe5e5"},children:[e.jsx("span",{children:"🚪"})," Logout"]})]})]})]})]}),e.jsx("style",{jsx:!0,children:`
        .search-cluster-wrapper {
          width: clamp(140px, 22vw, 220px);
          flex-shrink: 1;
        }

        .search-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .search-cluster:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-1px);
        }

        .search-cluster input::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }

        .header-controls {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .search-cluster-wrapper {
            width: 100%;
            order: 1;
          }
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
      `})]})},U={dashboard:"M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",courses:"M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",browse:"M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",cert:"M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",portal:"M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",cv:"M12 6h18v4H12zm0 6h18v4H12zm0 6h12v4H12z",reports:"M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",help:"M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z",logout:"M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V5z"},B=({id:p})=>e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",style:{width:"18px",height:"18px",flexShrink:0},children:e.jsx("path",{d:U[p]||U.dashboard})}),ie=()=>{const[p,w]=a.useState(!1),[o,h]=a.useState({}),x=D(),S=(localStorage.getItem("userEmail")||"").split("@")[0].replace(/\./g," ").split(" ").map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(" ");a.useEffect(()=>{const d=JSON.parse(localStorage.getItem("userPermissions")||"{}");h(d)},[]);const b=()=>{localStorage.clear(),sessionStorage.clear(),x("/")},i=(d,N,f,c=null)=>e.jsxs(se,{to:d,className:({isActive:M})=>`user-nav-item${M?" active":""}`,title:p?"":f,children:[e.jsx("span",{className:"user-nav-icon",children:e.jsx(B,{id:N})}),e.jsx("span",{className:"user-nav-label",children:f}),c&&e.jsx("span",{className:"user-nav-badge",children:c})]});return e.jsxs("aside",{className:`user-sidebar ${p?"expanded":"collapsed"}`,onMouseEnter:()=>w(!0),onMouseLeave:()=>w(!1),children:[e.jsxs("div",{className:"user-sidebar-brand",children:[e.jsx("div",{className:"user-sidebar-logo",children:e.jsx("img",{src:F,alt:"PTIS"})}),e.jsx("span",{className:"user-sidebar-brand-text",children:"PTIS Portal"})]}),e.jsxs("nav",{className:"user-sidebar-nav",children:[e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"MAIN"}),i("/user/dashboard","dashboard","Dashboard")]}),(o.lms||o.portal||o.cvs||o.reports||o.testing)&&e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"MODULES"}),o.lms&&i("/user/learning-management-system","courses","LMS"),o.testing&&i("/user/testing","cert","Testing"),o.portal&&i("/user/portal","portal","PTIS Portal"),o.cvs&&i("/user/job-log","cv","Job Log"),o.reports&&i("/user/reports","reports","Reports")]}),e.jsxs("div",{className:"user-nav-section",children:[e.jsx("span",{className:"user-nav-section-title",children:"SUPPORT"}),i("/user/help","help","Help Center")]})]}),e.jsxs("div",{className:"user-sidebar-footer",children:[e.jsxs("div",{className:"user-sidebar-user",children:[e.jsx("div",{className:"user-sidebar-avatar",children:S.charAt(0)}),e.jsxs("div",{className:"user-sidebar-user-info",children:[e.jsx("span",{className:"user-sidebar-user-name",children:S}),e.jsx("span",{className:"user-sidebar-user-role",children:"Employee"})]})]}),e.jsx("button",{className:"user-sidebar-logout",onClick:b,title:"Logout",children:e.jsx(B,{id:"logout"})})]}),e.jsx("style",{children:`
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
      `})]})},ce=()=>e.jsxs("div",{style:{display:"flex",minHeight:"100vh",background:"#0e0f14"},children:[e.jsx(ie,{}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",minWidth:0},children:[e.jsx(ne,{}),e.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"hidden",minWidth:0},children:e.jsx(ae,{})})]})]});export{ce as default};
