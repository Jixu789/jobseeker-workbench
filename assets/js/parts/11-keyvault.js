/* ============================================================
   API KEY 保险箱 —— 口令经 PBKDF2 派生，AES-256-GCM 加密后存本机
   密文放 settings.apiKeyVault；明文 apiKey 在加密后立即删除。
   会话密钥只在内存里：刷新或关闭标签页即锁定，需重新输入口令。
   ============================================================ */
const KEYVAULT_AAD = new TextEncoder().encode("qicheng-keyvault-v1");
const KEYVAULT_ITER = 150000;
let vaultSession = { apiKey:"", key:null };

function vaultOf(){ return (data.settings && data.settings.apiKeyVault) || null; }
function keyVaultUnlocked(){ return !!(vaultSession && vaultSession.apiKey); }
function getApiKey(){
  /* 有保险箱就只认会话密钥：锁定时不再回退到可能残留的明文 */
  if(vaultOf()) return keyVaultUnlocked() ? vaultSession.apiKey : "";
  return (data.settings && data.settings.apiKey) || "";
}
function hasApiKey(){ return !!getApiKey(); }
function keyState(){
  if(vaultOf()) return keyVaultUnlocked() ? "unlocked" : "locked";
  return (data.settings && data.settings.apiKey) ? "plain" : "none";
}
function keyStateText(){
  return { none:"未配置", plain:"明文保存", locked:"已加密 · 已锁定", unlocked:"已加密 · 已解锁" }[keyState()];
}
async function vaultSealWith(key, apiKey){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ apiKey }));
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv, additionalData:KEYVAULT_AAD }, key, plain);
  return { iv:b64enc(iv), data:b64enc(new Uint8Array(ct)) };
}
async function vaultOpenWith(key, v){
  const pt = await crypto.subtle.decrypt(
    { name:"AES-GCM", iv:b64dec(v.iv), additionalData:KEYVAULT_AAD }, key, b64dec(v.data));
  const o = JSON.parse(new TextDecoder().decode(pt));
  return String((o && o.apiKey) || "");
}
/* 用口令新建保险箱（首次加密 / 更换口令） */
async function setApiKeyEncrypted(apiKey, pw){
  if(!(window.crypto && crypto.subtle)) throw new Error("当前浏览器不支持本地加密");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pw, salt, KEYVAULT_ITER);
  const sealed = await vaultSealWith(key, apiKey);
  data.settings.apiKeyVault = {
    app:"qicheng", kind:"api-key", v:1, enc:"AES-256-GCM", at:nowISO(),
    kdf:{ name:"PBKDF2", hash:"SHA-256", iter:KEYVAULT_ITER, salt:b64enc(salt) },
    iv:sealed.iv, data:sealed.data,
  };
  delete data.settings.apiKey;
  data.settings.engine = "api";
  vaultSession = { apiKey, key };
  store.save();
}
/* 已解锁时改 Key：沿用内存里的会话密钥，不要求再输口令 */
async function reencryptApiKey(apiKey){
  if(!vaultSession || !vaultSession.key) throw new Error("先解锁再修改");
  const v = vaultOf(); if(!v) throw new Error("还没有加密保存的 Key");
  const sealed = await vaultSealWith(vaultSession.key, apiKey);
  v.iv = sealed.iv; v.data = sealed.data; v.at = nowISO();
  delete data.settings.apiKey;
  vaultSession.apiKey = apiKey;
  store.save();
}
async function unlockKeyVault(pw){
  const v = vaultOf(); if(!v) throw new Error("还没有加密保存的 Key");
  if(!(window.crypto && crypto.subtle)) throw new Error("当前浏览器不支持本地解密");
  const iter = (v.kdf && v.kdf.iter) || KEYVAULT_ITER;
  const key = await deriveKey(pw, b64dec(v.kdf.salt), iter);
  const apiKey = await vaultOpenWith(key, v);
  if(!apiKey) throw new Error("解密结果为空");
  vaultSession = { apiKey, key };
  return apiKey;
}
function lockKeyVault(){ vaultSession = { apiKey:"", key:null }; }
function removeKeyVault(){
  if(data.settings){ delete data.settings.apiKeyVault; delete data.settings.apiKey; data.settings.engine = "local"; }
  vaultSession = { apiKey:"", key:null };
  store.save();
}

/* ---------- 导出弹窗：选范围、选档案、选明文/加密 ---------- */
function openExportDialog(){
  const allMods = BACKUP_MODULES.map(m=>m.key);
  let picked = allMods.filter(k=>k!=="trash");
  let all = false, enc = false;
  const ov = openModal(`<h3>导出备份</h3>
    <div class="sub">备份含手机号、邮箱与简历原文。要发给别人就先选加密；明文备份只留给自己。</div>
    <div class="mt12"><div class="tiny">导出范围</div>
      <div class="chips mt8" id="exp-mods">${BACKUP_MODULES.map(m=>
        `<button class="chip click ${picked.indexOf(m.key)>=0?"on":""}" type="button" data-mod="${m.key}">${esc(m.label)} ${moduleCount(data,m.key)}</button>`).join("")}</div>
      <div class="tiny mt8" id="exp-modhint">回收站默认不导出；需要时单独勾上。</div>
    </div>
    <div class="mt12"><div class="tiny">档案</div>
      <div class="chips mt8" id="exp-scope">
        <button class="chip click on" type="button" data-all="0">当前档案「${esc(activeProfile().name)}」</button>
        <button class="chip click" type="button" data-all="1">全部档案（${profiles().filter(profileStored).length}）</button>
      </div>
    </div>
    <div class="mt12"><div class="tiny">方式</div>
      <div class="chips mt8" id="exp-way">
        <button class="chip click on" type="button" data-enc="0">明文 JSON</button>
        <button class="chip click" type="button" data-enc="1">加密（AES-256）</button>
      </div>
    </div>
    <div class="field" id="exp-pw-wrap" style="display:none"><label for="exp-pw">备份密码</label>
      <input id="exp-pw" type="password" placeholder="至少 6 位，忘记无法找回"/></div>
    <div class="alert info mt12" id="exp-sum"></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="exp-cancel">取消</button>
      <button class="btn" id="exp-go">导出</button></div>`, true);

  const box = ov.querySelector(".modal");
  const sum = box.querySelector("#exp-sum");
  function buildPayload(){ return all ? exportAllPayload() : exportPayload({ modules:picked }); }
  function refresh(){
    const p = buildPayload();
    const bytes = new Blob([JSON.stringify(p)]).size;
    if(all){
      sum.textContent = `全部 ${p.profiles.length} 个档案 · 约 ${fmtSize(bytes)} · 不含 API Key`;
    }else{
      const n = picked.reduce((s,k)=>s+moduleCount(data,k),0);
      sum.textContent = `选中 ${picked.length} 类 / ${n} 条记录 · 约 ${fmtSize(bytes)} · 不含 API Key`;
    }
  }
  box.querySelectorAll("#exp-mods .chip").forEach(b=>b.onclick=()=>{
    if(all) return;
    const k = b.dataset.mod;
    if(picked.indexOf(k)>=0) picked = picked.filter(x=>x!==k);
    else picked.push(k);
    b.classList.toggle("on", picked.indexOf(k)>=0);
    refresh();
  });
  box.querySelectorAll("#exp-scope .chip").forEach(b=>b.onclick=()=>{
    all = b.dataset.all === "1";
    box.querySelectorAll("#exp-scope .chip").forEach(x=>x.classList.toggle("on", x===b));
    box.querySelectorAll("#exp-mods .chip").forEach(x=>{
      x.disabled = all;
      x.style.opacity = all ? .45 : 1;
    });
    box.querySelector("#exp-modhint").textContent = all
      ? "全档案包会带上每个档案的完整内容（仍不含 API Key）。"
      : "回收站默认不导出；需要时单独勾上。";
    refresh();
  });
  box.querySelectorAll("#exp-way .chip").forEach(b=>b.onclick=()=>{
    enc = b.dataset.enc === "1";
    box.querySelectorAll("#exp-way .chip").forEach(x=>x.classList.toggle("on", x===b));
    box.querySelector("#exp-pw-wrap").style.display = enc ? "" : "none";
    if(enc) setTimeout(()=>{ const i=box.querySelector("#exp-pw"); if(i) i.focus(); }, 20);
    refresh();
  });
  refresh();

  box.querySelector("#exp-cancel").onclick = ()=>ov.remove();
  box.querySelector("#exp-go").onclick = async ()=>{
    const btn = box.querySelector("#exp-go");
    if(!all && !picked.length){ toast("至少勾一类内容再导出"); return; }
    let payload = buildPayload();
    const pw = ((box.querySelector("#exp-pw")||{}).value||"").trim();
    if(enc && pw.length < 6){ toast("密码至少 6 位"); box.querySelector("#exp-pw").focus(); return; }
    if(enc){
      btn.disabled = true; btn.textContent = "加密中…";
      try{ payload = await encryptObject(payload, pw); }
      catch(e){ toast("加密失败："+e.message); btn.disabled=false; btn.textContent="导出"; return; }
    }
    const name = `启程-${all?"全档案":"备份"}-${enc?"加密-":""}${isoToday()}.json`;
    const text = JSON.stringify(payload, null, 2);
    downloadText(name, text);
    markExported(all ? `全档案 ${profiles().filter(profileStored).length} 个` : `${picked.length} 类内容` + (enc?" · 加密":""));
    ov.remove(); render();
    toast(`已导出 ${name} · ${fmtSize(new Blob([text]).size)}`);
  };
}

/* ---------- 导入弹窗：先预检摘要，再选覆盖 / 合并 / 新档案 ---------- */
function openImportDialog(){
  const ov = openModal(`<h3>导入备份</h3>
    <div class="sub">先读一遍内容、看清摘要，再决定怎么写入。点「开始导入」前不会改动任何数据。</div>
    <div class="field mt12"><label for="imp-file">备份文件</label><input id="imp-file" type="file" accept=".json,application/json"/></div>
    <div class="field"><label for="imp-text">或粘贴内容</label><textarea id="imp-text" placeholder="把备份 JSON 粘到这里"></textarea></div>
    <div class="field" id="imp-pw-wrap" style="display:none"><label for="imp-pw">备份密码</label><input id="imp-pw" type="password" placeholder="加密备份需要密码"/></div>
    <div class="tiny" id="imp-state"></div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="imp-cancel">取消</button>
      <button class="btn" id="imp-read">读取备份</button></div>`, true);

  const state = ov.querySelector("#imp-state");
  ov.querySelector("#imp-cancel").onclick = ()=>ov.remove();
  ov.querySelector("#imp-file").onchange = e=>{
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 8*1024*1024){ state.textContent = "文件超过 8 MB，看起来不是备份文件"; return; }
    const rd = new FileReader();
    rd.onload = ()=>{ ov.querySelector("#imp-text").value = rd.result; state.textContent = `已读取「${f.name}」（${fmtSize(f.size)}）`; };
    rd.readAsText(f);
  };

  function step2(obj, an){
    const isPack = an.kind === "profiles";
    const items = isPack
      ? `${an.profiles} 个档案 · 岗位 ${an.counts.jobs} · 简历 ${an.counts.resumes} · 其他 ${an.counts.others} 条`
      : (BACKUP_MODULES.filter(m=>an.counts[m.key]).map(m=>`${m.label} ${an.counts[m.key]}`).join(" · ") || "没有可导入的内容");
    const modes = isPack ? [
      { k:"new", label:"还原为新档案", desc:"原有档案一行不动，导入的会作为新档案出现在列表里。" },
      { k:"overwrite", label:"用第一个档案覆盖当前", desc:"当前档案会被整份替换，导入前自动存快照。" },
    ] : [
      { k:"overwrite", label:"覆盖当前档案", desc:"按备份内容整份替换当前档案，导入前自动存快照。" },
      { k:"merge", label:"合并（只补缺的）", desc:"以本机为准，只补本机没有的条目，同 id 跳过。" },
      { k:"new", label:"导入为新档案", desc:"当前档案完全不动，导入的内容另存一份档案。" },
    ];
    let mode = modes[0].k;
    const appLabel = an.app === "qicheng" ? "启程备份" : (/jobseeker/i.test(an.app) ? "旧版备份" : String(an.app));
    ov.querySelector(".modal").setAttribute("aria-label", "确认导入");
    ov.querySelector(".modal").innerHTML = `
      <h3>确认导入</h3>
      <div class="sub">这一页只是预览；点「开始导入」才会真正写入。</div>
      <div class="cov-row">
        <span class="dot-pass" style="background:var(--accent)"></span>
        <div class="cv"><b>${esc(appLabel)}${an.profile ? " · " + esc(an.profile) : ""}</b>
          <div class="tiny">导出于 ${esc(String(an.at).replace("T"," ").slice(0,16) || "未记录")} · 格式 v${esc(String(an.v))} · ${fmtSize(an.bytes)}</div>
          <div class="tiny">${esc(items)}</div></div>
      </div>
      <div class="mt12"><div class="tiny">写入方式</div>
        <div class="chips mt8" id="imp-modes">${modes.map((m,i)=>
          `<button class="chip click ${i===0?"on":""}" type="button" data-mode="${m.k}">${esc(m.label)}</button>`).join("")}</div>
        <div class="tiny mt8" id="imp-modehint">${esc(modes[0].desc)}</div>
      </div>
      <div class="alert warn mt12" id="imp-warn">会整份替换当前档案；导入前自动存快照，导入后可撤销。</div>
      <div class="modal-actions"><div class="spacer"></div><button class="btn ghost" id="imp-back">取消</button>
        <button class="btn" id="imp-go">开始导入</button></div>`;
    const box = ov.querySelector(".modal");
    box.querySelectorAll("#imp-modes .chip").forEach(b=>b.onclick=()=>{
      mode = b.dataset.mode;
      box.querySelectorAll("#imp-modes .chip").forEach(x=>x.classList.toggle("on", x===b));
      const mm = modes.find(x=>x.k===mode) || modes[0];
      box.querySelector("#imp-modehint").textContent = mm.desc;
      const w = box.querySelector("#imp-warn");
      w.className = "alert mt12 " + (mode === "overwrite" ? "warn" : "info");
      w.textContent = mode === "overwrite"
        ? "会整份替换当前档案；导入前自动存快照，导入后可撤销。"
        : mode === "merge" ? "以本机为准，只补本机没有的条目；同 id 的条目会跳过。"
        : "当前档案完全不动，导入的内容会另存为一份新档案。";
    });
    box.querySelector("#imp-back").onclick = ()=>ov.remove();
    box.querySelector("#imp-go").onclick = ()=>{
      const btn = box.querySelector("#imp-go");
      btn.disabled = true; btn.textContent = "导入中…";
      try{
        if(isPack){
          const packs = (Array.isArray(obj.profiles) ? obj.profiles : []).filter(p=>p && p.data);
          if(!packs.length){ toast("这份包里没有可用的档案"); btn.disabled=false; btn.textContent="开始导入"; return; }
          if(mode === "new"){
            let first = null; const made = [];
            try{
              packs.forEach(p=>{
                const r = importAsNewProfile(p.data, p.name || ("导入 " + isoToday()));
                made.push(r.id); if(!first) first = r.id;
              });
            }catch(e){
              /* 中途写不进去就整批撤回，别留下半套档案 */
              made.forEach(id=>{ try{ localStorage.removeItem(STORE_BASE+"::"+id); }catch(_){} });
              saveProfiles(profiles().filter(p=>made.indexOf(p.id) < 0));
              toast("存储空间不足，导入已取消（原有档案未受影响）");
              btn.disabled = false; btn.textContent = "开始导入"; return;
            }
            setActivePid(first); location.reload(); return;
          }
          if(!snapshotSave()){ toast("本机存储空间不足，无法保存导入前快照，已取消导入"); btn.disabled = false; btn.textContent = "开始导入"; return; }
          const one = Object.assign({}, packs[0].data);
          if(!importPayload(one)){ toast("第一个档案内容不完整，换「还原为新档案」试试"); btn.disabled=false; btn.textContent="开始导入"; return; }
          ov.remove(); render();
          toast(`已用「${packs[0].name || "第一个档案"}」覆盖当前档案`, { action:"撤销导入", onAction:()=>snapshotBack() });
          return;
        }
        if(mode === "merge"){
          const r = mergeBackup(obj);
          if(r.snapFailed){ toast("本机存储空间不足，无法保存导入前快照，已取消导入"); btn.disabled=false; btn.textContent="开始导入"; return; }
          ov.remove(); render();
          toast(`合并完成：新增 ${r.added} 条，跳过 ${r.kept} 条重复`, { action:"撤销", onAction:()=>snapshotBack() });
          return;
        }
        if(mode === "new"){
          const r = importAsNewProfile(obj, an.profile || "");
          setActivePid(r.id); location.reload(); return;
        }
        if(!snapshotSave()){ toast("本机存储空间不足，无法保存导入前快照，已取消导入"); btn.disabled=false; btn.textContent="开始导入"; return; }
        if(!importPayload(obj)){ toast("备份内容不完整（缺少岗位列表）"); btn.disabled=false; btn.textContent="开始导入"; return; }
        ov.remove(); render();
        toast("导入完成，已覆盖当前档案", { action:"撤销导入", onAction:()=>snapshotBack() });
      }catch(e){
        toast("导入失败：" + e.message);
        btn.disabled = false; btn.textContent = "开始导入";
      }
    };
  }

  ov.querySelector("#imp-read").onclick = async ()=>{
    const raw = ov.querySelector("#imp-text").value.trim();
    if(!raw){ state.textContent = "先选一个备份文件，或把内容粘进来"; return; }
    let obj = parseJSON(raw);
    if(!obj){ state.textContent = "这不是有效的 JSON"; return; }
    if(obj.enc){
      ov.querySelector("#imp-pw-wrap").style.display = "";
      const pw = (ov.querySelector("#imp-pw").value || "").trim();
      if(!pw){ state.textContent = "这份备份已加密，请先输入密码"; ov.querySelector("#imp-pw").focus(); return; }
      state.textContent = "解密中…";
      try{ obj = await decryptBackup(obj, pw); }
      catch(e){ state.textContent = "密码不对，或文件已损坏"; return; }
    }
    const an = analyzeBackup(obj);
    if(!an){ state.textContent = "认不出这份文件：不是启程的备份"; return; }
    step2(obj, an);
  };
}

function showPrivacyIntro(force){
  const ov = openModal(`<h3>三件与隐私有关的事</h3>
    <div class="sub">这个工作台不用注册，也没有服务器：你的内容只留在这台设备的浏览器里。</div>
    <div class="priv-list">
      <div class="priv-row"><b>1 数据只在本机</b><span>岗位、简历、面试记录存在浏览器本地存储。换设备、换浏览器、清理缓存都会看不到，请在「设置 → 本机数据」导出备份。</span></div>
      <div class="priv-row"><b>2 分享的是应用</b><span>把链接发给朋友，对方看到的是各自的空白工作台，看不到你的内容；你也看不到对方的。</span></div>
      <div class="priv-row"><b>3 共用设备要分档案</b><span>同一台电脑 / 手机同一个浏览器共用一份数据；多人使用请在「设置 → 本机档案」各建一份。</span></div>
    </div>
    <div class="modal-actions"><div class="spacer"></div><button class="btn" id="pv-ok">我知道了</button></div>`);
  ov.querySelector("#pv-ok").onclick = ()=>{
    if(data.settings && !data.settings.privacyAck){ data.settings.privacyAck = true; store.save(); }
    ov.remove();
    maybeOnboarding();
  };
}
function maybePrivacyIntro(){ if(!(data.settings && data.settings.privacyAck)) showPrivacyIntro(false); }
/* 微信内置浏览器提示（不能强制跳浏览器，只能引导） */
function wechatTip(){
  if(!/MicroMessenger/i.test(navigator.userAgent)) return;
  if(sessionStorage.getItem("jsw-wx-tip")==="1") return;
  const el = document.createElement("div"); el.className = "wxtip";
  el.innerHTML = `<span>微信内置浏览器：点右上角 ··· → 「在浏览器打开」更稳；微信清理缓存会连这里的数据一起清掉。</span>
    <button id="wxtip-x">知道了</button>`;
  document.body.appendChild(el);
  el.querySelector("#wxtip-x").onclick = ()=>{ sessionStorage.setItem("jsw-wx-tip","1"); el.remove(); };
}

/* ---------- PWA：安装入口 + 离线状态 ---------- */
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredInstall = e;
  const b = $("#set-install"); if(b) b.disabled = false;
});
window.addEventListener("appinstalled", () => { deferredInstall = null; toast("已安装到桌面"); });
function pwaState(){
  const installed = !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  return { installed, sw };
}
function pwaInstall(){
  if(deferredInstall && deferredInstall.prompt){
    deferredInstall.prompt();
    deferredInstall.userChoice.then(()=>{ deferredInstall = null; }).catch(()=>{});
    return;
  }
  toast(pwaState().installed ? "已经是独立应用在运行" : "用浏览器菜单「安装应用 / 添加到主屏幕」");
}
/* ---------- 数据体检 ---------- */
const HEALTH_NAG_DAYS = 3;                 /* 同一条提醒最多每 3 天出现一次 */
const HEALTH_MIN_ITEMS = 3;                /* 数据太少不打扰新用户 */
const STORE_SIZE_REF = 5 * 1024 * 1024;    /* 浏览器 localStorage 常见上限 */

function healthBackupDays(){
  const at = (data.settings || {}).lastExportAt;
  if(!at) return null;
  const t = new Date(at).getTime();
  if(isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}
function healthDataCount(){
  /* 示例岗位 / 示例简历 / 内置种子条目都不算用户数据，避免新用户刚打开就被提醒 */
  const seedIds = new Set();
  (CONFIG.modules || []).forEach(m => (m.seed || []).forEach(x => seedIds.add(String(x.id))));
  const real = a => (a || []).filter(x => !x.demo && !seedIds.has(String(x.id))).length;
  return real(data.jobs) + real(data.resumes) + real(data.todo)
    + real(data.note) + real(data.sessions);
}
/* 体检结果只由本地数据算出：备份年龄 / 占用比例 / 回收站 / 资料完整度 */
function healthReport(){
  const rows = [];
  const days = healthBackupDays();
  const bytes = new Blob([JSON.stringify(data)]).size;
  const pct = Math.max(1, Math.round(bytes / STORE_SIZE_REF * 100));
  const trash = data.trash || [];
  const jobs = (data.jobs || []).filter(j => !j.demo);
  const res = (data.resumes || []).filter(r => !r.demo);

  if(days === null){
    rows.push({ level:"warn", title:"还没有导出过备份", act:"export", actText:"导出备份",
      desc:"数据只存在这台设备的浏览器里，清缓存或换设备都会丢，导出一份就能兜底。" });
  } else if(days > 30){
    rows.push({ level:"warn", title:`上次备份在 ${days} 天前`, act:"export", actText:"导出备份",
      desc:"建议每月导出一次；这期间的改动还没有任何离线副本。" });
  } else if(days >= 14){
    rows.push({ level:"info", title:`上次备份在 ${days} 天前`, act:"export", actText:"导出备份",
      desc:"离一个月还早，顺手再导出一份更安心。" });
  } else {
    rows.push({ level:"ok", title:`备份正常（${days} 天前）`, desc:"最近一个月内导出过备份，换设备时不会丢。" });
  }

  const kstate = keyState();
  if(kstate === "plain"){
    rows.push({ level:"warn", title:"API Key 仍是明文保存", act:"keysec", actText:"去加密",
      desc:"能打开本机浏览器存储的人可以直接读到 Key；设一个口令加密后，刷新页面就需要解锁。" });
  } else if(kstate === "locked" || kstate === "unlocked"){
    rows.push({ level:"ok", title:"API Key 已加密保存", desc:"密文存在本机，口令不落盘；刷新页面后自动锁定。" });
  }

  if(pct >= 80){
    rows.push({ level:"warn", title:`本机占用 ${fmtSize(bytes)}（约 ${pct}%）`,
      desc:"已经接近浏览器上限，新内容可能存不进去。导出备份后可清空回收站或删掉不再看的岗位。" });
  } else if(pct >= 60){
    rows.push({ level:"info", title:`本机占用 ${fmtSize(bytes)}（约 ${pct}%）`, desc:"还可以，注意别让回收站长期堆积。" });
  } else {
    rows.push({ level:"ok", title:`本机占用 ${fmtSize(bytes)}（约 ${pct}%）`, desc:"离浏览器给的上限还很远。" });
  }

  if(trash.length){
    const soon = trash.filter(t => trashDaysLeft(t) <= 3).length;
    rows.push({ level: soon ? "warn" : "info", act:"trash", actText:"查看回收站",
      title:`回收站 ${trash.length} 条${soon ? `，其中 ${soon} 条 3 天内清理` : ""}`,
      desc: soon ? "快到期的条目过期就找不回来了，需要的话先恢复。" : "过期会自动清理，不影响使用。" });
  } else {
    rows.push({ level:"ok", title:"回收站是空的", desc:"没有等着过期的删除内容。" });
  }

  const noJd = jobs.filter(j => !(j.jd || "").trim() && !(((j.parsed || {}).duties) || []).length).length;
  const noExp = res.filter(r => !(r.experience || []).length).length;
  if(noJd){
    rows.push({ level:"info", title:`${noJd} 个岗位还没有 JD 原文`, act:"jobs", actText:"去补全",
      desc:"没有 JD 时匹配分析只能靠标题猜，贴入岗位描述后再看匹配度更准。" });
  }
  if(noExp){
    rows.push({ level:"info", title:`${noExp} 份简历还没填工作经历`, act:"resumes", actText:"去补全",
      desc:"工作经历是匹配与模拟面试的主要依据，空着会明显拉低匹配分。" });
  }
  if(!noJd && !noExp && jobs.length && res.length){
    rows.push({ level:"ok", title:"岗位与简历资料齐全", desc:"JD 和工作经历都能参与匹配分析。" });
  }

  const warn = rows.filter(r => r.level === "warn").length;
  const info = rows.filter(r => r.level === "info").length;
  return { rows, warn, info, bytes, pct, days,
    status: warn ? "需要处理" : (info ? "基本正常" : "状态良好"),
    tone: warn ? "warn" : (info ? "" : "ok") };
}
/* 启动时提醒：只提醒真正的用户数据，且 3 天内不重复 */
function maybeHealthTip(){
  if(document.querySelector(".overlay")) return;
  if(healthDataCount() < HEALTH_MIN_ITEMS) return;
  const days = healthBackupDays();
  if(days !== null && days <= 30) return;
  const s = data.settings = data.settings || {};
  const last = s.healthTipAt ? new Date(s.healthTipAt).getTime() : 0;
  if(last && Date.now() - last < HEALTH_NAG_DAYS * 86400000) return;
  setTimeout(()=>{
    if(document.querySelector(".overlay")) return;   /* 正在看别的弹层，就下次再说 */
    s.healthTipAt = nowISO(); store.save();
    toast(days === null ? "还没有导出过备份，换设备或清缓存会丢数据" : `距上次备份已 ${days} 天，建议导出一份`,
      { action:"去备份", onAction:()=>go("settings") });
  }, 1500);
}

function renderSettings(){
  const s = data.settings;
  const pwa = pwaState();
  const pf = activeProfile();
  const appUrl = location.href.split("?")[0].split("#")[0];
  const sizeBytes = new Blob([JSON.stringify(data)]).size;
  const lastBackup = s.lastExportAt ? String(s.lastExportAt).slice(0,10) : "从未备份";
  const hr = healthReport();
  const snap = snapshotGet();
  const ks = keyState();
  const keyBadge = ks==="plain" ? "warn" : (ks==="unlocked" ? "ok" : "");
  const keyDesc = {
    none:"填入 Key 后可设口令加密；不加密就只保存在本机存储里。",
    plain:"明文保存在本机存储里，能打开本机浏览器存储的人可以直接看到。建议设口令加密。",
    locked:"密文已保存。刷新页面后需输入口令解锁，才能调用 AI 接口。",
    unlocked:"本次页面会话内已解锁；刷新或关闭标签页后自动锁定。",
  }[ks];
  const keyInputValue = ks==="locked" ? "" : (ks==="unlocked" ? vaultSession.apiKey : (s.apiKey||""));
  const keyPlaceholder = ks==="locked" ? "已加密保存 · 解锁后可修改" : "sk-...";
  const profRows = profiles().map(p=>{
    const isCur = p.id===activePid();
    let n = 0;
    if(isCur) n = (data.jobs||[]).length + (data.resumes||[]).length;
    else { try{ const o=JSON.parse(localStorage.getItem(STORE_BASE+"::"+p.id)||"null"); n=o?((o.jobs||[]).length+(o.resumes||[]).length):0; }catch(e){} }
    return `<div class="cov-row"><span class="dot-pass" style="background:${isCur?"var(--accent)":"var(--border-input)"}"></span>
      <div class="cv"><b>${esc(p.name)}</b><div class="tiny">${isCur?"当前档案":"其他档案"} · ${n} 条记录</div></div>
      ${isCur?`<span class="tiny">使用中</span>`:`<button class="btn ghost sm js-pf-sw" data-id="${attr(p.id)}">切换</button>`}</div>`;
  }).join("");
  const promptRows = Object.keys(PROMPTS).map(k=>{
    const p = PROMPTS[k];
    return `<div class="cov-row"><span class="dot-pass" style="background:var(--accent)"></span>
      <div class="cv"><b>${esc(p.name)}</b><div class="tiny">${esc(p.desc)}</div></div>
      <button class="btn ghost sm js-prompt" data-key="${k}">生成提示词</button></div>`;
  }).join("");

  $("#screen").innerHTML = headHTML("设置","外观、引擎、提示词工坊与数据管理")
    + `<div class="split">
        <div class="panel-lg">
          <h3>${icon("spark",16)} 分析引擎</h3>
          <div class="ph-sub">本地规则完全离线；API 模式能生成更细的改写与追问</div>
          <div class="chips mt12">
            <span class="chip click ${s.engine==="local"?"on":""}" data-engine="local">本地规则（离线）</span>
            <span class="chip click ${s.engine==="api"?"on":""}" data-engine="api">API 直连（需 Key）</span>
          </div>
          <div class="alert info mt12">${icon("alert",14)} 不填 Key 也能跑完整个流程：匹配、改写、面试、反问都有本地算法兜底，只是追问不会那么灵活。</div>
        </div>
        <div class="panel-lg" id="set-keysec">
          <h3>${icon("settings",16)} API 配置</h3>
          <div class="ph-sub">兼容 OpenAI 协议的任意服务（官方 / 中转 / 通义 / DeepSeek）</div>
          <div class="field mt12"><label for="set-base">接口地址</label><input id="set-base" value="${attr(s.baseUrl)}" placeholder="https://api.openai.com/v1"/></div>
          <div class="field-row mt12">
            <div class="field"><label for="set-model">模型</label><input id="set-model" value="${attr(s.model)}" placeholder="gpt-4o-mini"/></div>
            <div class="field"><label for="set-key">API Key</label><input id="set-key" type="password" value="${attr(keyInputValue)}" placeholder="${attr(keyPlaceholder)}" autocomplete="off"${ks==="locked"?" disabled":""}/></div>
          </div>
          <div class="flex mt12"><button class="btn sm" id="set-save">保存</button>
            <button class="btn line sm" id="set-test">测试连接</button>
            <span class="tiny" id="set-state" aria-live="polite"></span></div>
          <div class="help">Key 只存在你本机浏览器的存储里，不会上传到任何服务器。公共电脑上用完建议清空。</div>

          <div class="keysec">
            <div class="keysec-head">
              <span class="badge ${keyBadge}">${esc(keyStateText())}</span>
              <span class="tiny">${esc(keyDesc)}</span>
            </div>
            ${ks==="locked" ? `
            <div class="keysec-row">
              <div class="field"><label for="kv-pw">口令</label><input id="kv-pw" type="password" placeholder="输入加密口令" autocomplete="current-password"/></div>
              <button class="btn sm" id="kv-main">解锁</button>
            </div>` : `
            <div class="keysec-row">
              <div class="field"><label for="kv-pw">${ks==="unlocked"?"新口令":"设置口令"}</label><input id="kv-pw" type="password" placeholder="至少 6 位" autocomplete="new-password"/></div>
              <div class="field"><label for="kv-pw2">确认口令</label><input id="kv-pw2" type="password" placeholder="再输一次" autocomplete="new-password"/></div>
              <button class="btn sm" id="kv-main">${ks==="unlocked"?"更换口令":"加密保存"}</button>
            </div>`}
            <div class="flex mt8 wrap">
              ${ks==="unlocked"?`<button class="btn ghost sm" id="kv-lock">立即锁定</button>`:""}
              ${ks!=="none"?`<button class="btn ghost sm" id="kv-remove">移除密钥</button>`:""}
              <span class="tiny" id="kv-state" aria-live="polite"></span>
            </div>
            <div class="help mt8">加密用 PBKDF2（15 万次）派生密钥、AES-256-GCM 加密；口令不落盘。忘记口令只能移除后重填，岗位与简历数据不受影响。</div>
          </div>
        </div>
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("spark",16)} 提示词工坊</h3>
        <div class="ph-sub">7 类提示词都自动带入当前岗位与简历，可复制到任意 AI 聊天工具使用</div>
        ${promptRows}
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("help",16)} 分享与隐私</h3>
        <div class="ph-sub">分享出去的是这个应用本身，不是你的数据；每个人打开都是各自的空白工作台。</div>
        <div class="priv-list">
          <div class="priv-row"><b>好友看到什么</b><span>一个空工作台。岗位、简历、面试记录都只存在各自设备的浏览器里，不会上传，也不会互相可见。</span></div>
          <div class="priv-row"><b>会共享什么</b><span>只有这个页面（含内置的示例岗位与示例简历）。你的填写内容不会被一起带走。</span></div>
          <div class="priv-row"><b>微信里打开</b><span>点右上角 ··· → 「在浏览器打开」更稳；微信清理缓存会把内置浏览器的本地数据一起清掉。</span></div>
          <div class="priv-row"><b>同一台设备</b><span>同一个浏览器共用一份数据。多人共用时，在下面「本机档案」各建一份，或用不同的浏览器 / 无痕窗口。</span></div>
          <div class="priv-row"><b>备份文件</b><span>备份含手机号、邮箱、简历原文。发给别人前用「加密备份」设密码，明文备份只留给自己。</span></div>
          <div class="priv-row"><b>网络请求</b><span>除你填的 AI 接口外，只有岗位雷达向 jsDelivr 拉取公开岗位数据；没有统计、广告或第三方脚本。</span></div>
        </div>
        <div class="flex mt12 wrap">
          <button class="btn line sm" id="set-copyurl">复制应用链接</button>
          <button class="btn ghost sm" id="set-privacy">再看隐私说明</button>
        </div>
        <div class="pw-hint">链接：<span class="mono">${esc(appUrl)}</span></div>
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("check",16)} 数据体检 <span class="badge ${hr.tone}">${esc(hr.status)}</span></h3>
        <div class="ph-sub">备份、占用、回收站与资料完整度一起检查；有问题的会给一条能直接点的建议</div>
        <div class="mt12">${hr.rows.map(r=>`
          <div class="cov-row">
            <span class="dot-pass" style="background:${r.level==="warn"?"var(--warning)":r.level==="info"?"var(--text-tertiary)":"var(--success)"}"></span>
            <div class="cv"><b>${esc(r.title)}</b><div class="tiny">${esc(r.desc)}</div></div>
            ${r.act?`<button class="btn ghost sm js-health" data-act="${attr(r.act)}">${esc(r.actText||"处理")}</button>`:""}
          </div>`).join("")}</div>
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("download",16)} 导入与导出</h3>
        <div class="ph-sub">当前档案「${esc(pf.name)}」 · 占用 ${fmtSize(sizeBytes)} · 上次备份 ${esc(lastBackup)}${s.lastExportNote?`（${esc(s.lastExportNote)}）`:""}</div>
        <div class="flex mt12 wrap">
          <button class="btn sm" id="set-export">导出备份…</button>
          <button class="btn line sm" id="set-import">导入备份…</button>
          <button class="btn line sm" id="set-reset">清空当前档案</button>
        </div>
        <div class="cov-row mt12">
          <span class="dot-pass" style="background:${snap?"var(--accent)":"var(--border-input)"}"></span>
          <div class="cv"><b>导入前快照</b><div class="tiny">${snap
            ? `${esc(String(snap.at||"").replace("T"," ").slice(0,16))} 的完整内容，只保留最近一份`
            : "还没有快照；覆盖或合并导入时会自动生成"}</div></div>
          ${snap?`<button class="btn ghost sm" id="set-snapback">恢复这份</button>`:""}
        </div>
        <div class="alert warn mt12">备份不含 API Key。换设备、换浏览器或清理缓存都会丢数据，建议每月导出一次；给别人前用加密备份。</div>
      </div>

      <div class="panel-lg mt18" id="set-trash-panel">
        <h3>${icon("trash",16)} 回收站${(data.trash||[]).length?` <span class="badge">${(data.trash||[]).length}</span>`:""}</h3>
        <div class="ph-sub">删除的岗位、简历与记录先放这里，保留 30 天，随时可恢复；过期自动清理。</div>
        ${(data.trash||[]).length ? (data.trash||[]).map(t=>`
          <div class="trash-row">
            <span class="badge">${esc(trashLabel(t))}</span>
            <span class="grow" style="min-width:0"><b class="rt">${esc(trashName(t))}</b>
              <span class="tiny">删除于 ${esc(String(t.at||"").slice(0,10))} · ${trashDaysLeft(t)} 天后自动清理</span></span>
            <span class="trash-acts">
              <button class="btn line sm js-trash-restore" data-id="${attr(t.id)}">恢复</button>
              <button class="link-danger js-trash-purge" data-id="${attr(t.id)}">彻底删除</button>
            </span>
          </div>`).join("") : `<div class="empty-inline">回收站是空的；删除内容后可在这里找回。</div>`}
        ${(data.trash||[]).length?`<div class="flex mt12"><button class="btn ghost sm" id="set-trash-clear">清空回收站</button></div>`:""}
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("download",16)} 安装与离线</h3>
        <div class="ph-sub">装到桌面后像 App 一样全屏打开；断网时仍可查看已加载的页面</div>
        <div class="cov-row">
          <span class="dot-pass" style="background:${pwa.installed?"var(--accent)":"var(--border-input)"}"></span>
          <div class="cv"><b>${pwa.installed?"已作为独立应用运行":"当前在浏览器标签页中运行"}</b>
            <div class="tiny">${pwa.sw?"离线缓存已就绪":"离线缓存未启用（需用 http/https 打开）"}</div></div>
          <button class="btn line sm" id="set-install">安装到桌面</button>
        </div>
        <div class="help">iOS Safari：分享 → 添加到主屏幕；Android Chrome：菜单 → 安装应用；电脑 Chrome / Edge：地址栏右侧的安装图标。</div>
      </div>

      <div class="panel-lg mt18">
        <h3>${icon("file",16)} 本机档案</h3>
        <div class="ph-sub">同一台设备上给不同的人各建一份，数据互不可见；切换后页面会重新加载</div>
        ${profRows}
        <div class="flex mt12 wrap">
          <button class="btn line sm" id="set-pf-new">新建档案</button>
          <button class="btn ghost sm" id="set-pf-rename">重命名当前档案</button>
        </div>
      </div>`;
  wireSettings();
}
function wireSettings(){
  $("#screen").querySelectorAll("[data-engine]").forEach(el=>el.onclick=()=>{
    data.settings.engine = el.dataset.engine; store.save(); render();
  });
  const save = $("#set-save");
  if(save) save.onclick = async ()=>{
    const ks = keyState();
    if(ks === "locked"){ toast("密钥已锁定，先在下方解锁"); return; }
    data.settings.baseUrl = $("#set-base").value.trim();
    data.settings.model = $("#set-model").value.trim();
    const typed = $("#set-key").value.trim();
    if(ks === "unlocked"){
      if(typed && typed !== vaultSession.apiKey){
        try{ await reencryptApiKey(typed); }
        catch(e){ toast("保存失败：" + e.message); return; }
      }
    } else {
      data.settings.apiKey = typed;
      if(typed) data.settings.engine = "api";
    }
    store.save(); toast("已保存"); render();
  };
  const test = $("#set-test");
  if(test) test.onclick = async ()=>{
    const st = $("#set-state");
    if(keyState() === "locked"){ st.textContent = "密钥已锁定，先在下方解锁"; return; }
    const base = $("#set-base").value.trim(), model = $("#set-model").value.trim();
    const key = $("#set-key").value.trim() || getApiKey();
    if(!key){ st.textContent = "先填 Key"; return; }
    const unlocked = keyState() === "unlocked";
    data.settings.baseUrl = base; data.settings.model = model;
    if(!unlocked) data.settings.apiKey = key;
    store.save();
    st.textContent = "测试中…";
    try{
      /* 解锁态输入了新 Key 时，按输入的 Key 测试，而不是内存里的旧 Key */
      const r = await aiChat([{role:"user",content:"只回复两个字：可用"}], unlocked ? { apiKey:key } : null);
      st.textContent = "连接正常 · " + r.slice(0,20);
    }catch(e){ st.textContent = "失败：" + e.message; }
  };
  /* 密钥保险箱：加密 / 解锁 / 更换口令 / 立即锁定 / 移除 */
  const kvMain = $("#kv-main");
  if(kvMain) kvMain.onclick = async ()=>{
    const st = $("#kv-state");
    const pw = (($("#kv-pw")||{}).value || "").trim();
    const pw2 = (($("#kv-pw2")||{}).value || "").trim();
    const ks = keyState();
    if(!pw || pw.length < 6){ st.textContent = "口令至少 6 位"; return; }
    if(ks === "locked"){
      st.textContent = "解锁中…";
      try{
        await unlockKeyVault(pw);
        render();
        const s2 = $("#set-state"); if(s2) s2.textContent = "已解锁，可测试连接";
        toast("已解锁");
      }catch(e){ st.textContent = "口令不正确或密钥数据损坏"; }
      return;
    }
    if(pw !== pw2){ st.textContent = "两次口令不一致"; return; }
    const keyInput = $("#set-key");
    let apiKey = keyInput ? keyInput.value.trim() : "";
    if(!apiKey) apiKey = getApiKey();
    if(!apiKey){ st.textContent = "先在上方填入 API Key"; if(keyInput) keyInput.focus(); return; }
    st.textContent = "加密中…";
    try{
      await setApiKeyEncrypted(apiKey, pw);
      toast(ks === "unlocked" ? "口令已更新" : "已加密保存");
      render();
    }catch(e){ st.textContent = "加密失败：" + e.message; }
  };
  const kvLock = $("#kv-lock");
  if(kvLock) kvLock.onclick = ()=>{
    lockKeyVault(); render(); toast("已锁定，需要口令才能再调用接口");
  };
  const kvRemove = $("#kv-remove");
  if(kvRemove) kvRemove.onclick = ()=>{
    if(!confirm("移除本机保存的 API Key？接口调用会立即停用，岗位与简历数据不受影响。")) return;
    removeKeyVault(); render(); toast("已移除 API Key");
  };
  $("#screen").querySelectorAll(".js-prompt").forEach(b=>b.onclick=()=>openPromptStudio(b.dataset.key));
  const inst = $("#set-install");
  if(inst) inst.onclick = pwaInstall;
  const url = location.href.split("?")[0].split("#")[0];
  const cp = $("#set-copyurl");
  if(cp) cp.onclick = ()=>copyText(url);
  const pv = $("#set-privacy");
  if(pv) pv.onclick = ()=>showPrivacyIntro(true);

  /* 回收站：恢复 / 彻底删除 / 清空 */
  $("#screen").querySelectorAll(".js-trash-restore").forEach(b=>b.onclick=()=>{
    const r=trashRestore(b.dataset.id);
    if(r==="dup") toast("已恢复（原条目已存在）");
    else if(r===true) toast("已恢复");
    else toast("这条已不在回收站");
    render();
  });
  $("#screen").querySelectorAll(".js-trash-purge").forEach(b=>b.onclick=()=>{
    trashPurge(b.dataset.id); render(); toast("已彻底删除，无法恢复");
  });
  const tclr = $("#set-trash-clear");
  if(tclr) tclr.onclick = ()=>{
    if(!(data.trash||[]).length) return;
    if(!confirm(`彻底删除回收站里的 ${(data.trash||[]).length} 条内容？此操作不可恢复。`)) return;
    data.trash=[]; store.save(); render(); toast("回收站已清空");
  };

  /* 体检条目上的动作：直接跳到对应的处理入口，不用自己找 */
  $("#screen").querySelectorAll(".js-health").forEach(b=>b.onclick=()=>{
    const a = b.dataset.act;
    if(a === "export"){ const x = $("#set-export"); if(x) x.click(); return; }
    if(a === "keysec"){
      const t = $("#set-keysec");
      if(t){ t.scrollIntoView({ behavior:"smooth", block:"center" });
        const f = t.querySelector("#kv-pw");
        if(f) setTimeout(()=>{ try{ f.focus({preventScroll:true}); }catch(e){} }, 260);
      }
      return;
    }
    if(a === "trash"){
      const t = $("#set-trash-panel");
      if(t){ t.scrollIntoView({ behavior:"smooth", block:"center" });
        const f = t.querySelector(".js-trash-restore, #set-trash-clear");
        if(f) setTimeout(()=>{ try{ f.focus({preventScroll:true}); }catch(e){} }, 260);
      }
      return;
    }
    if(a === "jobs" || a === "resumes") go(a);
  });

  const ex = $("#set-export");
  if(ex) ex.onclick = ()=>openExportDialog();

  const im = $("#set-import");
  if(im) im.onclick = ()=>openImportDialog();

  const sb = $("#set-snapback");
  if(sb) sb.onclick = ()=>{
    if(!confirm("用快照覆盖当前档案？当前内容会被替换成上一次导入前的样子。")) return;
    snapshotBack();
  };

  const rs = $("#set-reset");
  rs.onclick = ()=>{
    if(!confirm("清空当前档案？岗位、简历、面试记录都会删除，其他档案不受影响，且无法恢复。")) return;
    localStorage.removeItem(storeKey());
    location.reload();
  };

  $("#screen").querySelectorAll(".js-pf-sw").forEach(b=>b.onclick=()=>{
    if(b.dataset.id===activePid()) return;
    setActivePid(b.dataset.id); location.reload();
  });
  const pn = $("#set-pf-new");
  if(pn) pn.onclick = async ()=>{
    const name = await askInput("新建本机档案", "给这份档案起个名字（比如「小李」）。档案之间数据完全隔离，切换后页面会重新加载。", {label:"档案名", type:"text", placeholder:"最多 20 字"});
    if(!name) return;
    const list = profiles();
    const id = "p" + Date.now().toString(36);
    list.push({ id, name:name.slice(0,20) });
    saveProfiles(list); setActivePid(id); location.reload();
  };
  const pr = $("#set-pf-rename");
  if(pr) pr.onclick = async ()=>{
    const name = await askInput("重命名当前档案", "只改名称，不影响档案里的数据。", {label:"新名称", type:"text", placeholder:"最多 20 字", okText:"保存"});
    if(!name) return;
    const list = profiles().map(p=>p.id===activePid()?{...p,name:name.slice(0,20)}:p);
    saveProfiles(list); render();
  };
}
