const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Home-Bh8Xv1uZ.js","assets/vendor-dorw8sYR.js","assets/CalendarPage-oXZcmNdy.js","assets/ReactToastify-iDz7eONg.js","assets/ReactToastify-ClGXXyg4.css","assets/api-BNk9E8fd.js","assets/CalendarPage-CCiwZiwf.css","assets/Profile-DPepPl2B.js","assets/CustomersPage-_pQcdOIu.js","assets/Login-nMeRxVQo.js"])))=>i.map(i=>d[i]);
import{r as u,a as Be,R as Ee}from"./vendor-dorw8sYR.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function r(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=r(n);fetch(n.href,o)}})();var be={exports:{}},G={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Me=u,Ue=Symbol.for("react.element"),He=Symbol.for("react.fragment"),We=Object.prototype.hasOwnProperty,ze=Me.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Ve={key:!0,ref:!0,__self:!0,__source:!0};function Re(e,t,r){var a,n={},o=null,i=null;r!==void 0&&(o=""+r),t.key!==void 0&&(o=""+t.key),t.ref!==void 0&&(i=t.ref);for(a in t)We.call(t,a)&&!Ve.hasOwnProperty(a)&&(n[a]=t[a]);if(e&&e.defaultProps)for(a in t=e.defaultProps,t)n[a]===void 0&&(n[a]=t[a]);return{$$typeof:Ue,type:e,key:o,ref:i,props:n,_owner:ze.current}}G.Fragment=He;G.jsx=Re;G.jsxs=Re;be.exports=G;var g=be.exports,te={},de=Be;te.createRoot=de.createRoot,te.hydrateRoot=de.hydrateRoot;const Je="modulepreload",Ke=function(e){return"/"+e},fe={},M=function(t,r,a){let n=Promise.resolve();if(r&&r.length>0){document.getElementsByTagName("link");const i=document.querySelector("meta[property=csp-nonce]"),c=(i==null?void 0:i.nonce)||(i==null?void 0:i.getAttribute("nonce"));n=Promise.allSettled(r.map(l=>{if(l=Ke(l),l in fe)return;fe[l]=!0;const s=l.endsWith(".css"),d=s?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${d}`))return;const f=document.createElement("link");if(f.rel=s?"stylesheet":Je,s||(f.as="script"),f.crossOrigin="",f.href=l,c&&f.setAttribute("nonce",c),document.head.appendChild(f),s)return new Promise((m,p)=>{f.addEventListener("load",m),f.addEventListener("error",()=>p(new Error(`Unable to preload CSS for ${l}`)))})}))}function o(i){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=i,window.dispatchEvent(c),!c.defaultPrevented)throw i}return n.then(i=>{for(const c of i||[])c.status==="rejected"&&o(c.reason);return t().catch(o)})};var ae={};Object.defineProperty(ae,"__esModule",{value:!0});ae.parse=et;ae.serialize=tt;const qe=/^[\u0021-\u003A\u003C\u003E-\u007E]+$/,Ye=/^[\u0021-\u003A\u003C-\u007E]*$/,Ge=/^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i,Qe=/^[\u0020-\u003A\u003D-\u007E]*$/,Xe=Object.prototype.toString,Ze=(()=>{const e=function(){};return e.prototype=Object.create(null),e})();function et(e,t){const r=new Ze,a=e.length;if(a<2)return r;const n=(t==null?void 0:t.decode)||rt;let o=0;do{const i=e.indexOf("=",o);if(i===-1)break;const c=e.indexOf(";",o),l=c===-1?a:c;if(i>l){o=e.lastIndexOf(";",i-1)+1;continue}const s=he(e,o,i),d=me(e,i,s),f=e.slice(s,d);if(r[f]===void 0){let m=he(e,i+1,l),p=me(e,l,m);const v=n(e.slice(m,p));r[f]=v}o=l+1}while(o<a);return r}function he(e,t,r){do{const a=e.charCodeAt(t);if(a!==32&&a!==9)return t}while(++t<r);return r}function me(e,t,r){for(;t>r;){const a=e.charCodeAt(--t);if(a!==32&&a!==9)return t+1}return r}function tt(e,t,r){const a=(r==null?void 0:r.encode)||encodeURIComponent;if(!qe.test(e))throw new TypeError(`argument name is invalid: ${e}`);const n=a(t);if(!Ye.test(n))throw new TypeError(`argument val is invalid: ${t}`);let o=e+"="+n;if(!r)return o;if(r.maxAge!==void 0){if(!Number.isInteger(r.maxAge))throw new TypeError(`option maxAge is invalid: ${r.maxAge}`);o+="; Max-Age="+r.maxAge}if(r.domain){if(!Ge.test(r.domain))throw new TypeError(`option domain is invalid: ${r.domain}`);o+="; Domain="+r.domain}if(r.path){if(!Qe.test(r.path))throw new TypeError(`option path is invalid: ${r.path}`);o+="; Path="+r.path}if(r.expires){if(!nt(r.expires)||!Number.isFinite(r.expires.valueOf()))throw new TypeError(`option expires is invalid: ${r.expires}`);o+="; Expires="+r.expires.toUTCString()}if(r.httpOnly&&(o+="; HttpOnly"),r.secure&&(o+="; Secure"),r.partitioned&&(o+="; Partitioned"),r.priority)switch(typeof r.priority=="string"?r.priority.toLowerCase():void 0){case"low":o+="; Priority=Low";break;case"medium":o+="; Priority=Medium";break;case"high":o+="; Priority=High";break;default:throw new TypeError(`option priority is invalid: ${r.priority}`)}if(r.sameSite)switch(typeof r.sameSite=="string"?r.sameSite.toLowerCase():r.sameSite){case!0:case"strict":o+="; SameSite=Strict";break;case"lax":o+="; SameSite=Lax";break;case"none":o+="; SameSite=None";break;default:throw new TypeError(`option sameSite is invalid: ${r.sameSite}`)}return o}function rt(e){if(e.indexOf("%")===-1)return e;try{return decodeURIComponent(e)}catch{return e}}function nt(e){return Xe.call(e)==="[object Date]"}/**
 * react-router v7.0.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var pe="popstate";function at(e={}){function t(a,n){let{pathname:o,search:i,hash:c}=a.location;return re("",{pathname:o,search:i,hash:c},n.state&&n.state.usr||null,n.state&&n.state.key||"default")}function r(a,n){return typeof n=="string"?n:B(n)}return it(t,r,null,e)}function b(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}function I(e,t){if(!e){typeof console<"u"&&console.warn(t);try{throw new Error(t)}catch{}}}function ot(){return Math.random().toString(36).substring(2,10)}function ge(e,t){return{usr:e.state,key:e.key,idx:t}}function re(e,t,r=null,a){return{pathname:typeof e=="string"?e:e.pathname,search:"",hash:"",...typeof t=="string"?D(t):t,state:r,key:t&&t.key||a||ot()}}function B({pathname:e="/",search:t="",hash:r=""}){return t&&t!=="?"&&(e+=t.charAt(0)==="?"?t:"?"+t),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function D(e){let t={};if(e){let r=e.indexOf("#");r>=0&&(t.hash=e.substring(r),e=e.substring(0,r));let a=e.indexOf("?");a>=0&&(t.search=e.substring(a),e=e.substring(0,a)),e&&(t.pathname=e)}return t}function it(e,t,r,a={}){let{window:n=document.defaultView,v5Compat:o=!1}=a,i=n.history,c="POP",l=null,s=d();s==null&&(s=0,i.replaceState({...i.state,idx:s},""));function d(){return(i.state||{idx:null}).idx}function f(){c="POP";let h=d(),y=h==null?null:h-s;s=h,l&&l({action:c,location:x.location,delta:y})}function m(h,y){c="PUSH";let w=re(x.location,h,y);s=d()+1;let E=ge(w,s),R=x.createHref(w);try{i.pushState(E,"",R)}catch(C){if(C instanceof DOMException&&C.name==="DataCloneError")throw C;n.location.assign(R)}o&&l&&l({action:c,location:x.location,delta:1})}function p(h,y){c="REPLACE";let w=re(x.location,h,y);s=d();let E=ge(w,s),R=x.createHref(w);i.replaceState(E,"",R),o&&l&&l({action:c,location:x.location,delta:0})}function v(h){let y=n.location.origin!=="null"?n.location.origin:n.location.href,w=typeof h=="string"?h:B(h);return w=w.replace(/ $/,"%20"),b(y,`No window.location.(origin|href) available to create URL for href: ${w}`),new URL(w,y)}let x={get action(){return c},get location(){return e(n,i)},listen(h){if(l)throw new Error("A history only accepts one active listener");return n.addEventListener(pe,f),l=h,()=>{n.removeEventListener(pe,f),l=null}},createHref(h){return t(n,h)},createURL:v,encodeLocation(h){let y=v(h);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:m,replace:p,go(h){return i.go(h)}};return x}function Ce(e,t,r="/"){return lt(e,t,r,!1)}function lt(e,t,r,a){let n=typeof t=="string"?D(t):t,o=$(n.pathname||"/",r);if(o==null)return null;let i=Se(e);st(i);let c=null;for(let l=0;c==null&&l<i.length;++l){let s=xt(o);c=yt(i[l],s,a)}return c}function Se(e,t=[],r=[],a=""){let n=(o,i,c)=>{let l={relativePath:c===void 0?o.path||"":c,caseSensitive:o.caseSensitive===!0,childrenIndex:i,route:o};l.relativePath.startsWith("/")&&(b(l.relativePath.startsWith(a),`Absolute route path "${l.relativePath}" nested under path "${a}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),l.relativePath=l.relativePath.slice(a.length));let s=P([a,l.relativePath]),d=r.concat(l);o.children&&o.children.length>0&&(b(o.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${s}".`),Se(o.children,t,d,s)),!(o.path==null&&!o.index)&&t.push({path:s,score:pt(s,o.index),routesMeta:d})};return e.forEach((o,i)=>{var c;if(o.path===""||!((c=o.path)!=null&&c.includes("?")))n(o,i);else for(let l of Le(o.path))n(o,i,l)}),t}function Le(e){let t=e.split("/");if(t.length===0)return[];let[r,...a]=t,n=r.endsWith("?"),o=r.replace(/\?$/,"");if(a.length===0)return n?[o,""]:[o];let i=Le(a.join("/")),c=[];return c.push(...i.map(l=>l===""?o:[o,l].join("/"))),n&&c.push(...i),c.map(l=>e.startsWith("/")&&l===""?"/":l)}function st(e){e.sort((t,r)=>t.score!==r.score?r.score-t.score:gt(t.routesMeta.map(a=>a.childrenIndex),r.routesMeta.map(a=>a.childrenIndex)))}var ut=/^:[\w-]+$/,ct=3,dt=2,ft=1,ht=10,mt=-2,ye=e=>e==="*";function pt(e,t){let r=e.split("/"),a=r.length;return r.some(ye)&&(a+=mt),t&&(a+=dt),r.filter(n=>!ye(n)).reduce((n,o)=>n+(ut.test(o)?ct:o===""?ft:ht),a)}function gt(e,t){return e.length===t.length&&e.slice(0,-1).every((a,n)=>a===t[n])?e[e.length-1]-t[t.length-1]:0}function yt(e,t,r=!1){let{routesMeta:a}=e,n={},o="/",i=[];for(let c=0;c<a.length;++c){let l=a[c],s=c===a.length-1,d=o==="/"?t:t.slice(o.length)||"/",f=Y({path:l.relativePath,caseSensitive:l.caseSensitive,end:s},d),m=l.route;if(!f&&s&&r&&!a[a.length-1].route.index&&(f=Y({path:l.relativePath,caseSensitive:l.caseSensitive,end:!1},d)),!f)return null;Object.assign(n,f.params),i.push({params:n,pathname:P([o,f.pathname]),pathnameBase:Rt(P([o,f.pathnameBase])),route:m}),f.pathnameBase!=="/"&&(o=P([o,f.pathnameBase]))}return i}function Y(e,t){typeof e=="string"&&(e={path:e,caseSensitive:!1,end:!0});let[r,a]=vt(e.path,e.caseSensitive,e.end),n=t.match(r);if(!n)return null;let o=n[0],i=o.replace(/(.)\/+$/,"$1"),c=n.slice(1);return{params:a.reduce((s,{paramName:d,isOptional:f},m)=>{if(d==="*"){let v=c[m]||"";i=o.slice(0,o.length-v.length).replace(/(.)\/+$/,"$1")}const p=c[m];return f&&!p?s[d]=void 0:s[d]=(p||"").replace(/%2F/g,"/"),s},{}),pathname:o,pathnameBase:i,pattern:e}}function vt(e,t=!1,r=!0){I(e==="*"||!e.endsWith("*")||e.endsWith("/*"),`Route path "${e}" will be treated as if it were "${e.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/,"/*")}".`);let a=[],n="^"+e.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(i,c,l)=>(a.push({paramName:c,isOptional:l!=null}),l?"/?([^\\/]+)?":"/([^\\/]+)"));return e.endsWith("*")?(a.push({paramName:"*"}),n+=e==="*"||e==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):r?n+="\\/*$":e!==""&&e!=="/"&&(n+="(?:(?=\\/|$))"),[new RegExp(n,t?void 0:"i"),a]}function xt(e){try{return e.split("/").map(t=>decodeURIComponent(t).replace(/\//g,"%2F")).join("/")}catch(t){return I(!1,`The URL path "${e}" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`),e}}function $(e,t){if(t==="/")return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let r=t.endsWith("/")?t.length-1:t.length,a=e.charAt(r);return a&&a!=="/"?null:e.slice(r)||"/"}function wt(e,t="/"){let{pathname:r,search:a="",hash:n=""}=typeof e=="string"?D(e):e;return{pathname:r?r.startsWith("/")?r:Et(r,t):t,search:Ct(a),hash:St(n)}}function Et(e,t){let r=t.replace(/\/+$/,"").split("/");return e.split("/").forEach(n=>{n===".."?r.length>1&&r.pop():n!=="."&&r.push(n)}),r.length>1?r.join("/"):"/"}function Z(e,t,r,a){return`Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(a)}].  Please separate it out to the \`to.${r}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function bt(e){return e.filter((t,r)=>r===0||t.route.path&&t.route.path.length>0)}function Pe(e){let t=bt(e);return t.map((r,a)=>a===t.length-1?r.pathname:r.pathnameBase)}function ke(e,t,r,a=!1){let n;typeof e=="string"?n=D(e):(n={...e},b(!n.pathname||!n.pathname.includes("?"),Z("?","pathname","search",n)),b(!n.pathname||!n.pathname.includes("#"),Z("#","pathname","hash",n)),b(!n.search||!n.search.includes("#"),Z("#","search","hash",n)));let o=e===""||n.pathname==="",i=o?"/":n.pathname,c;if(i==null)c=r;else{let f=t.length-1;if(!a&&i.startsWith("..")){let m=i.split("/");for(;m[0]==="..";)m.shift(),f-=1;n.pathname=m.join("/")}c=f>=0?t[f]:"/"}let l=wt(n,c),s=i&&i!=="/"&&i.endsWith("/"),d=(o||i===".")&&r.endsWith("/");return!l.pathname.endsWith("/")&&(s||d)&&(l.pathname+="/"),l}var P=e=>e.join("/").replace(/\/\/+/g,"/"),Rt=e=>e.replace(/\/+$/,"").replace(/^\/*/,"/"),Ct=e=>!e||e==="?"?"":e.startsWith("?")?e:"?"+e,St=e=>!e||e==="#"?"":e.startsWith("#")?e:"#"+e;function Lt(e){return e!=null&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.internal=="boolean"&&"data"in e}var $e=["POST","PUT","PATCH","DELETE"];new Set($e);var Pt=["GET",...$e];new Set(Pt);var O=u.createContext(null);O.displayName="DataRouter";var Q=u.createContext(null);Q.displayName="DataRouterState";var Ie=u.createContext({isTransitioning:!1});Ie.displayName="ViewTransition";var kt=u.createContext(new Map);kt.displayName="Fetchers";var $t=u.createContext(null);$t.displayName="Await";var L=u.createContext(null);L.displayName="Navigation";var U=u.createContext(null);U.displayName="Location";var k=u.createContext({outlet:null,matches:[],isDataRoute:!1});k.displayName="Route";var oe=u.createContext(null);oe.displayName="RouteError";function It(e,{relative:t}={}){b(H(),"useHref() may be used only in the context of a <Router> component.");let{basename:r,navigator:a}=u.useContext(L),{hash:n,pathname:o,search:i}=W(e,{relative:t}),c=o;return r!=="/"&&(c=o==="/"?r:P([r,o])),a.createHref({pathname:c,search:i,hash:n})}function H(){return u.useContext(U)!=null}function _(){return b(H(),"useLocation() may be used only in the context of a <Router> component."),u.useContext(U).location}var Ne="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function _e(e){u.useContext(L).static||u.useLayoutEffect(e)}function je(){let{isDataRoute:e}=u.useContext(k);return e?Wt():Nt()}function Nt(){b(H(),"useNavigate() may be used only in the context of a <Router> component.");let e=u.useContext(O),{basename:t,navigator:r}=u.useContext(L),{matches:a}=u.useContext(k),{pathname:n}=_(),o=JSON.stringify(Pe(a)),i=u.useRef(!1);return _e(()=>{i.current=!0}),u.useCallback((l,s={})=>{if(I(i.current,Ne),!i.current)return;if(typeof l=="number"){r.go(l);return}let d=ke(l,JSON.parse(o),n,s.relative==="path");e==null&&t!=="/"&&(d.pathname=d.pathname==="/"?t:P([t,d.pathname])),(s.replace?r.replace:r.push)(d,s.state,s)},[t,r,o,n,e])}u.createContext(null);function W(e,{relative:t}={}){let{matches:r}=u.useContext(k),{pathname:a}=_(),n=JSON.stringify(Pe(r));return u.useMemo(()=>ke(e,JSON.parse(n),a,t==="path"),[e,n,a,t])}function _t(e,t){return Te(e,t)}function Te(e,t,r,a){var x;b(H(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:n}=u.useContext(L),{matches:o}=u.useContext(k),i=o[o.length-1],c=i?i.params:{};i&&i.pathname;let l=i?i.pathnameBase:"/";i&&i.route;let s=_(),d;if(t){let h=typeof t=="string"?D(t):t;b(l==="/"||((x=h.pathname)==null?void 0:x.startsWith(l)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${l}" but pathname "${h.pathname}" was given in the \`location\` prop.`),d=h}else d=s;let f=d.pathname||"/",m=f;if(l!=="/"){let h=l.replace(/^\//,"").split("/");m="/"+f.replace(/^\//,"").split("/").slice(h.length).join("/")}let p=Ce(e,{pathname:m}),v=Ft(p&&p.map(h=>Object.assign({},h,{params:Object.assign({},c,h.params),pathname:P([l,n.encodeLocation?n.encodeLocation(h.pathname).pathname:h.pathname]),pathnameBase:h.pathnameBase==="/"?l:P([l,n.encodeLocation?n.encodeLocation(h.pathnameBase).pathname:h.pathnameBase])})),o,r,a);return t&&v?u.createElement(U.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",...d},navigationType:"POP"}},v):v}function jt(){let e=Ht(),t=Lt(e)?`${e.status} ${e.statusText}`:e instanceof Error?e.message:JSON.stringify(e),r=e instanceof Error?e.stack:null,n={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return u.createElement(u.Fragment,null,u.createElement("h2",null,"Unexpected Application Error!"),u.createElement("h3",{style:{fontStyle:"italic"}},t),r?u.createElement("pre",{style:n},r):null,null)}var Tt=u.createElement(jt,null),Dt=class extends u.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,t){return t.location!==e.location||t.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:t.error,location:t.location,revalidation:e.revalidation||t.revalidation}}componentDidCatch(e,t){console.error("React Router caught the following error during render",e,t)}render(){return this.state.error!==void 0?u.createElement(k.Provider,{value:this.props.routeContext},u.createElement(oe.Provider,{value:this.state.error,children:this.props.component})):this.props.children}};function Ot({routeContext:e,match:t,children:r}){let a=u.useContext(O);return a&&a.static&&a.staticContext&&(t.route.errorElement||t.route.ErrorBoundary)&&(a.staticContext._deepestRenderedBoundaryId=t.route.id),u.createElement(k.Provider,{value:e},r)}function Ft(e,t=[],r=null,a=null){if(e==null){if(!r)return null;if(r.errors)e=r.matches;else if(t.length===0&&!r.initialized&&r.matches.length>0)e=r.matches;else return null}let n=e,o=r==null?void 0:r.errors;if(o!=null){let l=n.findIndex(s=>s.route.id&&(o==null?void 0:o[s.route.id])!==void 0);b(l>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(o).join(",")}`),n=n.slice(0,Math.min(n.length,l+1))}let i=!1,c=-1;if(r)for(let l=0;l<n.length;l++){let s=n[l];if((s.route.HydrateFallback||s.route.hydrateFallbackElement)&&(c=l),s.route.id){let{loaderData:d,errors:f}=r,m=s.route.loader&&!d.hasOwnProperty(s.route.id)&&(!f||f[s.route.id]===void 0);if(s.route.lazy||m){i=!0,c>=0?n=n.slice(0,c+1):n=[n[0]];break}}}return n.reduceRight((l,s,d)=>{let f,m=!1,p=null,v=null;r&&(f=o&&s.route.id?o[s.route.id]:void 0,p=s.route.errorElement||Tt,i&&(c<0&&d===0?(zt("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),m=!0,v=null):c===d&&(m=!0,v=s.route.hydrateFallbackElement||null)));let x=t.concat(n.slice(0,d+1)),h=()=>{let y;return f?y=p:m?y=v:s.route.Component?y=u.createElement(s.route.Component,null):s.route.element?y=s.route.element:y=l,u.createElement(Ot,{match:s,routeContext:{outlet:l,matches:x,isDataRoute:r!=null},children:y})};return r&&(s.route.ErrorBoundary||s.route.errorElement||d===0)?u.createElement(Dt,{location:r.location,revalidation:r.revalidation,component:p,error:f,children:h(),routeContext:{outlet:null,matches:x,isDataRoute:!0}}):h()},null)}function ie(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function At(e){let t=u.useContext(O);return b(t,ie(e)),t}function Bt(e){let t=u.useContext(Q);return b(t,ie(e)),t}function Mt(e){let t=u.useContext(k);return b(t,ie(e)),t}function le(e){let t=Mt(e),r=t.matches[t.matches.length-1];return b(r.route.id,`${e} can only be used on routes that contain a unique "id"`),r.route.id}function Ut(){return le("useRouteId")}function Ht(){var a;let e=u.useContext(oe),t=Bt("useRouteError"),r=le("useRouteError");return e!==void 0?e:(a=t.errors)==null?void 0:a[r]}function Wt(){let{router:e}=At("useNavigate"),t=le("useNavigate"),r=u.useRef(!1);return _e(()=>{r.current=!0}),u.useCallback(async(n,o={})=>{I(r.current,Ne),r.current&&(typeof n=="number"?e.navigate(n):await e.navigate(n,{fromRouteId:t,...o}))},[e,t])}var ve={};function zt(e,t,r){ve[e]||(ve[e]=!0,I(!1,r))}u.memo(Vt);function Vt({routes:e,future:t,state:r}){return Te(e,void 0,r,t)}function T(e){b(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function Jt({basename:e="/",children:t=null,location:r,navigationType:a="POP",navigator:n,static:o=!1}){b(!H(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let i=e.replace(/^\/*/,"/"),c=u.useMemo(()=>({basename:i,navigator:n,static:o,future:{}}),[i,n,o]);typeof r=="string"&&(r=D(r));let{pathname:l="/",search:s="",hash:d="",state:f=null,key:m="default"}=r,p=u.useMemo(()=>{let v=$(l,i);return v==null?null:{location:{pathname:v,search:s,hash:d,state:f,key:m},navigationType:a}},[i,l,s,d,f,m,a]);return I(p!=null,`<Router basename="${i}"> is not able to match the URL "${l}${s}${d}" because it does not start with the basename, so the <Router> won't render anything.`),p==null?null:u.createElement(L.Provider,{value:c},u.createElement(U.Provider,{children:t,value:p}))}function xe({children:e,location:t}){return _t(ne(e),t)}function ne(e,t=[]){let r=[];return u.Children.forEach(e,(a,n)=>{if(!u.isValidElement(a))return;let o=[...t,n];if(a.type===u.Fragment){r.push.apply(r,ne(a.props.children,o));return}b(a.type===T,`[${typeof a.type=="string"?a.type:a.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),b(!a.props.index||!a.props.children,"An index route cannot have child routes.");let i={id:a.props.id||o.join("-"),caseSensitive:a.props.caseSensitive,element:a.props.element,Component:a.props.Component,index:a.props.index,path:a.props.path,loader:a.props.loader,action:a.props.action,hydrateFallbackElement:a.props.hydrateFallbackElement,HydrateFallback:a.props.HydrateFallback,errorElement:a.props.errorElement,ErrorBoundary:a.props.ErrorBoundary,hasErrorBoundary:a.props.hasErrorBoundary===!0||a.props.ErrorBoundary!=null||a.props.errorElement!=null,shouldRevalidate:a.props.shouldRevalidate,handle:a.props.handle,lazy:a.props.lazy};a.props.children&&(i.children=ne(a.props.children,o)),r.push(i)}),r}var K="get",q="application/x-www-form-urlencoded";function X(e){return e!=null&&typeof e.tagName=="string"}function Kt(e){return X(e)&&e.tagName.toLowerCase()==="button"}function qt(e){return X(e)&&e.tagName.toLowerCase()==="form"}function Yt(e){return X(e)&&e.tagName.toLowerCase()==="input"}function Gt(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function Qt(e,t){return e.button===0&&(!t||t==="_self")&&!Gt(e)}var J=null;function Xt(){if(J===null)try{new FormData(document.createElement("form"),0),J=!1}catch{J=!0}return J}var Zt=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function ee(e){return e!=null&&!Zt.has(e)?(I(!1,`"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${q}"`),null):e}function er(e,t){let r,a,n,o,i;if(qt(e)){let c=e.getAttribute("action");a=c?$(c,t):null,r=e.getAttribute("method")||K,n=ee(e.getAttribute("enctype"))||q,o=new FormData(e)}else if(Kt(e)||Yt(e)&&(e.type==="submit"||e.type==="image")){let c=e.form;if(c==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let l=e.getAttribute("formaction")||c.getAttribute("action");if(a=l?$(l,t):null,r=e.getAttribute("formmethod")||c.getAttribute("method")||K,n=ee(e.getAttribute("formenctype"))||ee(c.getAttribute("enctype"))||q,o=new FormData(c,e),!Xt()){let{name:s,type:d,value:f}=e;if(d==="image"){let m=s?`${s}.`:"";o.append(`${m}x`,"0"),o.append(`${m}y`,"0")}else s&&o.append(s,f)}}else{if(X(e))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');r=K,a=null,n=q,i=e}return o&&n==="text/plain"&&(i=o,o=void 0),{action:a,method:r.toLowerCase(),encType:n,formData:o,body:i}}function se(e,t){if(e===!1||e===null||typeof e>"u")throw new Error(t)}async function tr(e,t){if(e.id in t)return t[e.id];try{let r=await import(e.module);return t[e.id]=r,r}catch(r){return console.error(`Error loading route module \`${e.module}\`, reloading page...`),console.error(r),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function rr(e){return e==null?!1:e.href==null?e.rel==="preload"&&typeof e.imageSrcSet=="string"&&typeof e.imageSizes=="string":typeof e.rel=="string"&&typeof e.href=="string"}async function nr(e,t,r){let a=await Promise.all(e.map(async n=>{let o=t.routes[n.route.id];if(o){let i=await tr(o,r);return i.links?i.links():[]}return[]}));return lr(a.flat(1).filter(rr).filter(n=>n.rel==="stylesheet"||n.rel==="preload").map(n=>n.rel==="stylesheet"?{...n,rel:"prefetch",as:"style"}:{...n,rel:"prefetch"}))}function we(e,t,r,a,n,o){let i=(l,s)=>r[s]?l.route.id!==r[s].route.id:!0,c=(l,s)=>{var d;return r[s].pathname!==l.pathname||((d=r[s].route.path)==null?void 0:d.endsWith("*"))&&r[s].params["*"]!==l.params["*"]};return o==="assets"?t.filter((l,s)=>i(l,s)||c(l,s)):o==="data"?t.filter((l,s)=>{var f;let d=a.routes[l.route.id];if(!d||!d.hasLoader)return!1;if(i(l,s)||c(l,s))return!0;if(l.route.shouldRevalidate){let m=l.route.shouldRevalidate({currentUrl:new URL(n.pathname+n.search+n.hash,window.origin),currentParams:((f=r[0])==null?void 0:f.params)||{},nextUrl:new URL(e,window.origin),nextParams:l.params,defaultShouldRevalidate:!0});if(typeof m=="boolean")return m}return!0}):[]}function ar(e,t){return or(e.map(r=>{let a=t.routes[r.route.id];if(!a)return[];let n=[a.module];return a.imports&&(n=n.concat(a.imports)),n}).flat(1))}function or(e){return[...new Set(e)]}function ir(e){let t={},r=Object.keys(e).sort();for(let a of r)t[a]=e[a];return t}function lr(e,t){let r=new Set;return new Set(t),e.reduce((a,n)=>{let o=JSON.stringify(ir(n));return r.has(o)||(r.add(o),a.push({key:o,link:n})),a},[])}function sr(e){let t=typeof e=="string"?new URL(e,typeof window>"u"?"server://singlefetch/":window.location.origin):e;return t.pathname==="/"?t.pathname="_root.data":t.pathname=`${t.pathname.replace(/\/$/,"")}.data`,t}function ur(){let e=u.useContext(O);return se(e,"You must render this element inside a <DataRouterContext.Provider> element"),e}function cr(){let e=u.useContext(Q);return se(e,"You must render this element inside a <DataRouterStateContext.Provider> element"),e}var ue=u.createContext(void 0);ue.displayName="FrameworkContext";function De(){let e=u.useContext(ue);return se(e,"You must render this element inside a <HydratedRouter> element"),e}function dr(e,t){let r=u.useContext(ue),[a,n]=u.useState(!1),[o,i]=u.useState(!1),{onFocus:c,onBlur:l,onMouseEnter:s,onMouseLeave:d,onTouchStart:f}=t,m=u.useRef(null);u.useEffect(()=>{if(e==="render"&&i(!0),e==="viewport"){let x=y=>{y.forEach(w=>{i(w.isIntersecting)})},h=new IntersectionObserver(x,{threshold:.5});return m.current&&h.observe(m.current),()=>{h.disconnect()}}},[e]),u.useEffect(()=>{if(a){let x=setTimeout(()=>{i(!0)},100);return()=>{clearTimeout(x)}}},[a]);let p=()=>{n(!0)},v=()=>{n(!1),i(!1)};return r?e!=="intent"?[o,m,{}]:[o,m,{onFocus:A(c,p),onBlur:A(l,v),onMouseEnter:A(s,p),onMouseLeave:A(d,v),onTouchStart:A(f,p)}]:[!1,m,{}]}function A(e,t){return r=>{e&&e(r),r.defaultPrevented||t(r)}}function fr({page:e,...t}){let{router:r}=ur(),a=u.useMemo(()=>Ce(r.routes,e,r.basename),[r.routes,e,r.basename]);return a?u.createElement(mr,{page:e,matches:a,...t}):(console.warn(`Tried to prefetch ${e} but no routes matched.`),null)}function hr(e){let{manifest:t,routeModules:r}=De(),[a,n]=u.useState([]);return u.useEffect(()=>{let o=!1;return nr(e,t,r).then(i=>{o||n(i)}),()=>{o=!0}},[e,t,r]),a}function mr({page:e,matches:t,...r}){let a=_(),{manifest:n,routeModules:o}=De(),{loaderData:i,matches:c}=cr(),l=u.useMemo(()=>we(e,t,c,n,a,"data"),[e,t,c,n,a]),s=u.useMemo(()=>we(e,t,c,n,a,"assets"),[e,t,c,n,a]),d=u.useMemo(()=>{if(e===a.pathname+a.search+a.hash)return[];let p=new Set,v=!1;if(t.forEach(h=>{var w;let y=n.routes[h.route.id];!y||!y.hasLoader||(!l.some(E=>E.route.id===h.route.id)&&h.route.id in i&&((w=o[h.route.id])!=null&&w.shouldRevalidate)||y.hasClientLoader?v=!0:p.add(h.route.id))}),p.size===0)return[];let x=sr(e);return v&&p.size>0&&x.searchParams.set("_routes",t.filter(h=>p.has(h.route.id)).map(h=>h.route.id).join(",")),[x.pathname+x.search]},[i,a,n,l,t,e,o]),f=u.useMemo(()=>ar(s,n),[s,n]),m=hr(s);return u.createElement(u.Fragment,null,d.map(p=>u.createElement("link",{key:p,rel:"prefetch",as:"fetch",href:p,...r})),f.map(p=>u.createElement("link",{key:p,rel:"modulepreload",href:p,...r})),m.map(({key:p,link:v})=>u.createElement("link",{key:p,...v})))}function pr(...e){return t=>{e.forEach(r=>{typeof r=="function"?r(t):r!=null&&(r.current=t)})}}var Oe=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{Oe&&(window.__reactRouterVersion="7.0.1")}catch{}function gr({basename:e,children:t,window:r}){let a=u.useRef();a.current==null&&(a.current=at({window:r,v5Compat:!0}));let n=a.current,[o,i]=u.useState({action:n.action,location:n.location}),c=u.useCallback(l=>{u.startTransition(()=>i(l))},[i]);return u.useLayoutEffect(()=>n.listen(c),[n,c]),u.createElement(Jt,{basename:e,children:t,location:o.location,navigationType:o.action,navigator:n})}var Fe=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,N=u.forwardRef(function({onClick:t,discover:r="render",prefetch:a="none",relative:n,reloadDocument:o,replace:i,state:c,target:l,to:s,preventScrollReset:d,viewTransition:f,...m},p){let{basename:v}=u.useContext(L),x=typeof s=="string"&&Fe.test(s),h,y=!1;if(typeof s=="string"&&x&&(h=s,Oe))try{let S=new URL(window.location.href),j=s.startsWith("//")?new URL(S.protocol+s):new URL(s),ce=$(j.pathname,v);j.origin===S.origin&&ce!=null?s=ce+j.search+j.hash:y=!0}catch{I(!1,`<Link to="${s}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}let w=It(s,{relative:n}),[E,R,C]=dr(a,m),z=wr(s,{replace:i,state:c,target:l,preventScrollReset:d,relative:n,viewTransition:f});function F(S){t&&t(S),S.defaultPrevented||z(S)}let V=u.createElement("a",{...m,...C,href:h||w,onClick:y||o?t:F,ref:pr(p,R),target:l,"data-discover":!x&&r==="render"?"true":void 0});return E&&!x?u.createElement(u.Fragment,null,V,u.createElement(fr,{page:w})):V});N.displayName="Link";var yr=u.forwardRef(function({"aria-current":t="page",caseSensitive:r=!1,className:a="",end:n=!1,style:o,to:i,viewTransition:c,children:l,...s},d){let f=W(i,{relative:s.relative}),m=_(),p=u.useContext(Q),{navigator:v,basename:x}=u.useContext(L),h=p!=null&&Sr(f)&&c===!0,y=v.encodeLocation?v.encodeLocation(f).pathname:f.pathname,w=m.pathname,E=p&&p.navigation&&p.navigation.location?p.navigation.location.pathname:null;r||(w=w.toLowerCase(),E=E?E.toLowerCase():null,y=y.toLowerCase()),E&&x&&(E=$(E,x)||E);const R=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let C=w===y||!n&&w.startsWith(y)&&w.charAt(R)==="/",z=E!=null&&(E===y||!n&&E.startsWith(y)&&E.charAt(y.length)==="/"),F={isActive:C,isPending:z,isTransitioning:h},V=C?t:void 0,S;typeof a=="function"?S=a(F):S=[a,C?"active":null,z?"pending":null,h?"transitioning":null].filter(Boolean).join(" ");let j=typeof o=="function"?o(F):o;return u.createElement(N,{...s,"aria-current":V,className:S,ref:d,style:j,to:i,viewTransition:c},typeof l=="function"?l(F):l)});yr.displayName="NavLink";var vr=u.forwardRef(({discover:e="render",fetcherKey:t,navigate:r,reloadDocument:a,replace:n,state:o,method:i=K,action:c,onSubmit:l,relative:s,preventScrollReset:d,viewTransition:f,...m},p)=>{let v=Rr(),x=Cr(c,{relative:s}),h=i.toLowerCase()==="get"?"get":"post",y=typeof c=="string"&&Fe.test(c),w=E=>{if(l&&l(E),E.defaultPrevented)return;E.preventDefault();let R=E.nativeEvent.submitter,C=(R==null?void 0:R.getAttribute("formmethod"))||i;v(R||E.currentTarget,{fetcherKey:t,method:C,navigate:r,replace:n,state:o,relative:s,preventScrollReset:d,viewTransition:f})};return u.createElement("form",{ref:p,method:h,action:x,onSubmit:a?l:w,...m,"data-discover":!y&&e==="render"?"true":void 0})});vr.displayName="Form";function xr(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Ae(e){let t=u.useContext(O);return b(t,xr(e)),t}function wr(e,{target:t,replace:r,state:a,preventScrollReset:n,relative:o,viewTransition:i}={}){let c=je(),l=_(),s=W(e,{relative:o});return u.useCallback(d=>{if(Qt(d,t)){d.preventDefault();let f=r!==void 0?r:B(l)===B(s);c(e,{replace:f,state:a,preventScrollReset:n,relative:o,viewTransition:i})}},[l,c,s,r,a,t,e,n,o,i])}var Er=0,br=()=>`__${String(++Er)}__`;function Rr(){let{router:e}=Ae("useSubmit"),{basename:t}=u.useContext(L),r=Ut();return u.useCallback(async(a,n={})=>{let{action:o,method:i,encType:c,formData:l,body:s}=er(a,t);if(n.navigate===!1){let d=n.fetcherKey||br();await e.fetch(d,r,n.action||o,{preventScrollReset:n.preventScrollReset,formData:l,body:s,formMethod:n.method||i,formEncType:n.encType||c,flushSync:n.flushSync})}else await e.navigate(n.action||o,{preventScrollReset:n.preventScrollReset,formData:l,body:s,formMethod:n.method||i,formEncType:n.encType||c,replace:n.replace,state:n.state,fromRouteId:r,flushSync:n.flushSync,viewTransition:n.viewTransition})},[e,t,r])}function Cr(e,{relative:t}={}){let{basename:r}=u.useContext(L),a=u.useContext(k);b(a,"useFormAction must be used inside a RouteContext");let[n]=a.matches.slice(-1),o={...W(e||".",{relative:t})},i=_();if(e==null){o.search=i.search;let c=new URLSearchParams(o.search),l=c.getAll("index");if(l.some(d=>d==="")){c.delete("index"),l.filter(f=>f).forEach(f=>c.append("index",f));let d=c.toString();o.search=d?`?${d}`:""}}return(!e||e===".")&&n.route.index&&(o.search=o.search?o.search.replace(/^\?/,"?index&"):"?index"),r!=="/"&&(o.pathname=o.pathname==="/"?r:P([r,o.pathname])),B(o)}function Sr(e,t={}){let r=u.useContext(Ie);b(r!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:a}=Ae("useViewTransitionState"),n=W(e,{relative:t.relative});if(!r.isTransitioning)return!1;let o=$(r.currentLocation.pathname,a)||r.currentLocation.pathname,i=$(r.nextLocation.pathname,a)||r.nextLocation.pathname;return Y(n.pathname,i)!=null||Y(n.pathname,o)!=null}new TextEncoder;const Lr="/assets/LemoLogo-DhWyFmFQ.png",Pr="/assets/LemoLogo-aoklQ1cw.JPG",kr=({onThemeToggle:e,isAuth:t,onLogout:r})=>{const[a,n]=u.useState(!1),[o,i]=u.useState(!1),c=u.useRef(null),l=je(),s=()=>{n(!a)},d=()=>{i(!o),e(!o)},f=p=>{c.current&&!c.current.contains(p.target)&&n(!1)};u.useEffect(()=>(document.addEventListener("mousedown",f),()=>{document.removeEventListener("mousedown",f)}),[]);const m=()=>{window.confirm("Are you sure you want to log out?")&&(localStorage.removeItem("token"),n(!1),l("/login"),r(),console.log("User logged out successfully"))};return g.jsxs("nav",{className:`px-6 flex justify-between items-center shadow-sm ${o?"bg-gray-800 text-white":"bg-purple-950"}`,children:[g.jsxs("div",{className:"flex items-center space-x-8",children:[g.jsx("div",{className:"py-4",children:g.jsx(N,{to:t?"/calendar":"/",children:g.jsx("img",{src:Lr,alt:"Lemo Barber Shop Logo",className:"w-16 h-16 mx-auto object-cover"})})}),t&&g.jsxs("ul",{className:"flex items-center space-x-6",children:[g.jsx("li",{children:g.jsx(N,{to:"/",className:"hover:text-blue-500 transition text-white",children:"Home"})}),g.jsx("li",{children:g.jsx(N,{to:"/calendar",className:"hover:text-blue-500 transition text-white",children:"Calendar"})}),g.jsx("li",{children:g.jsx(N,{to:"/customers",className:"hover:text-blue-500 transition text-white",children:"Customers"})})]})]}),g.jsxs("div",{className:"flex items-center space-x-6",children:[g.jsx("button",{onClick:d,className:`p-1 rounded-full ${o?"bg-gray-700 hover:bg-gray-600":"bg-purple-900 hover:bg-purple-950"}`,"aria-label":"Toggle Theme",children:o?g.jsx("span",{role:"img","aria-label":"light mode",children:"🌙"}):g.jsx("span",{role:"img","aria-label":"dark mode",children:"🌞"})}),t?g.jsxs("div",{className:"relative",ref:c,children:[g.jsx("img",{src:Pr,alt:"LemoLogo",className:"w-10 h-10 rounded-full mx-auto cursor-pointer object-cover",onClick:s}),a&&g.jsxs("div",{className:"absolute right-0 mt-1 bg-white shadow-lg rounded-3xl py-2 w-48 z-50 border border-gray-200",children:[g.jsx(N,{to:"/profile",className:"block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl",onClick:()=>n(!1),children:"Profile"}),g.jsx("button",{onClick:m,className:"w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-3xl",children:"Logout"})]})]}):g.jsx("div",{className:"flex gap-4"})]})]})},$r=u.lazy(()=>M(()=>import("./Home-Bh8Xv1uZ.js"),__vite__mapDeps([0,1]))),Ir=u.lazy(()=>M(()=>import("./CalendarPage-oXZcmNdy.js"),__vite__mapDeps([2,1,3,4,5,6]))),Nr=u.lazy(()=>M(()=>import("./Profile-DPepPl2B.js"),__vite__mapDeps([7,1,3,4]))),_r=u.lazy(()=>M(()=>import("./CustomersPage-_pQcdOIu.js"),__vite__mapDeps([8,1,5]))),jr=u.lazy(()=>M(()=>import("./Login-nMeRxVQo.js"),__vite__mapDeps([9,1]))),Tr=()=>{const[e,t]=u.useState(!1),[r,a]=u.useState(!1);u.useEffect(()=>{const o=localStorage.getItem("token");a(!!o)},[]);const n=()=>{localStorage.removeItem("token"),a(!1)};return g.jsx(gr,{children:g.jsxs("div",{className:`h-screen flex flex-col ${e?"bg-gray-900 text-black":"bg-gray-100 text-gray-900"} transition-colors duration-300`,children:[g.jsx("header",{className:"h-16",children:g.jsx(kr,{isDarkMode:e,onThemeToggle:t,isAuth:r,onLogout:n})}),g.jsx("main",{className:"flex-1 overflow-hidden p-6",children:g.jsx(u.Suspense,{fallback:g.jsx("div",{children:"Loading..."}),children:r?g.jsxs(xe,{children:[g.jsx(T,{path:"/",element:g.jsx($r,{isDarkMode:e})}),g.jsx(T,{path:"/calendar",element:g.jsx(Ir,{isDarkMode:e})}),g.jsx(T,{path:"/customers",element:g.jsx(_r,{isDarkMode:e})}),g.jsx(T,{path:"/profile",element:g.jsx(Nr,{})})]}):g.jsx(xe,{children:g.jsx(T,{path:"*",element:g.jsx(jr,{setAuth:a})})})})})]})})};class Dr extends Ee.Component{constructor(t){super(t),this.state={hasError:!1}}static getDerivedStateFromError(){return{hasError:!0}}componentDidCatch(t,r){console.error("Error caught by ErrorBoundary:",t,r)}render(){return this.state.hasError?g.jsx("h1",{children:"Something went wrong. Please try again later."}):this.props.children}}te.createRoot(document.getElementById("root")).render(g.jsx(Ee.StrictMode,{children:g.jsx(Dr,{children:g.jsx(Tr,{})})}));export{g as j,je as u};
