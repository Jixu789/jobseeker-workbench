/* ============================================================
   JOBSEARCH · 数据层
   ============================================================ */
function fmtDate(iso){ if(!iso) return "—"; const d=new Date(iso); if(isNaN(d)) return String(iso).slice(0,10);
  return `${d.getMonth()+1}-${pad2(d.getDate())}`; }
function nowISO(){ return new Date().toISOString(); }
function getJob(id){ return (data.jobs||[]).find(j=>j.id===id)||null; }
function getResume(id){ return (data.resumes||[]).find(r=>r.id===id)||null; }
function activeJob(){ return getJob(data.activeJobId)||(data.jobs||[])[0]||null; }
function activeResume(){ return getResume(data.activeResumeId)||(data.resumes||[])[0]||null; }

function toast(msg, opt){
  let t=document.querySelector(".toast");
  if(!t){ t=document.createElement("div"); t.className="toast"; t.setAttribute("aria-live","polite"); document.body.appendChild(t); }
  t.textContent=msg;
  const hasAct=!!(opt && opt.action);
  t.classList.toggle("has-act", hasAct);
  /* 可撤销的提示用 alert，读屏会立刻播报；普通提示用 status 不打断 */
  t.setAttribute("role", hasAct ? "alert" : "status");
  if(hasAct){
    const b=document.createElement("button");
    b.type="button"; b.className="toast-act"; b.textContent=opt.action;
    b.onclick=()=>{ clearTimeout(t.__tm); t.classList.remove("on"); if(opt.onAction) opt.onAction(); };
    t.appendChild(b);
  }
  t.classList.add("on");
  clearTimeout(t.__tm); t.__tm=setTimeout(()=>t.classList.remove("on"), hasAct?7000:2400);
}
function openModal(inner, wide){
  const ov=document.createElement("div"); ov.className="overlay";
  ov.innerHTML=`<div class="modal${wide?" modal-lg":""}" role="dialog" aria-modal="true" aria-label="对话框">${inner}</div>`;
  document.body.appendChild(ov);
  /* 用弹层内的标题作为可访问名称，读屏进入时能知道这是哪个弹窗 */
  const box=ov.firstElementChild, h=box.querySelector("h3,h4");
  if(h){ const nm=h.textContent.trim(); if(nm) box.setAttribute("aria-label", nm.slice(0,60)); }
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  /* 焦点：打开时进入弹层，关闭时还给原来的触发元素 */
  const prev=document.activeElement, raw=ov.remove.bind(ov);
  ov.remove=()=>{ raw(); if(prev&&prev.focus){ try{ prev.focus({preventScroll:true}); }catch(e){} } };
  setTimeout(()=>{
    const f=ov.querySelector("input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled])");
    if(f){ try{ f.focus({preventScroll:true}); }catch(e){} }
  }, 30);
  return ov;
}
/* 弹层键盘：Esc 关闭最上层；Tab 在弹层内循环（与 aria-modal 保持一致） */
document.addEventListener("keydown", e=>{
  const ovs=[...document.querySelectorAll(".overlay")].filter(o=>o.querySelector(".modal"));
  if(!ovs.length) return;
  const top=ovs[ovs.length-1];
  if(e.key==="Escape"){ e.preventDefault(); top.remove(); return; }
  if(e.key!=="Tab") return;
  const f=[...top.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(el=>el.getClientRects().length>0);
  if(!f.length) return;
  const first=f[0], last=f[f.length-1], inTop=top.contains(document.activeElement);
  if(e.shiftKey && (!inTop || document.activeElement===first)){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && (!inTop || document.activeElement===last)){ e.preventDefault(); first.focus(); }
});
