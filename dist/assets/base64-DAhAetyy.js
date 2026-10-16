function o(a){const r=String(a||"").replace(/^data:[^,]+,/,""),e=atob(r),n=new Uint8Array(e.length);for(let t=0;t<e.length;t++)n[t]=e.charCodeAt(t);return n}export{o as b};
