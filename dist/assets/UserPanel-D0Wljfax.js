import{r as l,u as R,j as t,p as P,A as a,O as U}from"./index-DDQOBhMZ.js";import{g as F}from"./currentEmployee-CZK_6TkN.js";import{H as T,N as z}from"./HeaderSearchBar-2_d5xCOr.js";const B=()=>{const[p,c]=l.useState(!1),[r,j]=l.useState(null),[u,v]=l.useState(0),k=R(),o=localStorage.getItem("userEmail")||"user@ptis.com",d=o.split("@")[0].replace(/\./g," ").split(" ").map(s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase()).join(" "),_=()=>{localStorage.clear(),sessionStorage.clear(),k("/")};l.useEffect(()=>{F().then(j)},[]);const n=JSON.parse(localStorage.getItem("userPermissions")||"{}"),g=n.iso_forms||n.iso_forms_admin,L=n.cvs||Object.values(n.jlr||{}).some(Boolean),I=async s=>{if(!r)return[];const i=s.toLowerCase(),[h,m,x,b,f]=await Promise.all([g?fetch(`${a.ISO_FORMS_ENTRIES}?employeeId=${r}&email=${encodeURIComponent(o)}`).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},g?fetch(`${a.ISO_FORMS_ENTRIES}?relatedEmployeeId=${r}`).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(`${a.TASK_ALLOCATIONS}/employee/${r}`).then(e=>e.ok?e.json():[]).catch(()=>[]),L?fetch(a.JOB_LOG).then(e=>e.ok?e.json():{data:[]}).catch(()=>({data:[]})):{data:[]},fetch(a.COURSES).then(e=>e.ok?e.json():[]).catch(()=>[])]),N=[...h.data||h||[],...m.data||m||[]],y=new Set,C=N.filter(e=>y.has(e.id)?!1:(y.add(e.id),(e.template_name||"").toLowerCase().includes(i))).map(e=>({type:"Form",icon:"📄",id:`form-${e.id}`,title:e.template_name||"Untitled Form",subtitle:`Status: ${e.status||"pending"}`,path:`/user/iso-forms/entries/${e.id}`})),S=Array.isArray(x)?x:[],$=S.filter(e=>(e.course_title||"").toLowerCase().includes(i)).map(e=>({type:"Course",icon:"📚",id:`course-${e.course_id}`,title:e.course_title,subtitle:`Status: ${e.status||"Assigned"}`,path:`/user/learning-management-system/course/${e.course_id}`})),A=new Set(S.map(e=>(e.course_title||"").toLowerCase())),E=(Array.isArray(f)?f:[]).filter(e=>!A.has((e.course_title||"").toLowerCase())).filter(e=>(e.course_title||"").toLowerCase().includes(i)).map(e=>({type:"Available",icon:"➕",id:`available-${e.id}`,title:e.course_title,subtitle:"Not assigned — request access",path:`/user/learning-management-system/my-courses?q=${encodeURIComponent(s)}`})),w=b.data||b||[],O=(Array.isArray(w)?w:[]).filter(e=>[e.client,e.work_order,e.reference,e.nature_of_job,e.inspector_name].filter(Boolean).join(" ").toLowerCase().includes(i)).map(e=>({type:"Job Log",icon:"🗂️",id:`joblog-${e.id}`,title:e.work_order||e.reference||e.client||`Job Log #${e.s_no??e.id}`,subtitle:`${e.client||"Job Log"}${e.status?` · ${e.status}`:""}`,path:`/user/job-log/entries?q=${encodeURIComponent(s)}`}));return[...C,...$,...E,...O]};return t.jsxs(t.Fragment,{children:[t.jsxs("header",{className:"dashboard-header",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",boxShadow:"0 4px 20px rgba(102, 126, 234, 0.2)",position:"sticky",top:0,zIndex:100},children:[t.jsxs("div",{className:"brand-cluster",children:[t.jsx("div",{className:"brand-logo",style:{background:"rgba(255, 255, 255, 0.95)",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.1)"},children:t.jsx("img",{src:P,alt:"PTIS Logo"})}),t.jsxs("div",{children:[t.jsx("p",{className:"brand-label",style:{color:"white"},children:"PTIS User Portal"}),t.jsx("span",{className:"brand-caption",style:{color:"rgba(255, 255, 255, 0.85)"},children:"Employee Dashboard"})]})]}),t.jsxs("div",{className:"header-controls",children:[t.jsx(T,{onSearch:I,placeholder:"Search forms, courses...",onFocus:()=>c(!1),closeSignal:u}),t.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),t.jsx(z,{email:o,onOpen:()=>c(!1),closeSignal:u}),t.jsx("span",{className:"divider-dot header-divider",style:{background:"rgba(255, 255, 255, 0.4)"}}),t.jsxs("div",{className:"user-menu-wrapper",children:[t.jsxs("button",{className:"user-chip",onClick:()=>{c(!p),v(s=>s+1)},style:{background:"rgba(255, 255, 255, 0.2)",border:"1px solid rgba(255, 255, 255, 0.3)",backdropFilter:"blur(10px)",color:"white",transition:"all 0.3s ease"},children:[t.jsx("div",{style:{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"#667eea",fontSize:"16px",fontWeight:"700",marginRight:"12px",border:"2px solid rgba(255, 255, 255, 0.5)",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)"},children:d.charAt(0)}),t.jsxs("div",{style:{textAlign:"left"},children:[t.jsx("span",{className:"chip-label",style:{color:"white",opacity:1,fontSize:"12px"},children:d}),t.jsx("strong",{style:{fontSize:"11px",opacity:.85,display:"block",color:"rgba(255, 255, 255, 0.9)"},children:"User Account"})]})]}),p&&t.jsxs("div",{className:"user-menu",style:{background:"radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14",border:"1px solid rgba(255, 255, 255, 0.2)",boxShadow:"0 8px 32px rgba(102, 126, 234, 0.3)",color:"white"},children:[t.jsxs("div",{style:{padding:"16px",borderBottom:"1px solid rgba(255, 255, 255, 0.15)",background:"rgba(255, 255, 255, 0.1)",backdropFilter:"blur(10px)"},children:[t.jsx("div",{style:{fontWeight:"600",marginBottom:"4px",color:"white"},children:d}),t.jsx("div",{style:{fontSize:"12px",opacity:.85,color:"rgba(255, 255, 255, 0.9)"},children:o})]}),t.jsxs("button",{type:"button",onClick:_,style:{width:"100%",padding:"14px 16px",marginTop:"8px",textAlign:"left",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",fontSize:"14px",color:"#ffe5e5",fontWeight:"600",transition:"background 0.2s"},onMouseEnter:s=>{s.target.style.background="rgba(255, 93, 93, 0.2)",s.target.style.color="#fff"},onMouseLeave:s=>{s.target.style.background="none",s.target.style.color="#ffe5e5"},children:[t.jsx("span",{children:"🚪"})," Logout"]})]})]})]})]}),t.jsx("style",{jsx:!0,children:`
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
      `})]})},W=()=>t.jsx("div",{style:{display:"flex",minHeight:"100vh",background:"#0e0f14"},children:t.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",minWidth:0},children:[t.jsx(B,{}),t.jsx("div",{style:{flex:1,overflowY:"auto",overflowX:"hidden",minWidth:0},children:t.jsx(U,{})})]})});export{W as default};
