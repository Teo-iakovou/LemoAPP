import{j as e}from"./index-CAL6pAIo.js";import{r as a}from"./vendor-dorw8sYR.js";import{L as h,y as t}from"./ReactToastify-iDz7eONg.js";const j=()=>{const[l,o]=a.useState(""),[n,d]=a.useState(""),[u,c]=a.useState(""),[i,p]=a.useState(""),m=async s=>{s.preventDefault();try{const r=await fetch("http://localhost:5001/api/auth/update-profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:l,currentPassword:n,newUsername:u,newPassword:i})}),x=await r.json();r.ok?(t.success("Profile updated successfully!"),o(""),d(""),c(""),p("")):t.error(x.message||"Failed to update profile")}catch(r){t.error("Error: Unable to update profile"),console.error("Error updating profile:",r)}};return e.jsxs("div",{className:"max-w-lg mx-auto p-6 mt-[14px] bg-white shadow-md rounded-3xl ",children:[e.jsx(h,{}),e.jsx("h2",{className:"text-xl font-bold mb-4",children:"Update Profile"}),e.jsxs("form",{onSubmit:m,children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"Current Username"}),e.jsx("input",{type:"text",className:"w-full p-2 border rounded",value:l,onChange:s=>o(s.target.value),required:!0})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"Current Password"}),e.jsx("input",{type:"password",className:"w-full p-2 border rounded",value:n,onChange:s=>d(s.target.value),required:!0})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"New Username"}),e.jsx("input",{type:"text",className:"w-full p-2 border rounded",value:u,onChange:s=>c(s.target.value)})]}),e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-gray-700",children:"New Password"}),e.jsx("input",{type:"password",className:"w-full p-2 border rounded",value:i,onChange:s=>p(s.target.value)})]}),e.jsx("button",{type:"submit",className:"w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600",children:"Update Profile"})]})]})};export{j as default};
