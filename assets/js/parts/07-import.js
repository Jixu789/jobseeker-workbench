/* ============================================================
   JOBSEARCH · 文件导入（图片 / Word / PDF / 文本）
   ============================================================ */
const IMPORT_ACCEPT=".txt,.md,.markdown,.csv,.doc,.docx,.pdf,image/png,image/jpeg,image/webp,image/bmp";
function fileExt(name){ const m=/\.([a-z0-9]+)$/i.exec(String(name||"")); return m?m[1].toLowerCase():""; }
function fmtSize(n){ return n>1048576 ? (n/1048576).toFixed(1)+" MB" : Math.max(1,Math.round(n/1024))+" KB"; }
function readAsArrayBuffer(file){
  return new Promise((ok,no)=>{
    const r=new FileReader();
    r.onload=()=>ok(r.result);
    r.onerror=()=>no(new Error("文件读取失败"));
    r.readAsArrayBuffer(file);
  });
}
async function inflateBytes(bytes, format){
  if(typeof DecompressionStream==="undefined") throw new Error("当前浏览器不支持解压该文件，请改用粘贴文本");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/* --- DOCX：按 ZIP 结构取 word/document.xml，再剥标签 --- */
function zipFindEntry(buf, want){
  const u8=new Uint8Array(buf), dv=new DataView(buf);
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65558);i--){
    if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  }
  if(eocd<0) throw new Error("这不是有效的 DOCX 文件");
  const count=dv.getUint16(eocd+10,true);
  let p=dv.getUint32(eocd+16,true);
  for(let k=0;k<count;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true);
    const csize=dv.getUint32(p+20,true);
    const nameLen=dv.getUint16(p+28,true), extraLen=dv.getUint16(p+30,true), cmtLen=dv.getUint16(p+32,true);
    const lho=dv.getUint32(p+42,true);
    const name=new TextDecoder("utf-8").decode(u8.subarray(p+46,p+46+nameLen));
    if(name===want){
      const ln=dv.getUint16(lho+26,true), le=dv.getUint16(lho+28,true);
      const start=lho+30+ln+le;
      return { method, data:u8.subarray(start,start+csize) };
    }
    p+=46+nameLen+extraLen+cmtLen;
  }
  return null;
}
async function docxToText(buf){
  const e=zipFindEntry(buf,"word/document.xml");
  if(!e) throw new Error("DOCX 里没找到正文，可能是旧版 .doc，请另存为 .docx");
  let xml;
  if(e.method===0) xml=new TextDecoder("utf-8").decode(e.data);
  else if(e.method===8) xml=new TextDecoder("utf-8").decode(await inflateBytes(e.data,"deflate-raw"));
  else throw new Error("这份 DOCX 的压缩方式暂不支持");
  return xmlToText(xml);
}
function xmlToText(xml){
  return String(xml)
    .replace(/<w:tab[^>]*\/>/g,"\t")
    .replace(/<w:br[^>]*\/>/g,"\n")
    .replace(/<\/w:p>/g,"\n")
    .replace(/<[^>]+>/g,"")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'")
    .replace(/&amp;/g,"&")
    .replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
/* --- PDF：解压 FlateDecode 内容流，提取 Tj / TJ 文本（仅文字层） --- */
function pdfLiteral(s){
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g,(m,g)=>{
    if(/^[0-7]+$/.test(g)) return String.fromCharCode(parseInt(g,8));
    return { n:"\n", r:"\r", t:"\t", b:"\b", f:"\f", "(":"(", ")":")", "\\":"\\" }[g]||g;
  });
}
function pdfHex(s){
  const h=s.replace(/\s+/g,""), bytes=[];
  for(let i=0;i<h.length;i+=2){ const v=parseInt(h.substr(i,2),16); if(!isNaN(v)) bytes.push(v); }
  if(bytes.length>3 && bytes[0]===0xFE && bytes[1]===0xFF){
    let out="";
    for(let i=2;i+1<bytes.length;i+=2) out+=String.fromCharCode((bytes[i]<<8)|bytes[i+1]);
    return out;
  }
  return bytes.map(b=>String.fromCharCode(b)).join("");
}
function pdfContentText(src){
  const out=[];
  const blocks=src.match(/BT[\s\S]*?ET/g)||[];
  blocks.forEach(b=>{
    const re=/(\((?:\\.|[^\\()])*\))|(<[0-9A-Fa-f\s]*>)|(Tj|TJ|T\*|Td|TD|Tm|'|")/g;
    let pend=[], line="", mm;
    while((mm=re.exec(b))){
      if(mm[1]) pend.push(pdfLiteral(mm[1].slice(1,-1)));
      else if(mm[2]) pend.push(pdfHex(mm[2].slice(1,-1)));
      else{
        const op=mm[3];
        if(op==="Tj"||op==="TJ"||op==="'"||op==='"' ){
          line+=pend.join(""); pend=[];
          if(op==="'"||op==='"'){ out.push(line); line=""; }
        }else{
          if(line.trim()) out.push(line);
          line=""; pend=[];
        }
      }
    }
    if(line.trim()) out.push(line);
  });
  return out.join("\n");
}
async function pdfToText(buf){
  const u8=new Uint8Array(buf);
  const latin=new TextDecoder("latin1").decode(u8);
  const chunks=[];
  const re=/stream\r?\n/g;
  let m;
  while((m=re.exec(latin))){
    const start=m.index+m[0].length;
    const end=latin.indexOf("endstream",start);
    if(end<0) break;
    const dictStart=Math.max(0,latin.lastIndexOf("<<",m.index));
    const dict=latin.slice(dictStart,m.index);
    if(!/FlateDecode/.test(dict)){ re.lastIndex=end; continue; }
    let data=u8.subarray(start,end);
    while(data.length && (data[data.length-1]===10 || data[data.length-1]===13)) data=data.subarray(0,data.length-1);
    try{
      const decoded=await inflateBytes(data,"deflate");
      const txt=pdfContentText(new TextDecoder("latin1").decode(decoded));
      if(txt.trim()) chunks.push(txt);
    }catch(e){ /* 跳过不能解压的对象 */ }
    re.lastIndex=end+9;
  }
  return chunks.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}
function textLooksBad(t){
  const s=String(t||"").replace(/\s/g,"");
  if(s.length<20) return true;
  const bad=(s.match(/[\uFFFD\u0000-\u0008\u000e-\u001f]/g)||[]).length;
  if(bad/Math.max(1,s.length)>0.02) return true;
  const cjk=(s.match(/[\u4e00-\u9fa5]/g)||[]).length;
  return cjk===0 && s.length>150 && /[\u0080-\u00ff]/.test(s);
}
/* --- 图片：有 API 用视觉模型转录，没有则给提示词让用户自己识别 --- */
function fileToDataURL(file){
  return new Promise((ok,no)=>{
    const r=new FileReader();
    r.onload=()=>ok(r.result);
    r.onerror=()=>no(new Error("图片读取失败"));
    r.readAsDataURL(file);
  });
}
async function compressImage(file,maxSide){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((ok,no)=>{
      const i=new Image();
      i.onload=()=>ok(i);
      i.onerror=()=>no(new Error("图片无法解码"));
      i.src=url;
    });
    const ratio=Math.min(1, maxSide/Math.max(img.width,img.height));
    if(ratio>=1 && file.size<1.6*1024*1024) return await fileToDataURL(file);
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(img.width*ratio));
    c.height=Math.max(1,Math.round(img.height*ratio));
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    return c.toDataURL("image/jpeg",0.86);
  } finally { URL.revokeObjectURL(url); }
}
function imagePrompt(kind){
  const what=kind==="jd" ? "岗位 JD" : "个人简历";
  return `请把这张图片里的${what}逐字转录成纯文本。要求：
1. 只输出转录文本，不要解释、不要总结、不要改写；
2. 保留原有分段、项目符号和标点；
3. 看不清的字用「□」代替，不要猜测；
4. 中文保持中文，英文保持英文，不要翻译。`;
}
async function imageToText(file,kind){
  const dataUrl=await compressImage(file,1600);
  const what=kind==="jd" ? "岗位 JD" : "个人简历";
  const txt=await aiChat([
    { role:"system", content:"你是严谨的文字转录工具，只输出转录结果，不解释、不评价。" },
    { role:"user", content:[
      { type:"text", text:imagePrompt(kind).replace(`这张图片里的${what}`,"图片里的"+what) },
      { type:"image_url", image_url:{ url:dataUrl } }
    ] }
  ]);
  return String(txt||"").trim();
}
async function extractFile(file, kind){
  const ext=fileExt(file.name), type=file.type||"";
  if(/^image\//.test(type) || ["png","jpg","jpeg","webp","bmp"].includes(ext)){
    if(!aiReady()) return { text:"", from:"图片", needAI:true,
      note:"图片需要 AI 识别。当前没配置 API：点下面按钮复制提示词，交给你常用的 AI 看图转录，再把文字粘回来。" };
    const t=await imageToText(file,kind);
    return { text:t, from:"图片 · AI 识别", note:t?"AI 已转录，请逐字核对（尤其是数字和公司名）：":"AI 没有返回内容，可以重试或直接粘贴文本。" };
  }
  if(ext==="doc") throw new Error("旧版 .doc 浏览器读不了，请另存为 .docx 或 PDF");
  if(ext==="docx") return { text:await docxToText(await readAsArrayBuffer(file)), from:"Word(.docx) · 本地提取" };
  if(ext==="pdf"){
    const t=await pdfToText(await readAsArrayBuffer(file));
    if(textLooksBad(t)) return { text:t, from:"PDF · 本地提取", warn:true,
      note:"这份 PDF 的文字层不完整（扫描件或嵌入字体），下面可能是乱码。建议改用截图上传做图片识别，或在 PDF 里全选复制粘贴。" };
    return { text:t, from:"PDF · 本地提取" };
  }
  if(["txt","md","markdown","csv"].includes(ext) || /^text\//.test(type)){
    return { text:(await file.text()).trim(), from:"文本文件" };
  }
  throw new Error("暂不支持这种格式，请用 .docx / .pdf / 图片 / .txt");
}
/* --- 交互：选择文件、拖拽、预览确认 --- */
function pickFile(cb){
  const inp=document.createElement("input");
  inp.type="file"; inp.accept=IMPORT_ACCEPT; inp.style.display="none";
  document.body.appendChild(inp);
  inp.onchange=()=>{
    const f=inp.files && inp.files[0];
    inp.remove();
    if(f) cb(f);
  };
  inp.click();
}
function wireImport(btnSel, taSel, kind, ov){
  const btn=ov.querySelector(btnSel), ta=ov.querySelector(taSel);
  if(!btn || !ta) return;
  btn.onclick=()=>pickFile(f=>runImport(f,kind,ta,ov));
  ta.addEventListener("dragover",e=>{ e.preventDefault(); ta.classList.add("ta-drop"); });
  ta.addEventListener("dragleave",()=>ta.classList.remove("ta-drop"));
  ta.addEventListener("drop",e=>{
    e.preventDefault(); ta.classList.remove("ta-drop");
    const f=e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) runImport(f,kind,ta,ov);
  });
}
async function runImport(file, kind, ta, parentOv){
  const label=kind==="jd" ? "JD" : "简历";
  const status=parentOv.querySelector(".import-status");
  const setStatus=(t,on)=>{ if(status){ status.textContent=t; status.classList.toggle("on",!!on); } };
  if(file.size>8*1024*1024){ toast("文件超过 8MB，先压缩或截图再传"); return; }
  setStatus(`正在读取 ${file.name}（${fmtSize(file.size)}）…`, true);
  let r;
  try{ r=await extractFile(file,kind); }
  catch(e){ setStatus(""); toast(e.message||"这个文件读不了"); return; }
  setStatus("");
  openImportPreview(file,kind,r,text=>{
    const old=ta.value.trim();
    ta.value = old ? old+"\n\n"+text : text;
    ta.dispatchEvent(new Event("input"));
    toast(`已填入${label} ${text.length} 字，核对后点「回填到上方各栏」`);
  });
}
function openImportPreview(file,kind,r,apply){
  const warn=!!(r.warn||r.needAI);
  const ov=openModal(`<h3>识别结果</h3>
    <div class="sub">${esc(file.name)} · ${fmtSize(file.size)} · ${esc(r.from||"")}</div>
    ${r.note?`<div class="import-file mt12" style="${warn?'border-color:var(--warning)':''}">${icon(warn?"help":"check",15)}<span>${esc(r.note)}</span></div>`:""}
    <div class="field mt12"><label>${r.needAI?"把 AI 返回的文字粘到这里":kind==="jd"?"JD 原文（可修改）":"简历全文（可修改）"}</label>
      <textarea id="ip-text" class="ta-lg" style="min-height:220px" placeholder="${r.needAI?"先复制提示词，交给 AI 识别图片，再把结果粘回来":""}">${esc(r.text||"")}</textarea>
      <div class="modal-note">填入后仍可编辑；已有内容不会被覆盖，只追加到末尾。点弹窗外的「回填到上方各栏」按钮，再按识别结果补上方空栏（只填空的）。</div></div>
    ${r.needAI?`<div class="flex mt8"><button class="btn line sm" id="ip-prompt">${icon("spark",14)} 复制图片识别提示词</button></div>`:""}
    <div class="modal-actions"><div class="spacer"></div>
      <button class="btn ghost" id="ip-cancel">取消</button>
      <button class="btn" id="ip-apply">填入${kind==="jd"?" JD":"简历"}</button></div>`, true);
  if(r.needAI) ov.querySelector("#ip-prompt").onclick=()=>copyText(imagePrompt(kind));
  ov.querySelector("#ip-cancel").onclick=()=>ov.remove();
  ov.querySelector("#ip-apply").onclick=()=>{
    const t=ov.querySelector("#ip-text").value.trim();
    if(!t){ toast("内容为空，先粘贴识别结果"); return; }
    apply(t); ov.remove();
  };
}
