import{j as e}from"./index-ljsycxTj.js";import{r as l}from"./vendor-DTxvXAp4.js";import{g as u}from"./api-B-uGkXoi.js";/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=s=>s.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),y=s=>s.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,o,n)=>n?n.toUpperCase():o.toLowerCase()),p=s=>{const t=y(s);return t.charAt(0).toUpperCase()+t.slice(1)},h=(...s)=>s.filter((t,o,n)=>!!t&&t.trim()!==""&&n.indexOf(t)===o).join(" ").trim(),f=s=>{for(const t in s)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var j={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=l.forwardRef(({color:s="currentColor",size:t=24,strokeWidth:o=2,absoluteStrokeWidth:n,className:d="",children:i,iconNode:r,...x},a)=>l.createElement("svg",{ref:a,...j,width:t,height:t,stroke:s,strokeWidth:n?Number(o)*24/Number(t):o,className:h("lucide",d),...!i&&!f(x)&&{"aria-hidden":"true"},...x},[...r.map(([c,m])=>l.createElement(c,m)),...Array.isArray(i)?i:[i]]));/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=(s,t)=>{const o=l.forwardRef(({className:n,...d},i)=>l.createElement(w,{ref:i,iconNode:t,className:h(`lucide-${g(p(s))}`,`lucide-${s}`,n),...d}));return o.displayName=p(s),o};/**
 * @license lucide-react v0.506.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"14sxne"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",key:"1hlbsb"}],["path",{d:"M16 16h5v5",key:"ccwih5"}]],S=N("refresh-ccw",b),C={delivered:"text-green-400",sent:"text-gray-400",failed:"text-red-500",expired:"text-yellow-500",rejected:"text-pink-500"},L=()=>{const[s,t]=l.useState([]),[o,n]=l.useState(!0);l.useState(null),l.useEffect(()=>{d()},[]);const d=async()=>{n(!0);try{const r=await u();t(r)}catch(r){console.error("Αποτυχία ανάκτησης κατάστασης SMS:",r)}finally{n(!1)}},i=r=>new Date(r).toLocaleString("el-GR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!1,timeZone:"Europe/Athens"});return e.jsxs("div",{className:"max-w-6xl mx-auto px-6 py-10 text-white",children:[e.jsx("h1",{className:"text-3xl font-bold mb-8 tracking-wide text-white",children:"🔎 Παρακολούθηση Κατάστασης SMS"}),e.jsx("div",{className:"flex justify-end mb-6",children:e.jsx("button",{onClick:d,className:"p-2 bg-purple-800 hover:bg-purple-700 text-white rounded-md shadow",title:"Επαναφόρτωση",children:e.jsx(S,{size:18})})}),o?e.jsx("p",{className:"text-gray-300",children:"Φόρτωση δεδομένων..."}):s.length===0?e.jsx("p",{className:"text-gray-400",children:"Δεν βρέθηκαν αποτελέσματα."}):e.jsx("div",{className:"overflow-y-auto max-h-[500px] rounded-lg shadow-lg border border-purple-800",children:e.jsxs("table",{className:"min-w-full text-sm text-left bg-[#0d1117]",children:[e.jsx("thead",{className:"bg-purple-950 text-white text-md uppercase tracking-wide",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-4 py-3",children:"Πελάτης"}),e.jsx("th",{className:"px-4 py-3",children:"Τηλέφωνο"}),e.jsx("th",{className:"px-4 py-3",children:"Κατάσταση SMS"}),e.jsx("th",{className:"px-4 py-3",children:"Απεστάλη"}),e.jsx("th",{className:"px-4 py-3",children:"Μήνυμα"}),e.jsx("th",{className:"px-4 py-3",children:"Αποστολέας"})]})}),e.jsx("tbody",{children:s.map((r,x)=>{const{reminder:a}=r,c=(a==null?void 0:a.status)||"no status";return e.jsxs("tr",{className:"border-t border-gray-700 hover:bg-purple-900/30 transition duration-150",children:[e.jsx("td",{className:"px-4 py-3",children:r.customerName}),e.jsx("td",{className:"px-4 py-3",children:r.phoneNumber}),e.jsxs("td",{className:`px-4 py-3 font-semibold ${C[c]||"text-gray-500"}`,children:[c==="delivered"&&"🟢 Παραδόθηκε",c==="failed"&&"🔴 Απέτυχε",c==="sent"&&"⚪ Εστάλη",c==="expired"&&"🟡 Έληξε",c==="rejected"&&"🔶 Απορρίφθηκε",c==="no status"&&"–"]}),e.jsx("td",{className:"px-4 py-3",children:a!=null&&a.sentAt?i(a.sentAt):"—"}),e.jsx("td",{className:"px-4 py-3 whitespace-pre-wrap max-w-xs",children:(a==null?void 0:a.messageText)||"—"}),e.jsx("td",{className:"px-4 py-3",children:(a==null?void 0:a.senderId)||"—"})]},`${r._id}-${x}`)})})]})})]})};export{L as default};
