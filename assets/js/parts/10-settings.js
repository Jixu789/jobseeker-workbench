/* ============================================================
   JOBSEARCH · 设置
   ============================================================ */
/* ---------- 备份与隐私 ---------- */
function askInput(title, desc, opts){
  const o = Object.assign({ label:"密码", type:"password", placeholder:"", okText:"确定" }, opts||{});
  return new Promise(resolve=>{
    const ov = openModal(`<h3>${esc(title)}</h3><div class="sub">${esc(desc)}</div>
      <div class="field mt12"><label>${esc(o.label)}</label><input id="ask-in" type="${attr(o.type)}" placeholder="${attr(o.placeholder)}"/></div>
      <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="ask-cancel">取消</button>
      <button class="btn" id="ask-ok">${esc(o.okText)}</button></div>`);
    const inp = ov.querySelector("#ask-in");
    const done = v=>{ ov.remove(); resolve(v); };
    setTimeout(()=>inp.focus(), 40);
    ov.querySelector("#ask-cancel").onclick = ()=>done(null);
    ov.querySelector("#ask-ok").onclick = ()=>done(inp.value.trim()||null);
    inp.onkeydown = e=>{ if(e.key==="Enter") done(inp.value.trim()||null); };
  });
}
/* 备份正文：永远剔除 API Key，避免把密钥随文件发出去 */
const BACKUP_MODULES = [
  { key:"jobs",     label:"岗位",     desc:"岗位库、JD 与推进记录" },
  { key:"resumes",  label:"简历",     desc:"定制简历与简历原文" },
  { key:"sessions", label:"面试记录", desc:"模拟面试问答与复盘" },
  { key:"todo",     label:"待办",     desc:"清单与完成时间" },
  { key:"note",     label:"笔记",     desc:"随手记与灵感" },
  { key:"trash",    label:"回收站",   desc:"误删待恢复的内容" },
];
const IMPORT_SNAP = "::import-snapshot";
function moduleCount(d, k){ return Array.isArray((d||{})[k]) ? d[k].length : 0; }
function cleanSettings(st){
  const c = Object.assign({}, st||{});
  delete c.apiKey; delete c.apiKeyVault; delete c.lastExportAt; delete c.lastExportNote; delete c.healthTipAt; delete c.privacyAck; delete c.onboarded;
  return c;
}
/* 只导出勾选的模块；密钥与提醒时间等本机状态不进备份 */
function exportPayload(opts){
  const o = opts || {};
  const mods = Array.isArray(o.modules) && o.modules.length ? o.modules : BACKUP_MODULES.map(m=>m.key);
  const clone = {};
  BACKUP_MODULES.forEach(m=>{
    if(mods.indexOf(m.key) >= 0) clone[m.key] = JSON.parse(JSON.stringify(data[m.key] || []));
  });
  if(mods.indexOf("jobs") >= 0) clone.activeJobId = data.activeJobId || null;
  if(mods.indexOf("resumes") >= 0) clone.activeResumeId = data.activeResumeId || null;
  /* 反问清单挂在面试模块里，一起带走才不会丢 */
  if(mods.indexOf("sessions") >= 0 && data.reverse) clone.reverse = JSON.parse(JSON.stringify(data.reverse));
  clone.meta = JSON.parse(JSON.stringify(data.meta || {}));
  clone.settings = cleanSettings(data.settings);
  clone.__meta = { app:"qicheng", kind:"profile", v:2, at:nowISO(), profile:activeProfile().name, modules:mods };
  return clone;
}
/* 档案有没有实际数据（从未激活过的档案可能没有存储键） */
function profileStored(p){
  if(p.id === activePid()) return true;
  try{ return !!localStorage.getItem(STORE_BASE+"::"+p.id); }catch(e){ return false; }
}
/* 全档案包：一次带走这台设备上的所有档案 */
function exportAllPayload(){
  const packs = [];
  profiles().forEach(p=>{
    if(!profileStored(p)) return;
    let raw = null;
    if(p.id === activePid()) raw = data;
    else { try{ raw = JSON.parse(localStorage.getItem(STORE_BASE+"::"+p.id) || "null"); }catch(e){} }
    if(!raw) return;
    const c = JSON.parse(JSON.stringify(raw));
    if(c.settings) c.settings = cleanSettings(c.settings);
    delete c.__meta;
    packs.push({ pid:p.id, name:p.name, data:c });
  });
  return { app:"qicheng", kind:"profiles", v:2, at:nowISO(), profiles:packs };
}
function markExported(extra){
  data.settings.lastExportAt = nowISO();
  if(extra) data.settings.lastExportNote = String(extra).slice(0,80);
  store.save();
}
function importPayload(obj){
  if(!obj || typeof obj !== "object") return false;
  const meta = obj.__meta || {};
  const mods = Array.isArray(meta.modules) ? meta.modules.filter(k=>BACKUP_MODULES.some(m=>m.key===k)) : null;
  const partial = !!(mods && mods.length && mods.length < BACKUP_MODULES.length);
  if(!partial && !Array.isArray(obj.jobs)) return false;
  delete obj.__meta;
  if(obj.settings){ delete obj.settings.apiKey; delete obj.settings.apiKeyVault; }
  const keepKey = (data.settings && data.settings.apiKey) || "";
  const keepVault = (data.settings && data.settings.apiKeyVault) || null;
  const old = data;
  const next = migrateV1toV2(obj);
  /* 部分备份只替换它带的模块：选了「只导岗位」，就不该把本机简历清空；
     声明了某模块但文件里实际缺失时，也保留本机的内容 */
  if(partial){
    BACKUP_MODULES.forEach(m=>{
      if(mods.indexOf(m.key) < 0 || !Array.isArray(obj[m.key])) next[m.key] = old[m.key];
    });
    if(mods.indexOf("jobs") < 0 || !Array.isArray(obj.jobs)) next.activeJobId = old.activeJobId;
    if(mods.indexOf("resumes") < 0 || !Array.isArray(obj.resumes)) next.activeResumeId = old.activeResumeId;
    if(mods.indexOf("sessions") < 0 || !Array.isArray((obj.reverse||{}).extra)) next.reverse = old.reverse;
    next.settings = old.settings;
  }
  data = next;
  ensureShape();
  data.settings.privacyAck = true;
  data.settings.onboarded = true;
  /* 备份里的 active 指向可能在本机不存在，回退到第一条 */
  if(!(data.jobs||[]).some(j=>j && j.id === data.activeJobId)) data.activeJobId = (data.jobs[0]||{}).id || null;
  if(!(data.resumes||[]).some(r=>r && r.id === data.activeResumeId)) data.activeResumeId = (data.resumes[0]||{}).id || null;
  /* 本机已保存的密钥（明文或密文保险箱）不随导入文件变化 */
  if(keepVault) data.settings.apiKeyVault = keepVault;
  if(keepKey){ data.settings.apiKey = keepKey; data.settings.engine = "api"; }
  store.save();
  return true;
}
/* ---------- 导入前快照：只留最近一份，覆盖 / 合并后可一键回滚 ---------- */
function snapshotKey(){ return storeKey() + IMPORT_SNAP; }
function snapshotSave(){
  try{
    const copy = { at:nowISO(), data:JSON.parse(JSON.stringify(data)) };
    /* 快照只用于数据回滚，不复制密钥：避免明文/密文长期留在第二个存储键里 */
    if(copy.data.settings){ delete copy.data.settings.apiKey; delete copy.data.settings.apiKeyVault; }
    localStorage.setItem(snapshotKey(), JSON.stringify(copy));
    return true;
  }
  /* 写不进去（多半是配额满了）就把旧快照清掉，避免「撤销」回滚到更早的内容 */
  catch(e){ try{ localStorage.removeItem(snapshotKey()); }catch(_){} return false; }
}
function snapshotGet(){
  try{
    const o = JSON.parse(localStorage.getItem(snapshotKey()) || "null");
    if(!(o && o.data)) return null;
    /* 兼容旧版本留下的快照：读到就把其中的密钥抹掉并回写 */
    if(o.data.settings && (o.data.settings.apiKey || o.data.settings.apiKeyVault)){
      delete o.data.settings.apiKey; delete o.data.settings.apiKeyVault;
      try{ localStorage.setItem(snapshotKey(), JSON.stringify(o)); }catch(e){}
    }
    return o;
  }catch(e){ return null; }
}
function snapshotBack(){
  const s = snapshotGet();
  if(!s) return false;
  const keepKey = (data.settings && data.settings.apiKey) || "";
  const keepVault = (data.settings && data.settings.apiKeyVault) || null;
  data = migrateV1toV2(s.data);
  ensureShape();
  if(keepVault) data.settings.apiKeyVault = keepVault;
  if(keepKey){ data.settings.apiKey = keepKey; data.settings.engine = "api"; }
  /* 先清快照再渲染，设置页里那一行才会跟着消失 */
  try{ localStorage.removeItem(snapshotKey()); }catch(e){}
  store.save(); render();
  toast("已恢复成导入前的内容");
  return true;
}
/* 合并：以本机为准，只补文件里本机没有的条目（按 id 判重） */
function mergeBackup(obj){
  if(!snapshotSave()) return { added:0, kept:0, snapFailed:true };
  const inc = migrateV1toV2(Object.assign({}, obj));
  let added = 0, kept = 0;
  BACKUP_MODULES.forEach(m=>{
    const incList = Array.isArray(inc[m.key]) ? inc[m.key] : [];
    const cur = Array.isArray(data[m.key]) ? data[m.key] : (data[m.key] = []);
    const ids = new Set(cur.map(x=>x && x.id));
    incList.forEach(x=>{
      if(!x || !x.id || ids.has(x.id)){ kept++; return; }
      cur.push(x); ids.add(x.id); added++;
    });
  });
  /* 反问清单没有 id，按问题文本判重 */
  const incEx = (inc.reverse && Array.isArray(inc.reverse.extra)) ? inc.reverse.extra : [];
  if(incEx.length){
    data.reverse = data.reverse || { extra:[] };
    data.reverse.extra = Array.isArray(data.reverse.extra) ? data.reverse.extra : [];
    const qs = new Set(data.reverse.extra.map(x=>x && x.q));
    incEx.forEach(x=>{
      if(!x || !x.q || qs.has(x.q)){ kept++; return; }
      data.reverse.extra.push(x); qs.add(x.q); added++;
    });
  }
  if(!data.activeJobId) data.activeJobId = inc.activeJobId || (data.jobs[0]||{}).id || null;
  if(!data.activeResumeId) data.activeResumeId = inc.activeResumeId || (data.resumes[0]||{}).id || null;
  ensureShape(); store.save();
  return { added, kept };
}
/* 导入为新档案：原有档案一行不动 */
function importAsNewProfile(src, name){
  const d = JSON.parse(JSON.stringify(src));
  delete d.__meta;
  if(d.settings) d.settings = cleanSettings(d.settings);
  d.settings = d.settings || {};
  d.settings.onboarded = true;
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  const list = profiles();
  let nm = String(name || ("导入 " + isoToday())).slice(0,20);
  const names = new Set(list.map(p=>p.name));
  if(names.has(nm)){
    /* 留出「 2」「 999」的位置，避免截断后又撞名导致死循环 */
    const base = nm.slice(0,16);
    let n = 2, cand = nm;
    while(names.has(cand) && n < 1000){ cand = (base+" "+n).slice(0,20); n++; }
    nm = cand;
  }
  localStorage.setItem(STORE_BASE + "::" + id, JSON.stringify(d));
  list.push({ id, name:nm });
  saveProfiles(list);
  return { id, name:nm };
}
/* 读入后先预检：认得格式、看得出里面有什么，再决定怎么写入 */
function analyzeBackup(obj){
  if(!obj || typeof obj !== "object") return null;
  const appName = String(obj.app || (obj.__meta && obj.__meta.app) || "");
  if(appName && !/^qicheng$/i.test(appName) && !/jobseeker/i.test(appName)) return null;
  let kind = (obj.kind === "profiles" || obj.kind === "profile") ? obj.kind : null;
  if(!kind) kind = Array.isArray(obj.profiles) ? "profiles"
    : ((Array.isArray(obj.jobs) || (obj.__meta && obj.__meta.kind === "profile")) ? "profile" : null);
  if(!kind) return null;
  let counts = {};
  if(kind === "profiles"){
    let jobs = 0, resumes = 0, others = 0;
    (obj.profiles||[]).forEach(p=>{
      const d = p.data || {};
      jobs += moduleCount(d,"jobs"); resumes += moduleCount(d,"resumes");
      others += moduleCount(d,"sessions") + moduleCount(d,"todo") + moduleCount(d,"note") + moduleCount(d,"trash");
    });
    counts = { jobs, resumes, others };
  } else {
    BACKUP_MODULES.forEach(m=>{ counts[m.key] = moduleCount(obj, m.key); });
  }
  const meta = obj.__meta || {};
  return {
    kind,
    v: obj.v || meta.v || 1,
    at: obj.at || meta.at || "",
    profile: meta.profile || ((obj.profiles||[])[0]||{}).name || "",
    app: meta.app || obj.app || "未知来源",
    counts,
    bytes: new Blob([JSON.stringify(obj)]).size,
    profiles: Array.isArray(obj.profiles) ? obj.profiles.length : 0,
  };
}
function b64enc(u8){
  let s = "";
  for(let i=0;i<u8.length;i+=0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i+0x8000));
  return btoa(s);
}
function b64dec(str){
  const bin = atob(str); const u8 = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
async function deriveKey(pw, salt, iter){
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), { name:"PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:iter, hash:"SHA-256" },
    km, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
}
async function encryptObject(payload, pw){
  if(!(window.crypto && crypto.subtle)) throw new Error("当前浏览器不支持加密，请改用明文备份");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt, 150000);
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, plain);
  return { app:"qicheng", enc:"AES-256-GCM", v:2, at:nowISO(), kind:payload.kind || "profile",
    kdf:{ name:"PBKDF2", hash:"SHA-256", iter:150000, salt:b64enc(salt) },
    iv:b64enc(iv), data:b64enc(new Uint8Array(ct)) };
}
async function decryptBackup(obj, pw){
  if(!(window.crypto && crypto.subtle)) throw new Error("当前浏览器不支持解密");
  const iter = (obj.kdf && obj.kdf.iter) || 150000;
  const key = await deriveKey(pw, b64dec(obj.kdf.salt), iter);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv:b64dec(obj.iv) }, key, b64dec(obj.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
