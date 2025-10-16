import{j as e}from"./index-TpXOSP4A.js";import{r as c}from"./vendor-DTxvXAp4.js";import{g as m}from"./api-B-uGkXoi.js";/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=s=>s.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),g=s=>s.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,i)=>i?i.toUpperCase():n.toLowerCase()),h=s=>{const t=g(s);return t.charAt(0).toUpperCase()+t.slice(1)},x=(...s)=>s.filter((t,n,i)=>!!t&&t.trim()!==""&&i.indexOf(t)===n).join(" ").trim(),y=s=>{for(const t in s)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var f={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=c.forwardRef(({color:s="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:i,className:d="",children:o,iconNode:r,...p},a)=>c.createElement("svg",{ref:a,...f,width:t,height:t,stroke:s,strokeWidth:i?Number(n)*24/Number(t):n,className:x("lucide",d),...!o&&!y(p)&&{"aria-hidden":"true"},...p},[...r.map(([l,u])=>c.createElement(l,u)),...Array.isArray(o)?o:[o]]));/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=(s,t)=>{const n=c.forwardRef(({className:i,...d},o)=>c.createElement(j,{ref:o,iconNode:t,className:x(`lucide-${w(h(s))}`,`lucide-${s}`,i),...d}));return n.displayName=h(s),n};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"14sxne"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",key:"1hlbsb"}],["path",{d:"M16 16h5v5",key:"ccwih5"}]],b=N("refresh-ccw",S),C={delivered:"text-green-400",sent:"text-gray-400",failed:"text-red-500",expired:"text-yellow-500",rejected:"text-pink-500"},L=()=>{const[s,t]=c.useState([]),[n,i]=c.useState(!0);c.useState(null),c.useEffect(()=>{d()},[]);const d=async()=>{i(!0);try{const r=await m();t(r)}catch(r){console.error("Αποτυχία ανάκτησης κατάστασης SMS:",r)}finally{i(!1)}},o=r=>new Date(r).toLocaleString("el-GR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!1,timeZone:"Europe/Athens"});return e.jsxs("div",{className:"max-w-6xl mx-auto px-6 py-10 text-white",children:[e.jsxs("h1",{className:"text-3xl font-bold mb-8 tracking-wide text-white whitespace-pre-line",children:["🔎 Παρακολούθηση Κατάστασης SMS",`
`,"🔎 SMS Status Tracking"]}),e.jsx("div",{className:"flex justify-end mb-6",children:e.jsx("button",{onClick:d,className:"p-2 bg-purple-800 hover:bg-purple-700 text-white rounded-md shadow whitespace-pre-line",title:`Επαναφόρτωση
Reload`,children:e.jsx(b,{size:18})})}),n?e.jsxs("p",{className:"text-gray-300 whitespace-pre-line",children:["Φόρτωση δεδομένων...",`
`,"Loading data..."]}):s.length===0?e.jsxs("p",{className:"text-gray-400 whitespace-pre-line",children:["Δεν βρέθηκαν αποτελέσματα.",`
`,"No results found."]}):e.jsx("div",{className:"overflow-y-auto max-h-[500px] rounded-lg shadow-lg border border-purple-800",children:e.jsxs("table",{className:"min-w-full text-sm text-left bg-[#0d1117]",children:[e.jsx("thead",{className:"bg-purple-950 text-white text-md uppercase tracking-wide",children:e.jsxs("tr",{children:[e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Πελάτης",`
`,"Customer"]}),e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Τηλέφωνο",`
`,"Phone"]}),e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Κατάσταση SMS",`
`,"SMS Status"]}),e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Απεστάλη",`
`,"Sent At"]}),e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Μήνυμα",`
`,"Message"]}),e.jsxs("th",{className:"px-4 py-3 whitespace-pre-line",children:["Αποστολέας",`
`,"Sender"]})]})}),e.jsx("tbody",{children:s.map((r,p)=>{const{reminder:a}=r,l=(a==null?void 0:a.status)||"no status";return e.jsxs("tr",{className:"border-t border-gray-700 hover:bg-purple-900/30 transition duration-150",children:[e.jsx("td",{className:"px-4 py-3",children:r.customerName}),e.jsx("td",{className:"px-4 py-3",children:r.phoneNumber}),e.jsxs("td",{className:`px-4 py-3 font-semibold whitespace-pre-line ${C[l]||"text-gray-500"}`,children:[l==="delivered"&&`🟢 Παραδόθηκε
🟢 Delivered`,l==="failed"&&`🔴 Απέτυχε
🔴 Failed`,l==="sent"&&`⚪ Εστάλη
⚪ Sent`,l==="expired"&&`🟡 Έληξε
🟡 Expired`,l==="rejected"&&`🔶 Απορρίφθηκε
🔶 Rejected`,l==="no status"&&"–"]}),e.jsx("td",{className:"px-4 py-3",children:a!=null&&a.sentAt?o(a.sentAt):"—"}),e.jsx("td",{className:"px-4 py-3 whitespace-pre-wrap max-w-xs",children:(a==null?void 0:a.messageText)||"—"}),e.jsx("td",{className:"px-4 py-3",children:(a==null?void 0:a.senderId)||"—"})]},`${r._id}-${p}`)})})]})})]})};export{L as default};
