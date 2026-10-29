import{r as c,u as P,j as t,p as T,A as s,O as U}from"./index-BXD9-vu0.js";import{g as B}from"./currentEmployee-SSgipE_B.js";import{H as M,N as z}from"./HeaderSearchBar-CczlBwaQ.js";const J=()=>{const[u,d]=c.useState(!1),[r,v]=c.useState(null),[h,k]=c.useState(0),_=P(),n=localStorage.getItem("userEmail")||"user@ptis.com",p=n.split("@")[0].replace(/\./g," ").split(" ").map(a=>a.charAt(0).toUpperCase()+a.slice(1).toLowerCase()).join(" "),C=()=>{localStorage.clear(),sessionStorage.clear(),_("/")};c.useEffect(()=>{B().then(v)},[]);const i=JSON.parse(localStorage.getItem("userPermissions")||"{}"),m=i.iso_forms||i.iso_forms_admin,L=i.cvs||Object.values(i.jlr||{}).some(Boolean),I=async a=>{if(!r)return[];const o=a.toLowerCase(),[g,x,l,b,f,y]=await Promise.all([m?fetch(`${s.ISO_FORMS_ENTRIES}?employeeId=${r}&email=${encodeURIComponent(n)}`).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},m?fetch(`${s.ISO_FORMS_ENTRIES}?relatedEmployeeId=${r}`).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},m?fetch(s.ISO_FORMS_TEMPLATES).then(e=>e.ok?e.json():[]).catch(()=>[]):[],fetch(`${s.TASK_ALLOCATIONS}/employee/${r}`).then(e=>e.ok?e.json():[]).catch(()=>[]),L?fetch(s.JOB_LOG).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(s.COURSES).then(e=>e.ok?e.json():[]).catch(()=>[])]),$=[...g.data||g||[],...x.data||x||[]],S=new Set,A=$.filter(e=>S.has(e.id)?!1:(S.add(e.id),[e.template_name,e.created_by_name,e.related_employee_name,e.status].filter(Boolean).join(" ").toLowerCase().includes(o))).map(e=>({type:"Form",icon:"📄",id:`form-${e.id}`,title:e.template_name||"Untitled Form",subtitle:`Status: ${e.status||"pending"}`,path:`/user/iso-forms/entries/${e.id}`})),N=(Array.isArray(l?.data)?l.data:Array.isArray(l)?l:[]).filter(e=>[e.name,e.formCode,e.description].filter(Boolean).join(" ").toLowerCase().includes(o)).map(e=>({type:"Form Template",icon:"📝",id:`template-${e.id}`,title:e.name||"Untitled Form",subtitle:e.formCode?`${e.formCode} · Fill a new form`:"Fill a new form",path:`/user/iso-forms/new/${e.id}`})),w=Array.isArray(b)?b:[],E=w.filter(e=>(e.course_title||"").toLowerCase().includes(o)).map(e=>({type:"Course",icon:"📚",id:`course-${e.course_id}`,title:e.course_title,subtitle:`Status: ${e.status||"Assigned"}`,path:`/user/learning-management-system/course/${e.course_id}`})),R=new Set(w.map(e=>(e.course_title||"").toLowerCase())),O=(Array.isArray(y)?y:[]).filter(e=>!R.has((e.course_title||"").toLowerCase())).filter(e=>(e.course_title||"").toLowerCase().includes(o)).map(e=>({type:"Available",icon:"➕",id:`available-${e.id}`,title:e.course_title,subtitle:"Not assigned — request access",path:`/user/learning-management-system/my-courses?q=${encodeURIComponent(a)}`})),j=f.data||f||[],F=(Array.isArray(j)?j:[]).filter(e=>[e.client,e.work_order,e.reference,e.nature_of_job,e.inspector_name].filter(Boolean).join(" ").toLowerCase().includes(o)).map(e=>({type:"Job Log",icon:"🗂️",id:`joblog-${e.id}`,title:e.work_order||e.reference||e.client||`Job Log #${e.s_no??e.id}`,subtitle:`${e.client||"Job Log"}${e.status?` · ${e.status}`:""}`,path:`/user/job-log/entries?q=${encodeURIComponent(a)}`}));return[...N,...A,...E,...O,...F]};return t.jsxs(t.Fragment,{children:[t.jsxs("header",{className:"dashboard-header",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",boxShadow:"0 4px 20px rgba(102, 126, 234, 0.2)",position:"sticky",top:0,zIndex:100},children:[t.jsxs("div",{className:"brand-cluster",children:[t.jsx("div",{className:"brand-logo",style:{background:"rgba(255, 255, 255, 0.95)",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.1)"},children:t.jsx("img",{src:T,alt:"PTIS Logo"})}),t.jsxs("div",{children:[t.jsx("p",{className:"brand-label",style:{color:"white"},children:"PTIS User Portal"}),t.jsx("span",{className:"brand-caption",style:{color:"rgba(255, 255, 255, 0.85)"},children:"Employee Dashboard"})]})]}),t.jsxs("div",{className:"header-controls",children:[t.jsx(M,{onSearch:I,placeholder:"Search forms, courses...",onFocus:()=>d(!1),closeSignal:h}),t.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),t.jsx(z,{email:n,onOpen:()=>d(!1),closeSignal:h}),t.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),t.jsxs("div",{className:"user-menu-wrapper",children:[t.jsxs("button",{className:"user-chip",onClick:()=>{d(!u),k(a=>a+1)},style:{background:"rgba(255, 255, 255, 0.2)",border:"1px solid rgba(255, 255, 255, 0.3)",backdropFilter:"blur(10px)",color:"white",transition:"all 0.3s ease"},children:[t.jsx("div",{style:{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#667eea",fontSize:"16px",fontWeight:"700",marginRight:"12px",border:"2px solid rgba(255, 255, 255, 0.5)",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)"},children:p.charAt(0)}),t.jsxs("div",{style:{textAlign:"left"},children:[t.jsx("span",{className:"chip-label",style:{color:"white",opacity:1,fontSize:"12px"},children:p}),t.jsx("strong",{style:{fontSize:"11px",opacity:.85,display:"block",color:"rgba(255, 255, 255, 0.9)"},children:"User Account"})]})]}),u&&t.jsxs("div",{className:"user-menu",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",color:"white"},children:[t.jsxs("div",{style:{padding:"16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.1)",backdropFilter:"blur(10px)"},children:[t.jsx("div",{style:{fontWeight:"600",marginBottom:"4px",color:"white"},children:p}),t.jsx("div",{style:{fontSize:"12px",opacity:.85,color:"rgba(255, 255, 255, 0.9)"},children:n})]}),t.jsxs("button",{type:"button",onClick:C,style:{width:"100%",padding:"14px 16px",marginTop:"8px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"#ffe5e5",fontWeight:"600",transition:"background 0.2s"},onMouseEnter:a=>{a.target.style.background="rgba(255, 93, 93, 0.2)",a.target.style.color="#fff"},onMouseLeave:a=>{a.target.style.background="none",a.target.style.color="#ffe5e5"},children:[t.jsx("span",{children:"🚪"})," Logout"]})]})]})]})]}),t.jsx("style",{jsx:!0,children:`
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
      `})]})},q=()=>t.jsx("div",{style:{display:"flex",minHeight:"100vh",background:"#0e0f14"},children:t.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",minWidth:0},children:[t.jsx(J,{}),t.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"hidden",minWidth:0},children:t.jsx(U,{})})]})});export{q as default};
