import{u as p,j as e}from"./index-CAL6pAIo.js";import{r as a}from"./vendor-dorw8sYR.js";const w=({setAuth:i})=>{const[r,c]=a.useState(""),[o,d]=a.useState(""),[n,u]=a.useState(null),m=p(),h=async s=>{s.preventDefault();try{const t=await fetch("http://localhost:5001/api/auth/signin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:r,password:o})}),l=await t.json();if(!t.ok)throw new Error(l.message||"Login failed");localStorage.setItem("token",l.token),i(!0),m("/")}catch(t){u(t.message)}};return e.jsx("div",{className:"flex justify-center items-center h-screen ",children:e.jsxs("form",{onSubmit:h,className:"p-6 bg-white rounded shadow-md w-full max-w-sm",children:[e.jsx("h1",{className:"text-2xl font-bold mb-4",children:"Login"}),n&&e.jsx("p",{className:"text-red-500 mb-4",children:n}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"Username"}),e.jsx("input",{type:"text",value:r,onChange:s=>c(s.target.value),className:"shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",placeholder:"Enter your username",required:!0})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"Password"}),e.jsx("input",{type:"password",value:o,onChange:s=>d(s.target.value),className:"shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",placeholder:"Enter your password",required:!0})]}),e.jsx("button",{type:"submit",className:"w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600",children:"Login"})]})})};export{w as default};