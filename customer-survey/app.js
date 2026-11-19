/* Customer Survey v2.6 (19/11/2026) — đổi tên từ "MMH Survey", chuyển sang kho riêng MMH-Survey (/MMH-Survey/customer-survey/); link cũ /mmh-library/survey/ tự chuyển sang đây.
   v2.4 (18/11/2026) — v2.4: trang khảo sát bỏ biểu đồ theo giờ, thay bằng "Ai đã trả lời" (cơ sở + chuyên khoa / kinh nghiệm…) và khoảng thời gian thu thập.
   v2.3: giao diện gọn (bảng khảo sát + cây nhóm sản phẩm bên trái, khối số liệu một dải), khung xương khi tải,
   lưu sẵn danh sách + kết quả trên máy (mở lại hiện ngay, cập nhật ngầm); máy chủ lưu sẵn số liệu nên danh sách tải nhanh.
   v2.2 (18/11/2026) — v2.2: một nguồn "Product Survey" trên Drive; trang chủ lọc theo nhóm sản phẩm (Surgical / Dental) ▸ sản phẩm,
   đổi nhóm / sản phẩm của khảo sát (máy chủ chuyển file trong folder), khảo sát chỉ có Sheet (không có Google Form) cũng xem được.
   v2.0 (13/11/2026) — kết quả mọi khảo sát Google Form của MMH, cài được như ứng dụng.
   Tổng quan (tổng câu trả lời, hôm nay, biểu đồ 14 ngày, hoạt động gần đây) ⇒ từng khảo sát: điểm nổi bật, biểu đồ câu trả lời theo giờ / ngày,
   thống kê từng câu (số người, %), lọc nhiều điều kiện, từng câu trả lời, chia sẻ tóm tắt, tải CSV. Thêm khảo sát bằng link.
   Câu trả lời mới: chấm vàng + số trên chuông (so với lần xem trước trên máy), tự làm mới 60 giây / lần khi app đang mở,
   thông báo đẩy về điện thoại khi bấm "Theo dõi" + bật thông báo (máy chủ quét 20 phút / lần, 7h–21h, T2–T7), mục "Nhắc tôi" của Report Hub / CRM.
   Máy chủ: survey (mmh-backend ▸ backends/survey/MMH_SurveyResults.gs). Đăng nhập: Training Hub, dùng chung phiên mmh_tk. */
(function(){
"use strict";
var API = window.KS_API || "";
var TRAINING_HUB = "https://script.google.com/macros/s/AKfycbwsX4cQEoH4LNlmcNfe8qWIM9K6EiDEXy7PjhP9bHY2citL6xHn5L1unsAlQJHyL9EP/exec";
/* khoá công khai Web Push (khoá riêng nằm ở mmh-backend ▸ tools/push/vapid.json) */
var VAPID = "BI6HyiX5a_bjysyRhpTXX02o0AWqCxtMVGcr3LKhxJUvRStnbGEM_-PYlSwUYMpcnlr8xWxh_MbhZcZ6_5Btnlw";
var LS_TK = "mmh_tk", LS_MAIL = "mmh_last_email", LS_SEEN = "mmhsv_seen_v1", LS_UI = "mmhsv_ui_v1", LS_LIST = "mmhsv_list_v1", LS_DIDX = "mmhsv_didx_v1";
var POLL_MS = 60 * 1000;

/* ═════════ tiện ích ═════════ */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function n0(x){ return String(Math.round(+x||0)).replace(/\B(?=(\d{3})+(?!\d))/g,"."); }
function pc(a,b){ if(!b) return 0; return a*100/b; }
function pct(a,b){ var p=pc(a,b); return (p>=10||p===0?Math.round(p):Math.round(p*10)/10).toString().replace(".",",")+"%"; }
function nk(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/\s+/g," ").trim(); }
function p2(n){ return String(n).padStart(2,"0"); }
function dt(v){ if(!v) return ""; var d=new Date(v); if(isNaN(d)) return String(v); return p2(d.getDate())+"/"+p2(d.getMonth()+1)+" "+p2(d.getHours())+":"+p2(d.getMinutes()); }
function dd(v){ var d=new Date(v); return p2(d.getDate())+"/"+p2(d.getMonth()+1); }
function ago(v){ if(!v) return ""; var d=new Date(v); if(isNaN(d)) return ""; var m=Math.round((Date.now()-d)/60000);
  if(m<1) return "vừa xong"; if(m<60) return m+" phút trước"; var h=Math.round(m/60); if(h<24) return h+" giờ trước"; var x=Math.round(h/24); return x+" ngày trước"; }
function qs(o){ return Object.keys(o).map(function(k){ return encodeURIComponent(k)+"="+encodeURIComponent(o[k]==null?"":o[k]); }).join("&"); }
function toast(t,ms){ var e=$("toast"); e.textContent=t; e.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(function(){ e.hidden=true; }, ms||3600); }
function ls(k,v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||"null"); localStorage.setItem(k, JSON.stringify(v)); }catch(_){ return null; } }
function short(q){ return String(q||"").replace(/^\s*Câu\s+\d+\s*[.:]\s*/i,"").replace(/\s*\((có thể chọn nhiều|chọn tối đa \d+|không bắt buộc)\)\s*/gi," ").trim(); }
function qno(q){ var m=/^\s*Câu\s+(\d+)/i.exec(q.q)||/^\s*Câu\s+(\d+)/i.exec(q.grp||""); return m?m[1]:""; }
function initials(n){ return String(n||"?").split(/\s+/).map(function(w){ return w[0]||""; }).join("").slice(-2).toUpperCase(); }
var I={
  bell:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>',
  bellF:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" fill="none"/></svg>',
  plus:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  ref:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
  dl:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>',
  share:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>',
  dots:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  filter:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>',
  back:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
};

/* ═════════ mạng ═════════ */
function jsonp(url, ms){
  return new Promise(function(res, rej){
    var cb="__sv"+Math.random().toString(36).slice(2), s=document.createElement("script"), done=false;
    var to=setTimeout(function(){ fin(); rej(new Error("hết giờ")); }, ms||60000);
    function fin(){ done=true; clearTimeout(to); try{ delete window[cb]; }catch(_){ window[cb]=undefined; } s.remove(); }
    window[cb]=function(d){ if(done) return; fin(); res(d); };
    s.onerror=function(){ if(done) return; fin(); rej(new Error("không tải được")); };
    s.src=url+(url.indexOf("?")<0?"?":"&")+"callback="+cb; document.head.appendChild(s);
  });
}
/* fetch KHÔNG kèm cookie Google trước (máy đăng nhập nhiều tài khoản Google thì thẻ <script> bị chuyển sang trang chọn tài khoản), lỗi ⇒ JSONP */
function getJSON(url, ms){
  var ctl=window.AbortController?new AbortController():null, to=setTimeout(function(){ if(ctl) ctl.abort(); }, ms||60000);
  return fetch(url,{redirect:"follow", credentials:"omit", signal:ctl?ctl.signal:undefined}).then(function(r){ clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
    .catch(function(){ clearTimeout(to); return jsonp(url, ms); });
}
function api(action, p){ return getJSON(API+"?"+qs(Object.assign({action:action, tk:tk()}, p||{})), 90000).then(function(d){
  if(d && d.code==="AUTH"){ authFail(d.error); throw new Error(d.error||"Cần đăng nhập"); }
  return d; }); }
function hub(action, p){ return getJSON(TRAINING_HUB+"?"+qs(Object.assign({action:action}, p||{})), 30000); }
function hubPost(action, p){
  var ctl=window.AbortController?new AbortController():null, to=setTimeout(function(){ if(ctl) ctl.abort(); }, 30000);
  return fetch(TRAINING_HUB,{ method:"POST", body:new URLSearchParams(Object.assign({action:action}, p||{})), redirect:"follow", credentials:"omit", signal:ctl?ctl.signal:undefined })
    .then(function(r){ clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }, function(e){ clearTimeout(to); throw e; });
}

/* ═════════ đăng nhập (email + mật khẩu hoặc mã 6 số — dùng chung phiên với Report Hub / CRM / Tender Map) ═════════ */
var lg={step:"pw", email:"", busy:false, err:""};
function auth(){ var o=ls(LS_TK); if(!o||!o.tk||!o.user||!o.user.pic) return null; if(o.exp && Date.now()>o.exp) return null; return o; }
function tk(){ var a=auth(); return a?a.tk:""; }
function cleanEmail(v){ var e=String(v||"").trim().toLowerCase().replace(/\s+/g,""); if(e && e.indexOf("@")<0) e+="@manimedicalhanoi.com"; return e; }
function okEmail(e){ return /^[a-z0-9._%+\-]+@(mani\.inc|manimedicalhanoi\.com)$/.test(e); }
function authFail(msg){
  if(/hết hạn|không hợp lệ|đăng xuất|bị khoá|RH_Users|danh sách người dùng/i.test(String(msg||""))){ try{ localStorage.removeItem(LS_TK); }catch(_){} }
  lg.err=msg||""; if(!auth()) gate();
}
function gate(){
  stopPoll(); $("bell").hidden=true; $("uc").hidden=true; $("fab").hidden=true; $("pop").hidden=true;
  var em=lg.email; if(!em){ try{ em=localStorage.getItem(LS_MAIL)||""; }catch(_){} }
  var h='<div class="gate"><div class="gcard"><img src="icons/icon-192.png" alt=""><h1>Customer Survey</h1><p>Kết quả khảo sát của MMH. Đăng nhập bằng email công ty.</p>';
  if(lg.step==="pw"){
    h+='<form id="lg-f" autocomplete="on" onsubmit="return false"><label for="lg-email">Email công ty</label><input class="inp" id="lg-email" name="username" type="email" autocomplete="username" placeholder="ten@manimedicalhanoi.com" value="'+esc(em)+'">'+
       '<label for="lg-pw">Mật khẩu</label><input class="inp" id="lg-pw" name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu MMH">'+
       '<div class="act"><button class="btn gd" id="lg-go" type="submit"'+(lg.busy?" disabled":"")+'>'+(lg.busy?"Đang đăng nhập…":"Đăng nhập")+'</button><button class="btn" id="lg-code" type="button">Nhận mã qua email</button></div></form>';
  } else {
    h+='<p>Mã 6 số đã gửi tới <b style="color:#fff">'+esc(lg.email)+'</b>.</p><label for="lg-c">Mã đăng nhập</label><input class="inp" id="lg-c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 số">'+
       '<div class="act"><button class="btn gd" id="lg-go" type="button"'+(lg.busy?" disabled":"")+'>'+(lg.busy?"Đang kiểm tra…":"Đăng nhập")+'</button><button class="btn" id="lg-back" type="button">Quay lại</button></div>';
  }
  h+='<div class="lgerr">'+esc(lg.err)+'</div></div></div>';
  $("main").innerHTML=h;
  if(lg.step==="pw"){
    $("lg-go").onclick=lgPw; $("lg-code").onclick=lgSend; $("lg-pw").onkeydown=function(e){ if(e.key==="Enter") lgPw(); };
    setTimeout(function(){ try{ ($("lg-email").value?$("lg-pw"):$("lg-email")).focus(); }catch(_){} }, 30);
  } else {
    $("lg-go").onclick=lgVerify; $("lg-back").onclick=function(){ lg.step="pw"; lg.err=""; gate(); };
    $("lg-c").onkeydown=function(e){ if(e.key==="Enter") lgVerify(); };
    setTimeout(function(){ try{ $("lg-c").focus(); }catch(_){} }, 30);
  }
}
function done(d){ ls(LS_TK, {tk:d.token, exp:d.exp, user:d.user, at:Date.now()}); try{ localStorage.setItem(LS_MAIL, lg.email); }catch(_){} lg={step:"pw", email:lg.email, busy:false, err:""}; start(); }
function lgPw(){
  if(lg.busy) return;
  lg.email=cleanEmail($("lg-email").value); var pw=String($("lg-pw").value||"");
  if(!okEmail(lg.email)){ lg.err="Nhập email công ty: …@manimedicalhanoi.com hoặc …@mani.inc"; gate(); return; }
  if(!pw){ lg.err="Nhập mật khẩu, hoặc bấm \"Nhận mã qua email\"."; gate(); return; }
  lg.busy=true; lg.err=""; gate();
  hubPost("rhAuthPw",{email:lg.email, pw:pw}).then(function(d){ lg.busy=false; if(d && d.ok && d.token && d.user){ done(d); return; } lg.err=(d&&d.error)||"Chưa đăng nhập được."; gate(); },
    function(e){ lg.busy=false; lg.err="Không kết nối được máy chủ đăng nhập ("+e.message+")."; gate(); });
}
function lgSend(){
  if(lg.busy) return;
  var i=$("lg-email"); if(i) lg.email=cleanEmail(i.value);
  if(!okEmail(lg.email)){ lg.err="Nhập email công ty rồi bấm Nhận mã."; gate(); return; }
  lg.busy=true; lg.err=""; gate();
  hub("rhAuthStart",{email:lg.email}).then(function(d){ lg.busy=false; if(d && (d.ok || d.code==="WAIT")){ lg.step="code"; lg.err=d.ok?"":(d.error||""); } else lg.err=(d&&d.error)||"Chưa gửi được mã."; gate(); },
    function(e){ lg.busy=false; lg.err="Không kết nối được máy chủ đăng nhập ("+e.message+")."; gate(); });
}
function lgVerify(){
  if(lg.busy) return;
  var code=String(($("lg-c")||{}).value||"").replace(/\D/g,"");
  if(code.length!==6){ lg.err="Nhập đủ 6 số trong email."; gate(); return; }
  lg.busy=true; lg.err=""; gate();
  hub("rhAuthVerify",{email:lg.email, code:code}).then(function(d){ lg.busy=false; if(d && d.ok && d.token && d.user){ done(d); return; } lg.err=(d&&d.error)||"Mã chưa đúng."; gate(); },
    function(e){ lg.busy=false; lg.err=e.message; gate(); });
}

/* ═════════ lớp nổi ═════════ */
function sheet(h){ var s=$("shade"); s.innerHTML='<div class="sheet" role="dialog" aria-modal="true">'+h+'</div>'; s.hidden=false;
  s.onclick=function(e){ if(e.target===s || (e.target.closest && e.target.closest("[data-x]"))) closeSheet(); }; }
function closeSheet(){ $("shade").hidden=true; $("shade").innerHTML=""; }
document.addEventListener("keydown", function(e){ if(e.key==="Escape"){ closeSheet(); $("pop").hidden=true; } });
function account(){
  var a=auth(); if(!a) return;
  sheet('<h3>'+esc(a.user.pic)+'</h3><p>'+(ME&&ME.priv?'Xem được họ tên, số điện thoại người trả lời.':'Xem thống kê. Họ tên, số điện thoại người trả lời chỉ Admin / Giám đốc / Trưởng bộ phận và người thêm khảo sát xem được.')+'</p>'+
    '<p class="sm">Đăng xuất ở đây thì Report Hub / CRM / Tender Map trên trình duyệt này cũng phải đăng nhập lại.</p><div class="act"><button class="btn" data-x="1" type="button">Đóng</button><button class="btn dk" id="lo" type="button">Đăng xuất</button></div>');
  $("lo").onclick=function(){ try{ localStorage.removeItem(LS_TK); }catch(_){} closeSheet(); LIST=null; DATA={}; gate(); };
}

/* ═════════ dữ liệu ═════════ */
var LIST=null, ME=null, OWNER="", DATA={}, PREV={}, pollT=0, CATS=null, HUB="", LISTAT=0, BUSY={};
var GROUPS=["Surgical","Dental","Khác"], GNAME={Surgical:"Surgical", Dental:"Dental", "Khác":"Khác"};
var SEEN=ls(LS_SEEN)||{};
var UI=Object.assign({sort:"form", g:"", p:""}, ls(LS_UI)||{});
function saveUI(){ ls(LS_UI, UI); }
function grpOf(it){ return it.grp||"Khác"; }
function prodOf(it){ return it.prod||"Chung"; }
function prodsOf(g){ var o=((CATS||{})[g]||[]).slice(); (LIST||[]).forEach(function(it){ if(grpOf(it)===g && o.indexOf(prodOf(it))<0) o.splice(Math.max(0,o.length-1),0,prodOf(it)); }); if(o.indexOf("Chung")<0) o.push("Chung"); return o; }
var V={id:"", tab:"st", sec:"", q:"", F:[], lim:20, rq:""};
function saveSeen(){ ls(LS_SEEN, SEEN); }
function newOf(it){ return SEEN[it.id]==null ? 0 : Math.max(0, it.n - SEEN[it.id]); }
function itemOf(id){ return (LIST||[]).filter(function(x){ return x.id===id; })[0]; }

function loadList(quiet){
  return api("rsList").then(function(d){
    if(!d || !d.ok) throw new Error((d&&d.error)||"Không đọc được danh sách");
    ME=d.me; OWNER=d.owner||OWNER; CATS=d.cats||CATS; HUB=d.hub||HUB;
    var arr=[];
    d.items.forEach(function(it){
      if(SEEN[it.id]==null) SEEN[it.id]=it.n;
      if(PREV[it.id]!=null && it.n>PREV[it.id]) arr.push({it:it, k:it.n-PREV[it.id]});
      PREV[it.id]=it.n;
    });
    saveSeen(); LIST=d.items; LISTAT=Date.now(); bell();
    try{ localStorage.setItem(LS_LIST, JSON.stringify({pic:(auth()||{user:{}}).user.pic, at:LISTAT, me:d.me, owner:d.owner, cats:d.cats, hub:d.hub, items:d.items})); }catch(_){}
    if(arr.length) arrived(arr); else if(!V.id) render();
    return d;
  }).catch(function(e){ if(!quiet) throw e; });
}
function arrived(arr){
  var tt=arr[0].it.title; toast(arr.length===1 ? "+"+arr[0].k+" câu trả lời mới · "+(tt.length>42?tt.slice(0,40)+"…":tt) : "Có câu trả lời mới ở "+arr.length+" khảo sát");
  if(V.id && arr.some(function(a){ return a.it.id===V.id; })) loadData(V.id, true); else render();
}
function bell(){
  var b=$("bell"); if(!auth()||!LIST){ b.hidden=true; return; }
  var tot=LIST.reduce(function(s,it){ return s+newOf(it); },0);
  b.hidden=false; var old=b.querySelector(".n"); if(old) old.remove();
  if(tot){ var n=document.createElement("span"); n.className="n"; n.textContent=tot>99?"99+":tot; b.appendChild(n); }
  b.setAttribute("aria-label", tot?tot+" câu trả lời mới":"Không có câu trả lời mới");
  document.title=(tot?"("+tot+") ":"")+"Customer Survey";
  try{ if(navigator.setAppBadge){ if(tot) navigator.setAppBadge(tot); else navigator.clearAppBadge(); } }catch(_){}
}
function startPoll(){ stopPoll(); pollT=setInterval(function(){ if(document.visibilityState==="visible" && auth()) loadList(true); }, POLL_MS); }
function stopPoll(){ if(pollT) clearInterval(pollT); pollT=0; }
document.addEventListener("visibilitychange", function(){ if(document.visibilityState==="visible" && auth() && LIST) loadList(true); });
document.addEventListener("click", function(e){ var p=$("pop"); if(!p.hidden && !p.contains(e.target) && !$("bell").contains(e.target)) p.hidden=true; });
window.addEventListener("scroll", function(){ $("top").classList.toggle("sc", window.scrollY>4); }, {passive:true});

/* kết quả khảo sát lưu trên máy (tối đa 8 khảo sát gần nhất) ⇒ mở lại hiện ngay, đọc máy chủ ngầm */
function dGet(id){ try{ var o=JSON.parse(localStorage.getItem("mmhsv_d_"+id)||"null"); return o&&o.d&&o.d.questions?o:null; }catch(_){ return null; } }
function dPut(id, o){
  var idx=[]; try{ idx=JSON.parse(localStorage.getItem(LS_DIDX)||"[]"); }catch(_){}
  idx=idx.filter(function(x){ return x!==id; }); idx.unshift(id);
  while(idx.length>8){ try{ localStorage.removeItem("mmhsv_d_"+idx.pop()); }catch(_){} }
  for(var k=0;k<4;k++){ try{ localStorage.setItem("mmhsv_d_"+id, JSON.stringify(o)); localStorage.setItem(LS_DIDX, JSON.stringify(idx)); return; }
    catch(_){ var old=idx.length>1?idx.pop():null; if(!old) return; try{ localStorage.removeItem("mmhsv_d_"+old); }catch(__){} } }
}
function loadData(id, force){
  var c=DATA[id];
  if(!c){ var lc=dGet(id); if(lc){ DATA[id]=c={d:lc.d, at:lc.at, local:1}; } }
  if(c && !force && !c.local && Date.now()-c.at<60000) return Promise.resolve(c.d);
  if(BUSY[id]) return BUSY[id];
  BUSY[id]=api("rsData",{id:id}).then(function(d){
    delete BUSY[id];
    if(!d || !d.ok) throw new Error((d&&d.error)||"Không đọc được kết quả");
    DATA[id]={d:d, at:Date.now()}; dPut(id, {d:d, at:Date.now()});
    SEEN[id]=Math.max(SEEN[id]||0, d.n); saveSeen();
    var it=itemOf(id); if(it){ it.n=Math.max(it.n,d.n); PREV[id]=it.n; }
    bell(); if(V.id===id) render(); return d;
  }, function(e){ delete BUSY[id]; throw e; });
  return BUSY[id];
}

/* ═════════ thông báo đẩy + cài app ═════════ */
var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
function standalone(){ return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone===true; }
var SWR=null;
if("serviceWorker" in navigator && location.protocol==="https:"){
  navigator.serviceWorker.register("sw.js",{scope:"./"}).then(function(r){ SWR=r; }).catch(function(){});
  navigator.serviceWorker.addEventListener("message", function(e){ if(e.data && e.data.t==="push" && auth()) loadList(true); });
}
function pushOk(){ return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function b64u(s){ var p="=".repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/")), a=new Uint8Array(b.length); for(var i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; }
function devName(){ var u=navigator.userAgent; return (isIOS?"iPhone/iPad":/android/i.test(u)?"Android":/windows/i.test(u)?"Windows":/mac/i.test(u)?"Mac":"Máy khác")+(standalone()?" · app":" · trình duyệt"); }
function pushSub(){ if(!pushOk()) return Promise.resolve(null); return navigator.serviceWorker.ready.then(function(r){ return r.pushManager.getSubscription(); }).catch(function(){ return null; }); }
function pushOn(){
  if(isIOS && !standalone()){ installGuide(true); return Promise.resolve(false); }
  if(!pushOk()){ toast("Trình duyệt này chưa hỗ trợ thông báo. Dùng Chrome / Edge, hoặc cài app."); return Promise.resolve(false); }
  return Notification.requestPermission().then(function(perm){
    if(perm!=="granted"){ toast("Chưa cho phép thông báo. Mở cài đặt trình duyệt ▸ Thông báo ▸ Cho phép."); return false; }
    return navigator.serviceWorker.ready.then(function(r){ return r.pushManager.getSubscription().then(function(s){ return s || r.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(VAPID)}); }); })
      .then(function(s){ return api("rsPush",{sub:JSON.stringify(s), dev:devName()}); })
      .then(function(d){
        if(!d||!d.ok) throw new Error((d&&d.error)||"Chưa lưu được");
        var none=(LIST||[]).every(function(it){ return !it.watch; });
        if(none && LIST && LIST.length){ LIST.forEach(function(it){ it.watch=true; api("rsWatch",{id:it.id, on:1}); }); }
        toast(none?"Đã bật thông báo và theo dõi mọi khảo sát":"Đã bật thông báo trên máy này"); render(); return true;
      });
  }).catch(function(e){ toast("Chưa bật được thông báo: "+e.message); return false; });
}
function pushOff(){
  return pushSub().then(function(s){ if(!s) return; var j=JSON.stringify(s); return s.unsubscribe().then(function(){ return api("rsPush",{op:"del", sub:j}); }); })
    .then(function(){ toast("Đã tắt thông báo trên máy này"); render(); });
}
var BIP=null;
window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); BIP=e; instBtn(); });
window.addEventListener("appinstalled", function(){ BIP=null; instBtn(); toast("Đã cài Customer Survey"); });
function instBtn(){ $("inst").hidden=standalone() || !(BIP || isIOS); }
function install(){
  if(BIP){ BIP.prompt(); BIP.userChoice.then(function(){ BIP=null; instBtn(); }); return; }
  installGuide(false);
}
function installGuide(forPush){
  sheet('<h3>Cài Customer Survey</h3><p>'+(forPush?'Trên iPhone / iPad, thông báo chỉ hoạt động khi đã cài app.':'Mở nhanh từ màn hình chính, nhận thông báo câu trả lời mới.')+'</p>'+
    (isIOS?'<ol class="steps"><li>Mở trang này bằng <b>Safari</b>.</li><li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).</li><li>Chọn <b>Thêm vào MH chính</b> ▸ <b>Thêm</b>.</li><li>Mở <b>Customer Survey</b> từ màn hình chính, bấm chuông ▸ bật thông báo.</li></ol>'
      :'<ol class="steps"><li>Mở trang này bằng <b>Chrome</b> hoặc <b>Edge</b>.</li><li>Bấm menu <b>⋮</b> ▸ <b>Cài đặt ứng dụng</b> / <b>Thêm vào màn hình chính</b>.</li><li>Mở <b>Customer Survey</b>, bấm chuông ▸ bật thông báo.</li></ol>')+
    '<div class="act"><button class="btn dk" data-x="1" type="button">Đã hiểu</button></div>');
}

/* ═════════ điều hướng ═════════ */
function route(){
  var m=/#s=([^&]+)/.exec(location.hash||""), id=m?decodeURIComponent(m[1]):"";
  if(id!==V.id){ V={id:id, tab:"st", sec:"", q:"", F:[], lim:20, rq:""}; window.scrollTo(0,0); }
  $("fab").hidden=!!id || !auth(); $("tip").hidden=true;
  if(id && !DATA[id]){ var lc=dGet(id); if(lc) DATA[id]={d:lc.d, at:lc.at, local:1}; }
  render();
  if(id){
    clearTimeout(route._s); route._s=setTimeout(function(){ var s=$("slow"); if(s && V.id===id) s.hidden=false; }, 5000);
    loadData(id, false).catch(function(e){ if(V.id!==id) return; if(DATA[id]){ toast("Chưa cập nhật được: "+e.message); render(); return; }
      $("main").innerHTML=backLink()+'<div class="note err">Chưa đọc được kết quả: '+esc(e.message)+'</div><p><button class="btn" id="rt" type="button">'+I.ref+'Thử lại</button></p>'; var b=$("rt"); if(b) b.onclick=route; });
  }
}
window.addEventListener("hashchange", route);
function backLink(){ return '<a class="back" href="#">'+I.back+'Tất cả khảo sát</a>'; }
function render(){
  if(!auth()){ gate(); return; }
  $("tip").hidden=true;
  if(!LIST){ $("main").innerHTML=skHome(); return; }
  if(V.id) renderSurvey(); else renderHome();
}

/* ═════════ biểu đồ (SVG, một màu; hover = chú thích nổi) ═════════ */
function cols(vals, labels, h, opt){
  opt=opt||{}; var n=vals.length, mx=Math.max.apply(null,[1].concat(vals)), W=opt.w||Math.max(n*14,280), bw=Math.min(22, W/n*0.62), gap=W/n;
  var s='<svg viewBox="0 0 '+W+' '+h+'" width="100%" height="'+h+'" preserveAspectRatio="none" role="img" aria-label="'+esc(opt.aria||"Biểu đồ")+'">';
  if(opt.grid!==false) s+='<line x1="0" y1="'+(h-0.5)+'" x2="'+W+'" y2="'+(h-0.5)+'" stroke="#E6E5E1"/>';
  vals.forEach(function(v,i){
    var bh=v?Math.max(3, (h-6)*v/mx):0, x=i*gap+(gap-bw)/2, y=h-1-bh, last=i===n-1;
    var fill=last&&opt.hiLast?"#B28A3E":(opt.light?"#C9CBD0":"#3A3E47");
    s+='<rect x="'+(i*gap)+'" y="0" width="'+gap+'" height="'+h+'" fill="transparent" data-tip="'+esc(labels[i]+": "+n0(v)+" câu trả lời")+'"/>';
    if(bh) s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="'+Math.min(2,bw/3)+'" fill="'+fill+'" pointer-events="none"/>';
  });
  return s+'</svg>';
}
function wireTips(root){
  var t=$("tip");
  (root||document).querySelectorAll("[data-tip]").forEach(function(el){
    el.onmousemove=function(e){ t.textContent=el.getAttribute("data-tip"); t.hidden=false; t.style.left=Math.min(e.clientX+12, innerWidth-t.offsetWidth-8)+"px"; t.style.top=(e.clientY-36)+"px"; };
    el.onmouseleave=function(){ t.hidden=true; };
    el.onclick=function(e){ if(e.pointerType==="touch"||e.detail===0){ toast(el.getAttribute("data-tip"),2200); } };
  });
}
function last14(){ var o=[]; for(var i=13;i>=0;i--) o.push(dd(Date.now()-i*864e5)); return o; }

/* ═════════ tổng quan ═════════ */
/* khung xương khi chưa có dữ liệu (đúng hình dạng nội dung) */
function skHome(){
  var rows=''; for(var i=0;i<7;i++) rows+='<div class="rw"><div class="t"><span class="sk w'+(i%2?60:80)+'"></span><span class="sk w30" style="margin-top:7px;height:9px"></span></div><span class="sk"></span><span class="sk td2"></span><span class="sk h20 sp"></span><span class="sk w"></span><span></span></div>';
  return '<div class="lay"><aside class="side"><div class="skc" style="border:0;background:none;padding:6px 10px">'+[80,60,80,40,60,40].map(function(w){ return '<span class="sk w'+w+'"></span>'; }).join("")+'</div></aside>'+
    '<section><div class="ph"><div style="width:280px"><span class="sk h28 w60"></span><span class="sk w40" style="margin-top:10px"></span></div></div>'+
    '<div class="stats">'+[0,1,2].map(function(){ return '<div><span class="sk h20 w40"></span><span class="sk w60" style="margin-top:8px"></span></div>'; }).join("")+'<div class="ch"><span class="sk h28"></span></div></div>'+
    '<div class="tbl">'+rows+'</div></section></div>';
}
function skSurvey(title){
  var qc=''; for(var i=0;i<4;i++) qc+='<div class="skc"><span class="sk w60"></span><span class="sk w30" style="height:9px"></span>'+[80,60,40].map(function(w){ return '<span class="sk w'+w+'" style="height:8px;margin-top:8px"></span>'; }).join("")+'</div>';
  return backLink()+'<div class="sh"><div><h1>'+esc(title||"Khảo sát")+'</h1><div class="meta"><span class="sk" style="width:220px"></span></div></div></div>'+
    '<div class="kp">'+[0,1,2,3].map(function(){ return '<div class="k"><span class="sk h20 w40"></span><span class="sk w60" style="margin-top:8px"></span></div>'; }).join("")+'</div>'+
    '<div class="panel"><span class="sk" style="height:110px"></span></div><div class="qs">'+qc+'</div>'+
    '<p class="slow" id="slow" hidden>Lần đầu mở khảo sát này máy chủ cần đọc toàn bộ câu trả lời (khoảng 10–30 giây). Lần sau sẽ mở ngay.</p>';
}
var SVG_SEARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
var SVG_EXT='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
function inScope(it){ return (!UI.g || grpOf(it)===UI.g) && (!UI.p || prodOf(it)===UI.p); }
/* cây bên trái: Tất cả · Surgical ▸ sản phẩm · Dental ▸ sản phẩm (chỉ hiện sản phẩm có khảo sát) */
function sideHtml(){
  var all=LIST||[], cnt=function(f){ return all.filter(f).length; };
  var h='<div class="cap">Nhóm sản phẩm</div><button class="nv'+(!UI.g?' on':'')+'" data-g="" data-p="" type="button"><span>Tất cả khảo sát</span><b>'+all.length+'</b></button>';
  GROUPS.forEach(function(g){
    var n=cnt(function(it){ return grpOf(it)===g; }); if(!n && g==="Khác") return;
    h+='<button class="nv g'+(UI.g===g&&!UI.p?' on':'')+'" data-g="'+esc(g)+'" data-p="" type="button"><span>'+esc(GNAME[g])+'</span><b>'+n+'</b></button>';
    prodsOf(g).forEach(function(p){ var m=cnt(function(it){ return grpOf(it)===g && prodOf(it)===p; }); if(!m) return;
      h+='<button class="nv sub'+(UI.g===g&&UI.p===p?' on':'')+'" data-g="'+esc(g)+'" data-p="'+esc(p)+'" type="button"><span>'+esc(p)+'</span><b>'+m+'</b></button>'; });
  });
  if(HUB) h+='<a class="hub" href="'+esc(HUB)+'" target="_blank" rel="noopener">'+SVG_EXT+'Folder Product Survey</a>';
  return h;
}
function rowHtml(it, showCat){
  var k=newOf(it), r=(it.recent||[])[0], sub=[];
  if(showCat) sub.push(esc((UI.g?'':GNAME[grpOf(it)]+' · ')+prodOf(it)));
  if(it.err) sub.push('<span class="err">'+esc(it.err)+'</span>'); else if(r&&r[1]) sub.push(esc(r[1]));
  return '<div class="rw it" data-id="'+esc(it.id)+'" tabindex="0" role="link">'+
    '<div class="t"><b>'+esc(it.title)+(it.kind==="sheet"?'<span class="tg" title="Không có Google Form: thống kê đọc từ file Sheet">Sheet</span>':'')+'</b>'+(sub.length?'<small>'+sub.join(' · ')+'</small>':'')+'</div>'+
    '<div class="r"><span class="n">'+n0(it.n)+'</span>'+(k?'<span class="nb">+'+n0(k)+'</span>':'')+'</div>'+
    '<div class="r td2"><span class="d'+(it.today?'':' z')+'">'+n0(it.today||0)+'</span></div>'+
    '<div class="sp">'+cols(it.days||[], last14(), 26, {hiLast:true, grid:false, aria:"14 ngày qua", w:140})+'</div>'+
    '<div class="w">'+(it.last?esc(ago(it.last)):'–')+'</div>'+
    '<button class="bk'+(it.watch?' on':'')+'" data-w="'+esc(it.id)+'" type="button" aria-label="'+(it.watch?'Bỏ theo dõi':'Theo dõi')+'" title="'+(it.watch?'Đang theo dõi: nhận thông báo câu trả lời mới':'Theo dõi để nhận thông báo')+'">'+(it.watch?I.bellF:I.bell)+'</button></div>';
}
function renderHome(){
  if(UI.g && !(LIST||[]).some(function(it){ return grpOf(it)===UI.g; })){ UI.g=""; UI.p=""; }
  if(UI.p && !(LIST||[]).some(function(it){ return grpOf(it)===UI.g && prodOf(it)===UI.p; })) UI.p="";
  var q=nk(UI.q||""), S=LIST.filter(inScope), L=S.filter(function(it){ return !q || nk(it.title+" "+prodOf(it)).indexOf(q)>=0; });
  var so=UI.so||"last";
  L.sort(function(x,y){ if(so==="n") return (y.n||0)-(x.n||0); if(so==="name") return x.title.localeCompare(y.title,"vi"); return String(y.last||y.at||"").localeCompare(String(x.last||x.at||"")); });
  var tot=S.reduce(function(s,x){ return s+(x.n||0); },0), today=S.reduce(function(s,x){ return s+(x.today||0); },0);
  var days=last14().map(function(_,i){ return S.reduce(function(s,x){ return s+((x.days||[])[i]||0); },0); }), week=days.slice(-7).reduce(function(s,v){ return s+v; },0);
  var title=UI.p||(UI.g?GNAME[UI.g]:"Tất cả khảo sát"), crumb=UI.p?GNAME[UI.g]:"";
  var sb=function(k,lb){ return '<button type="button" data-so="'+k+'" class="'+(so===k?'on':'')+'" aria-label="Sắp xếp theo '+lb.toLowerCase()+'">'+lb+(so===k?' ↓':'')+'</button>'; };
  var h='<div class="lay"><aside class="side" aria-label="Nhóm sản phẩm">'+sideHtml()+'</aside><section>';
  h+='<div class="ph"><div>'+(crumb?'<div class="crumb">'+esc(crumb)+'</div>':'')+'<h1>'+esc(title)+'</h1><div class="sub">'+S.length+' khảo sát · '+n0(tot)+' câu trả lời</div></div>'+
    '<div class="pha"><label class="srch">'+SVG_SEARCH+'<input class="inp" id="h-q" type="search" placeholder="Tìm khảo sát" value="'+esc(UI.q||"")+'" aria-label="Tìm khảo sát" autocomplete="off"></label><button class="btn dk add" id="h-add" type="button">'+I.plus+'Thêm khảo sát</button></div></div>';
  h+='<div class="mscope"><select class="inp" id="m-g" aria-label="Nhóm sản phẩm"><option value="">Tất cả nhóm</option>'+GROUPS.filter(function(g){ return LIST.some(function(it){ return grpOf(it)===g; }); }).map(function(g){ return '<option'+(UI.g===g?' selected':'')+' value="'+esc(g)+'">'+esc(GNAME[g])+'</option>'; }).join("")+'</select>'+
    '<select class="inp" id="m-p" aria-label="Sản phẩm"'+(UI.g?'':' disabled')+'><option value="">Mọi sản phẩm</option>'+(UI.g?prodsOf(UI.g).filter(function(p){ return LIST.some(function(it){ return grpOf(it)===UI.g && prodOf(it)===p; }); }).map(function(p){ return '<option'+(UI.p===p?' selected':'')+'>'+esc(p)+'</option>'; }).join(""):'')+'</select></div>';
  h+='<div class="stats"><div><b>'+n0(tot)+'</b><span>câu trả lời</span></div><div><b>'+(today?'<span class="dot"></span>':'')+n0(today)+'</b><span>hôm nay</span></div><div><b>'+n0(week)+'</b><span>7 ngày qua</span></div>'+
    '<div class="ch">'+cols(days, last14(), 46, {hiLast:true, aria:"Câu trả lời 14 ngày qua", w:420})+'<div class="ax"><span>'+last14()[0]+'</span><span>14 ngày qua</span><span>hôm nay</span></div></div></div>';
  h+='<div class="tbl"><div class="rw hd"><span>'+sb("name","Khảo sát")+'</span><span class="r">'+sb("n","Câu trả lời")+'</span><span class="r td2">Hôm nay</span><span class="sp">14 ngày</span><span class="w">'+sb("last","Gần nhất")+'</span><span></span></div>';
  if(!LIST.length) h+='<div class="empty">Chưa có khảo sát. Bấm <b>Thêm khảo sát</b> rồi dán link sửa Google Form hoặc link file Sheet kết quả.</div>';
  else if(!L.length) h+='<div class="empty">Không có khảo sát khớp “'+esc(UI.q||"")+'”.</div>';
  else h+=L.map(function(it){ return rowHtml(it, !UI.p); }).join("");
  h+='</div>'+(LISTAT===1||(LISTAT&&Date.now()-LISTAT>120000)?'<div class="upd"><span class="spin"></span>Đang cập nhật số liệu…</div>':'')+'</section></div>';
  $("main").innerHTML=h;
  $("h-add").onclick=addSheet;
  var qi=$("h-q"); qi.oninput=function(){ UI.q=qi.value; var pos=qi.selectionStart; renderHome(); var n=$("h-q"); n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} };
  document.querySelectorAll(".side [data-g]").forEach(function(b){ b.onclick=function(){ UI.g=b.getAttribute("data-g"); UI.p=b.getAttribute("data-p")||""; saveUI(); render(); window.scrollTo(0,0); }; });
  $("m-g").onchange=function(){ UI.g=this.value; UI.p=""; saveUI(); render(); };
  $("m-p").onchange=function(){ UI.p=this.value; saveUI(); render(); };
  document.querySelectorAll("[data-so]").forEach(function(b){ b.onclick=function(){ UI.so=b.getAttribute("data-so"); saveUI(); render(); }; });
  document.querySelectorAll(".rw.it").forEach(function(c){
    var go=function(){ location.hash="#s="+encodeURIComponent(c.getAttribute("data-id")); };
    c.onclick=function(e){ if(e.target.closest("[data-w]")) return; go(); };
    c.onkeydown=function(e){ if(e.key==="Enter") go(); };
  });
  document.querySelectorAll("[data-w]").forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); watch(b.getAttribute("data-w")); }; });
  wireTips($("main"));
}
function addSheet(){
  sheet('<h3>Thêm khảo sát</h3><p>Dán link <b>sửa</b> Google Form (…/forms/d/…/edit) hoặc link <b>file Sheet kết quả</b>.</p>'+
    '<div class="row" style="flex-wrap:nowrap"><input class="inp" id="add-l" placeholder="https://docs.google.com/…" autocomplete="off">'+(navigator.clipboard&&navigator.clipboard.readText?'<button class="btn" id="add-p" type="button">Dán</button>':'')+'</div>'+
    '<div class="two"><label>Nhóm sản phẩm<select class="inp" id="add-g"><option value="">Tự nhận theo tên</option>'+GROUPS.map(function(g){ return '<option'+(UI.g===g?' selected':'')+'>'+esc(g)+'</option>'; }).join("")+'</select></label>'+
    '<label>Sản phẩm<select class="inp" id="add-pr"></select></label></div>'+
    '<p class="sm" style="margin-top:10px">Khảo sát được đưa vào folder Product Survey trên Drive theo nhóm / sản phẩm. Form / file của người khác: chia sẻ quyền Người xem cho <b>'+esc(OWNER||"mmh.product@manimedicalhanoi.com")+'</b> trước.</p>'+
    '<div class="lgerr" id="add-e" style="color:var(--bad)"></div><div class="act"><button class="btn" data-x="1" type="button">Huỷ</button><button class="btn dk" id="add-b" type="button">Thêm khảo sát</button></div>');
  var i=$("add-l"); setTimeout(function(){ i.focus(); }, 50);
  i.onkeydown=function(e){ if(e.key==="Enter") addGo(); };
  if($("add-p")) $("add-p").onclick=function(){ navigator.clipboard.readText().then(function(t){ i.value=String(t||"").trim(); }).catch(function(){ toast("Trình duyệt chưa cho đọc bộ nhớ tạm — dán bằng tay."); }); };
  $("add-b").onclick=addGo;
  var fill=function(){ var g=$("add-g").value, s=$("add-pr"); s.disabled=!g; s.innerHTML=g?prodsOf(g).map(function(p){ return '<option'+(UI.p===p&&UI.g===g?' selected':'')+'>'+esc(p)+'</option>'; }).join(""):'<option value="">Tự nhận theo tên</option>'; };
  $("add-g").onchange=fill; fill();
}
function addGo(){
  var i=$("add-l"), link=String(i.value||"").trim(), b=$("add-b"), e=$("add-e");
  if(!link){ i.focus(); return; }
  b.disabled=true; b.textContent="Đang mở link…"; e.textContent="";
  var g=($("add-g")||{}).value||"", pr=g?(($("add-pr")||{}).value||""):"";
  api("rsAdd",{link:link, grp:g, prod:pr}).then(function(d){
    b.disabled=false; b.textContent="Thêm khảo sát";
    if(!d || !d.ok){ e.textContent=(d&&d.error)||"Chưa thêm được."; return; }
    closeSheet(); toast(d.dup?"Khảo sát đã có trong danh sách":"Đã thêm: "+d.item.title+(d.item.grp?" · "+d.item.grp+" · "+d.item.prod:""));
    return loadList().then(function(){ location.hash="#s="+encodeURIComponent(d.item.id); });
  },function(x){ b.disabled=false; b.textContent="Thêm khảo sát"; e.textContent=x.message; });
}
/* đổi nhóm / sản phẩm ⇒ máy chủ chuyển file / lối tắt sang đúng folder Product Survey */
function catSheet(id){
  var it=itemOf(id); if(!it) return; var g0=grpOf(it), p0=prodOf(it), OTHER="Sản phẩm khác…";
  sheet('<h3>Nhóm / sản phẩm</h3><p class="sm">'+esc(it.title)+'</p><div class="two"><label>Nhóm sản phẩm<select class="inp" id="c-g">'+GROUPS.map(function(g){ return '<option'+(g===g0?' selected':'')+'>'+esc(g)+'</option>'; }).join("")+'</select></label>'+
    '<label>Sản phẩm<select class="inp" id="c-p"></select></label></div><div id="c-ow" hidden><label>Tên sản phẩm<input class="inp" id="c-o" maxlength="60" placeholder="vd. Kìm vi phẫu"></label></div>'+
    '<p class="sm">Khảo sát sẽ nằm trong folder Product Survey ▸ nhóm ▸ sản phẩm trên Drive.</p><div class="lgerr" id="c-e" style="color:var(--bad)"></div>'+
    '<div class="act"><button class="btn" data-x="1" type="button">Huỷ</button><button class="btn dk" id="c-b" type="button">Lưu</button></div>');
  var fill=function(){ var g=$("c-g").value; $("c-p").innerHTML=prodsOf(g).concat([OTHER]).map(function(p){ return '<option'+(g===g0&&p===p0?' selected':'')+'>'+esc(p)+'</option>'; }).join(""); $("c-ow").hidden=true; };
  $("c-g").onchange=fill; fill();
  $("c-p").onchange=function(){ $("c-ow").hidden=$("c-p").value!==OTHER; if(!$("c-ow").hidden) $("c-o").focus(); };
  $("c-b").onclick=function(){
    var g=$("c-g").value, p=$("c-p").value===OTHER?String($("c-o").value||"").trim():$("c-p").value;
    if(!p){ $("c-e").textContent="Nhập tên sản phẩm."; return; }
    var old={g:it.grp, p:it.prod}; it.grp=g; it.prod=p; closeSheet(); render();
    api("rsSet",{id:id, grp:g, prod:p}).then(function(d){
      if(!d||!d.ok) throw new Error((d&&d.error)||"Chưa lưu được");
      toast("Đã chuyển sang "+g+" · "+p+(d.place&&/chưa/i.test(d.place)?" — "+d.place:""), 4200);
    }).catch(function(e){ it.grp=old.g; it.prod=old.p; render(); toast(e.message); });
  };
}
function watch(id){
  var it=itemOf(id); if(!it) return;
  var on=!it.watch; it.watch=on; it.watchers=Math.max(0,(it.watchers||0)+(on?1:-1)); render();
  api("rsWatch",{id:id, on:on?1:0}).then(function(d){
    if(!d||!d.ok){ it.watch=!on; render(); toast((d&&d.error)||"Chưa lưu được"); return; }
    if(!on){ toast("Đã bỏ theo dõi"); return; }
    pushSub().then(function(s){
      if(s){ toast("Đang theo dõi: có câu trả lời mới sẽ báo về máy này"); return; }
      sheet('<h3>Đã theo dõi</h3><p>Câu trả lời mới sẽ báo ở mục "Nhắc tôi" của Report Hub / CRM. Bật thông báo để nhận cả trên máy này.</p><div class="act"><button class="btn" data-x="1" type="button">Để sau</button><button class="btn dk" id="w-on" type="button">Bật thông báo</button></div>');
      $("w-on").onclick=function(){ closeSheet(); pushOn(); };
    });
  },function(e){ it.watch=!on; render(); toast(e.message); });
}
function bellPop(){
  var p=$("pop"); if(!p.hidden){ p.hidden=true; return; }
  var news=(LIST||[]).filter(function(it){ return newOf(it)>0; });
  p.innerHTML='<h3>Câu trả lời mới</h3>'+(news.length?'<ul>'+news.map(function(it){ var r=(it.recent||[])[0]; return '<li data-id="'+esc(it.id)+'"><span class="nb">'+newOf(it)+'</span><span><b>'+esc(it.title)+'</b><div class="sm mut">'+esc(ago(it.last))+(r&&r[1]?' · '+esc(r[1]):'')+'</div></span></li>'; }).join("")+'</ul>':'<div class="em">Đã xem hết câu trả lời.</div>')+
    '<div class="ps"><span id="ps-t">Thông báo trên máy này</span><button class="sw" id="ps-sw" type="button" aria-label="Bật / tắt thông báo"></button></div><p class="sm mut" style="margin:8px 0 0">Bấm chuông trên từng khảo sát để chọn khảo sát cần báo.</p>';
  p.hidden=false;
  p.querySelectorAll("li[data-id]").forEach(function(li){ li.onclick=function(){ p.hidden=true; location.hash="#s="+encodeURIComponent(li.getAttribute("data-id")); }; });
  pushSub().then(function(s){ var sw=$("ps-sw"); if(!sw) return; sw.classList.toggle("on", !!s);
    if(pushOk() && Notification.permission==="denied") $("ps-t").textContent="Thông báo đang bị chặn trong cài đặt trình duyệt";
    sw.onclick=function(){ (s?pushOff():pushOn()).then(function(){ p.hidden=true; }); }; });
}

/* ═════════ thống kê ═════════ */
function rowsOf(d){
  var rows=d.answers;
  V.F.forEach(function(f){ rows=rows.filter(function(r){ var a=r[1][f.k]; if(a==null||(Array.isArray(a)&&!a.length)) return f.v.indexOf(NONE)>=0; var arr=Array.isArray(a)?a:[a]; return f.v.some(function(v){ return arr.indexOf(v)>=0; }); }); });
  return rows;
}
var NONE="Không chọn";
/* câu đồng ý (Quyền riêng tư): đếm trên mọi người trả lời */
function isOptIn(q){ return /nhận thông tin/i.test(q.q) && /đồng ý|không bắt buộc|quyền riêng tư/i.test(q.q+" "+(q.opts||[]).join(" ")+" "+(q.sec||"")); }
function isConsent(q){ if(isOptIn(q)) return false;  return /đồng ý|quyền riêng tư|nhận thông tin/i.test(q.q+" "+(q.sec||"")) && q.t==="checkbox"; }
/* câu chọn nhiều: người đã trả lời phần chứa câu đó mà không tích ⇒ "Không chọn" (tính vào tổng) */
function secBase(q, rows, d){
  if(q.t!=="checkbox"||!d) return 0;
  var ks=d.questions.filter(function(x){ return (x.sec||"")===(q.sec||""); }).map(function(x){ return x.k; });
  if(isConsent(q)) return rows.length;
  return rows.filter(function(r){ return ks.some(function(k){ var a=r[1][k]; return a!=null && !(Array.isArray(a)&&!a.length) && a!==""; }); }).length;
}
function statOf(q, rows, d){
  var k=q.k, ans=rows.map(function(r){ return r[1][k]; }).filter(function(a){ return a!=null && !(Array.isArray(a)&&!a.some(function(x){ return x!=null; })); });
  var s={n:ans.length, opts:[], other:[], avg:null};
  if(q.t==="radio"||q.t==="checkbox"||q.t==="scale"){
    var cnt={}; q.opts.forEach(function(o){ cnt[o]=0; });
    ans.forEach(function(a){ (Array.isArray(a)?a:[a]).forEach(function(v){ if(v==null||v==="") return; if(cnt[v]!=null) cnt[v]++; else s.other.push(v); }); });
    s.opts=q.opts.map(function(o){ return {v:o, c:cnt[o]}; });
    if(s.other.length) s.opts.push({v:"Khác (tự ghi)", c:s.other.length, oth:true});
    if(q.t==="scale"){ var sum=0,m=0; ans.forEach(function(a){ var x=parseFloat(a); if(isFinite(x)){ sum+=x; m++; } }); s.avg=m?sum/m:null; }
  } else if(q.t==="grid"||q.t==="checkgrid"){
    s.rows=q.rows.map(function(rn, ri){ var c={}, nr=0; q.cols.forEach(function(cn){ c[cn]=0; });
      ans.forEach(function(a){ var v=a[ri]; if(v==null) return; nr++; (Array.isArray(v)?v:[v]).forEach(function(x){ if(c[x]!=null) c[x]++; }); });
      return {r:rn, n:nr, c:c}; });
  } else {
    var g={}; ans.forEach(function(a){ var t=String(a).trim(); if(!t) return; var key=nk(t); if(!g[key]) g[key]={v:t, c:0}; g[key].c++; });
    s.texts=Object.keys(g).map(function(key){ return g[key]; }).sort(function(a,b){ return b.c-a.c; });
  }
  var b=secBase(q, rows, d); s.base=Math.max(s.n, b); s.none=s.base-s.n;
  return s;
}
/* điểm nổi bật: câu chọn có ≥ 5 người trả lời ⇒ lựa chọn nhiều người chọn nhất, xếp theo mức áp đảo */
function insights(d, rows){
  var out=[];
  d.questions.forEach(function(q){
    if(q.pii || !(q.t==="radio"||q.t==="checkbox") || /đồng ý|quyền riêng tư/i.test(q.q+" "+(q.sec||""))) return;
    var s=statOf(q, rows, d); if(s.n<5) return;
    var top=s.opts.filter(function(o){ return !o.oth; }).sort(function(a,b){ return b.c-a.c; })[0]; if(!top||!top.c) return;
    if(/^không thực hiện|^chưa thực hiện/i.test(top.v)) return;
    out.push({q:q, v:top.v, p:pc(top.c,s.base), c:top.c, n:s.base});
  });
  return out.sort(function(a,b){ return b.p-a.p; }).slice(0,8);
}
/* "Ai đã trả lời": mẫu số chung của mọi khảo sát — cơ sở công tác (gộp tên gần giống) + 1–2 câu hồ sơ (chuyên khoa, chức danh, kinh nghiệm, tỉnh…).
   Khảo sát không có câu nào như vậy ⇒ không hiện. Thay biểu đồ câu trả lời theo giờ (người dùng 18/11: không cần). */
var RX_WORK=/bệnh viện|cơ sở|nơi công tác|đơn vị công tác|phòng khám|nơi làm việc|workplace|hospital|clinic|tên lab|labo/i;
var RX_PROF=/chuyên khoa|chuyên ngành|chức danh|chức vụ|vị trí công tác|vai trò|kinh nghiệm|số năm|năm công tác|tỉnh|thành phố|khu vực|vùng|loại hình|tuyến|specialty|position|experience|province|region/i;
function wkKey(v){ return nk(v).replace(/[.,;:()"'“”\-–]/g," ").replace(/\b(benh vien|bv|bvdk|bv dk|pk|phong kham|trung tam)\b/g," ").replace(/\s+/g," ").trim(); }
function profilePanel(d, rows){
  if(rows.length<2) return "";
  var Q=d.questions.filter(function(q){ return !q.pii && !isConsent(q) && !isOptIn(q); });
  var wq=Q.filter(function(q){ return (q.t==="text"||q.t==="radio") && RX_WORK.test(short(q.q)) && !/loại hình|tuyến|quy mô|số lượng/i.test(q.q); })[0];
  var pq=Q.filter(function(q){ return q!==wq && (q.t==="radio"||q.t==="checkbox"||q.t==="scale") && q.opts && q.opts.length>1 && q.opts.length<=12 && RX_PROF.test(short(q.q)); }).slice(0, wq?2:3);
  var blocks=[];
  if(wq){
    var g={}, n=0; rows.forEach(function(r){ var v=r[1][wq.k]; if(v==null||v==="") return; v=String(v).trim(); var k=wkKey(v)||nk(v); n++;
      if(!g[k]) g[k]={c:0, names:{}}; g[k].c++; g[k].names[v]=(g[k].names[v]||0)+1; });
    var L=Object.keys(g).map(function(k){ var nm=Object.keys(g[k].names).sort(function(a,b){ return g[k].names[b]-g[k].names[a]; })[0]; return {v:nm, c:g[k].c}; }).sort(function(a,b){ return b.c-a.c; });
    if(L.length){
      var top=L.slice(0,6), mx=top[0].c;
      blocks.push('<div class="pf"><h4>Cơ sở trả lời <small>'+n0(L.length)+' cơ sở</small></h4>'+top.map(function(o){ return optRow(o, n, o.c===mx && mx>1); }).join("")+
        (L.length>6?'<div class="sm mut" style="margin-top:6px">và '+n0(L.length-6)+' cơ sở khác</div>':'')+'</div>');
    }
  }
  pq.forEach(function(q){
    var s=statOf(q, rows, d), base=s.base||s.n; if(!s.n) return;
    var list=s.opts.filter(function(o){ return o.c; }).sort(function(a,b){ return b.c-a.c; }).slice(0,6), mx=list.length?list[0].c:0;
    blocks.push('<div class="pf"><h4>'+esc(short(q.q).replace(/\?$/,"").slice(0,70))+'</h4>'+list.map(function(o){ return optRow(o, base, o.c===mx); }).join("")+'</div>');
  });
  if(!blocks.length) return "";
  return '<div class="panel"><h3>Ai đã trả lời</h3><div class="pfs">'+blocks.join("")+'</div></div>';
}
function spanOf(rows){
  if(!rows.length) return "";
  var a=new Date(rows[0][0]), b=new Date(rows[rows.length-1][0]); if(!rows[0][0]) return "";
  var f=function(x,y){ return p2(x.getDate())+"/"+p2(x.getMonth()+1)+(y?"/"+x.getFullYear():""); };
  return a.toDateString()===b.toDateString()?f(a,1):f(a,a.getFullYear()!==b.getFullYear())+" – "+f(b,1);
}
function optRow(o, base, top){
  var w=base?Math.round(o.c*1000/base)/10:0;
  return '<div class="o'+(top&&o.c?' hi':'')+(o.c?'':' z')+'"><span class="l">'+esc(o.v)+'</span><span class="v"><b>'+pct(o.c,base)+'</b>'+n0(o.c)+'</span><span class="tr"><i style="width:'+w+'%"></i></span></div>';
}
var TY={radio:"chọn 1", checkbox:"chọn nhiều", scale:"thang điểm", grid:"bảng", checkgrid:"bảng", text:"tự ghi"};
function qCard(q, rows, total, d){
  var s=statOf(q, rows, d), h='', wide=false, no=qno(q);
  if(q.t==="radio"||q.t==="checkbox"||q.t==="scale"){
    var mx=Math.max.apply(null,[0].concat(s.opts.map(function(o){ return o.c; })));
    var list=s.opts.slice(); if(UI.sort==="cnt") list.sort(function(a,b){ return (a.oth?1:0)-(b.oth?1:0) || b.c-a.c; });
    h=list.map(function(o){ return optRow(o, s.base||s.n, o.c===mx); }).join("");
    if(s.none) h+='<div class="o none"><span class="l">'+NONE+'</span><span class="v"><b>'+pct(s.none,s.base)+'</b>'+n0(s.none)+'</span><span class="tr"><i style="width:'+Math.round(s.none*1000/s.base)/10+'%"></i></span></div>';
    if(s.other.length){ var oc={}; s.other.forEach(function(v){ var kk=nk(v); oc[kk]=oc[kk]||{v:v,c:0}; oc[kk].c++; });
      h+='<ul class="oth">'+Object.keys(oc).map(function(kk){ return '<li>'+esc(oc[kk].v)+(oc[kk].c>1?' · '+oc[kk].c:'')+'</li>'; }).join("")+'</ul>'; }
    if(q.t==="scale" && s.avg!=null) h+='<div class="avg"><b>'+String(Math.round(s.avg*10)/10).replace(".",",")+'</b>điểm trung bình / '+esc(q.hi)+(q.ll?' · '+esc(q.lo)+' = '+esc(q.ll)+', '+esc(q.hi)+' = '+esc(q.hl):'')+'</div>';
  } else if(q.t==="grid"||q.t==="checkgrid"){
    wide=q.cols.length>3;
    h='<table class="gt"><thead><tr><th></th>'+q.cols.map(function(c){ return '<th>'+esc(c)+'</th>'; }).join("")+'</tr></thead><tbody>'+
      s.rows.map(function(r){ var mx=Math.max.apply(null,[0].concat(q.cols.map(function(c){ return r.c[c]; })));
        return '<tr><td>'+esc(r.r)+'</td>'+q.cols.map(function(c){ var v=r.c[c], p=r.n?v/r.n:0, dark=p>0.55;
          return '<td class="c" style="background:rgba(185,138,52,'+(0.06+p*0.84).toFixed(2)+');color:'+(dark?'#1A1405':'#3B3F47')+(v===mx&&v?';box-shadow:inset 0 0 0 1.5px #8A6418':'')+'" data-tip="'+esc(r.r+" · "+c+": "+v+" người ("+pct(v,r.n)+")")+'"><b>'+pct(v,r.n)+'</b><small>'+n0(v)+'</small></td>'; }).join("")+'</tr>'; }).join("")+'</tbody></table>';
  } else {
    var tx=s.texts||[], lim=V["tx"+q.k]?tx.length:6;
    h=tx.length?'<ul class="tx">'+tx.slice(0,lim).map(function(t){ return '<li><span>'+esc(t.v)+'</span>'+(t.c>1?'<b>×'+t.c+'</b>':'')+'</li>'; }).join("")+'</ul>'+(tx.length>lim?'<button class="lnk more" data-tx="'+q.k+'" type="button">Xem thêm '+(tx.length-lim)+'</button>':''):'<div class="mut sm">Chưa có câu trả lời.</div>';
    wide=tx.length>6;
  }
  return '<div class="qc'+(wide?' wide':'')+'" id="q'+q.k+'">'+(q.grp?'<div class="g">'+esc(q.grp)+'</div>':'')+'<h4>'+(no&&!q.grp?'<span class="mut">Câu '+no+' · </span>':'')+esc(short(q.q))+'</h4>'+
    '<div class="m"><span class="ty">'+TY[q.t]+'</span><span>'+(s.none?n0(s.n)+' chọn · '+n0(s.base)+' / '+n0(total)+' người trả lời':n0(s.n)+' / '+n0(total)+' người trả lời')+'</span></div>'+h+'</div>';
}
/* tên phần: VIẾT HOA TOÀN BỘ ⇒ viết hoa đầu câu, giữ chữ viết tắt */
function secName(s){ s=String(s||""); if(s!==s.toUpperCase()) return s; var t=s.toLowerCase().replace(/^phần\s+([a-z0-9]+)([.:\s–-]*)(\S)?/i,function(m,x,sp,c){ return "Phần "+x.toUpperCase()+(sp||"")+(c?c.toUpperCase():""); });
  t=t.replace(/\b(iol|mmh|ppv|migs|kdb)\b/g,function(m){ return m.toUpperCase(); }).replace(/\bphaco\b/g,"Phaco"); return t.charAt(0).toUpperCase()+t.slice(1); }
function secsOf(d){ var o=[]; d.questions.forEach(function(q){ if(q.pii) return; var s=q.sec||"Chung"; if(o.indexOf(s)<0) o.push(s); }); return o; }
function timeline(d, rows){
  if(!rows.length) return "";
  var t0=rows[0][0], t1=rows[rows.length-1][0], span=t1-t0, byHour=span<3*864e5, b={}, keys=[], lab=[];
  var step=byHour?3600e3:864e5, start=new Date(t0); if(byHour) start.setMinutes(0,0,0); else start.setHours(0,0,0,0);
  for(var t=start.getTime(); t<=t1; t+=step){ keys.push(t); var dd0=new Date(t); lab.push(byHour?(dd(t)+" "+p2(dd0.getHours())+"h"):dd(t)); }
  if(keys.length>90){ keys=keys.slice(-90); lab=lab.slice(-90); }
  var vals=keys.map(function(){ return 0; });
  rows.forEach(function(r){ var i=Math.floor((r[0]-keys[0])/step); if(i>=0&&i<vals.length) vals[i]++; });
  var peak=vals.indexOf(Math.max.apply(null,vals));
  return '<div class="panel tl"><h3>Câu trả lời theo '+(byHour?'giờ':'ngày')+'<small>cao nhất '+n0(vals[peak])+' · '+esc(lab[peak])+'</small></h3>'+cols(vals, lab, 120, {aria:"Câu trả lời theo thời gian", w:Math.max(vals.length*16, 760)})+
    '<div class="ax"><span>'+esc(lab[0])+'</span><span>'+esc(lab[lab.length-1])+'</span></div></div>';
}
/* ô số liệu "đồng ý": mỗi câu đồng ý = số người tích / mọi người trả lời (kể cả người trả lời trước khi form có khối đồng ý) */
function consentTiles(d, rows){
  var cq=d.questions.filter(isConsent).slice(0,1);
  if(!cq.length) return '<div class="k"><b class="num">'+n0(d.questions.filter(function(q){ return !q.pii; }).length)+'</b><span>câu hỏi</span></div>';
  return cq.slice(0,2).map(function(q){ var s=statOf(q, rows, d), c=s.opts.reduce(function(a,o){ return Math.max(a,o.c); },0);
    var lb=/nhận thông tin/i.test(q.q)?'đồng ý nhận thông tin từ MMH':'đồng ý xử lý dữ liệu cá nhân';
    return '<button class="k kc" data-q="'+q.k+'" type="button"><b class="num">'+n0(c)+'<small> / '+n0(rows.length)+' · '+pct(c,rows.length)+'</small></b><span>'+lb+'</span></button>'; }).join("");
}
function renderSurvey(){
  var c=DATA[V.id], it=itemOf(V.id);
  if(!c){ var sl=$("slow"), wasShown=sl&&!sl.hidden; $("main").innerHTML=skSurvey(it?it.title:""); if(wasShown) $("slow").hidden=false; return; }
  var d=c.d, rows=rowsOf(d), total=rows.length, secs=secsOf(d);
  var today0=new Date(); today0.setHours(0,0,0,0);
  var nToday=rows.filter(function(r){ return r[0]>=today0.getTime(); }).length, lastA=rows.length?rows[rows.length-1][0]:0;
  var h=backLink()+'<div class="sh"><div><h1>'+esc(d.title)+'</h1><div class="meta"><span class="pill'+(d.accepting?'':' off')+'"><i></i>'+(d.accepting?'Đang nhận câu trả lời':'Đã đóng')+'</span>'+(c.local&&BUSY[V.id]?'<span class="upd" style="margin:0"><span class="spin"></span>Đang cập nhật</span>':'<span>Cập nhật '+esc(ago(c.at)||"vừa xong")+'</span>')+(it?'<button class="pill cat'+(it.canSet?' ed':'')+'" id="s-cat" type="button"'+(it.canSet?' title="Đổi nhóm / sản phẩm"':' disabled')+'>'+esc((GNAME[grpOf(it)]||grpOf(it))+' · '+prodOf(it))+'</button>':'')+(d.src==="sheet"?'<span class="pill off" title="Khảo sát không có Google Form: thống kê đọc thẳng từ file Sheet"><i></i>Từ file Sheet</span>':'')+(d.answers&&d.answers.length?'<span>Thu thập '+esc(spanOf(d.answers))+'</span>':'')+'</div></div>'+
    '<div class="row"><button class="btn'+(it&&it.watch?' on':'')+'" id="s-w" type="button">'+(it&&it.watch?I.bellF+'Đang theo dõi':I.bell+'Theo dõi')+'</button>'+
    '<button class="btn ic" id="s-sh" type="button" aria-label="Chia sẻ tóm tắt" title="Chia sẻ tóm tắt">'+I.share+'</button>'+
    '<button class="btn ic" id="s-r" type="button" aria-label="Tải lại" title="Tải lại">'+I.ref+'</button>'+
    '<button class="btn ic" id="s-more" type="button" aria-label="Thêm" title="Thêm">'+I.dots+'</button></div></div>';
  h+='<div class="kp"><div class="k dk"><b class="num">'+n0(total)+'</b><span>'+(V.F.length?'câu trả lời khớp bộ lọc / '+n0(d.n):'câu trả lời')+'</span></div><div class="k"><b class="num">'+n0(nToday)+'</b><span>hôm nay</span></div>'+
    '<div class="k"><b>'+esc(lastA?ago(lastA):"–")+'</b><span>câu trả lời mới nhất</span></div>'+consentTiles(d, rows)+'</div>';
  if(!d.n){ $("main").innerHTML=h+'<div class="note">Khảo sát chưa có câu trả lời.</div>'; wireSurvey(d); return; }
  if(!d.questions.some(function(q){ return !q.pii; })){ $("main").innerHTML=h+'<div class="note">Chưa nhận ra câu hỏi trong file kết quả (dòng tiêu đề cột khác thường).'+(d.sheetUrl?' <a class="lnk" href="'+esc(d.sheetUrl)+'" target="_blank" rel="noopener">Mở file Sheet</a> để xem trực tiếp.':'')+'</div>'; wireSurvey(d); return; }
  h+=profilePanel(d, rows);
  var ins=insights(d, rows);
  if(ins.length && V.tab==="st") h+='<div class="hl" style="margin-top:6px"><h2>Điểm nổi bật</h2></div><div class="ins">'+ins.map(function(x){
    return '<div class="in" data-q="'+x.q.k+'"><div class="q">'+esc((qno(x.q)?"Câu "+qno(x.q)+" · ":"")+(x.q.grp&&!/^Câu/.test(x.q.q)?short(x.q.q):short(x.q.q)))+'</div><div class="p num">'+pct(x.c,x.n)+'</div><div class="a">'+esc(x.v)+'</div><div class="gb"><i style="width:'+Math.round(x.p)+'%"></i></div></div>'; }).join("")+'</div>';
  h+='<div class="bar2"><div class="row" style="justify-content:space-between"><div class="seg"><button class="'+(V.tab==="st"?'on':'')+'" data-t="st" type="button">Thống kê</button><button class="'+(V.tab==="rs"?'on':'')+'" data-t="rs" type="button">Câu trả lời · '+n0(total)+'</button></div>'+
    '<div class="row"><button class="btn" id="s-f" type="button">'+I.filter+'Lọc'+(V.F.length?' · '+V.F.length:'')+'</button>'+(V.tab==="st"?'<button class="btn" id="s-sort" type="button">'+(UI.sort==="cnt"?'Thứ tự form':'Xếp theo số người')+'</button>':'')+'</div></div>';
  if(V.F.length) h+='<div class="chips">'+V.F.map(function(f,i){ var q=d.questions[f.k]; return '<button class="chip f" data-fx="'+i+'" type="button" title="Bỏ điều kiện này">'+esc(short(q.q).slice(0,40))+': '+esc(f.v.join(" / ").slice(0,50))+'<b>×</b></button>'; }).join("")+'<button class="chip" id="s-fx" type="button">Bỏ hết lọc</button></div>';
  if(V.tab==="st") h+='<div class="chips"><button class="chip'+(V.sec?'':' on')+'" data-s="" type="button">Tất cả</button>'+secs.map(function(s){ return '<button class="chip'+(V.sec===s?' on':'')+'" data-s="'+esc(s)+'" type="button">'+esc(secName(s))+'</button>'; }).join("")+'</div>';
  h+='</div>';
  if(V.tab==="st"){
    var f=nk(V.q), Q=d.questions.filter(function(q){ if(q.pii||isOptIn(q)) return false; if(V.sec && (q.sec||"Chung")!==V.sec) return false; if(f && nk(q.q+" "+(q.grp||"")).indexOf(f)<0) return false; return true; });
    var cur=null, buf='';
    Q.forEach(function(q){ var s=q.sec||"Chung"; if(s!==cur){ if(buf) h+='<div class="qs">'+buf+'</div>'; buf=''; cur=s; var nq=Q.filter(function(x){ return (x.sec||"Chung")===s; }).length; h+='<div class="sect"><h2>'+esc(secName(s))+'</h2><span>'+nq+' câu</span></div>'; } buf+=qCard(q, rows, total, d); });
    if(buf) h+='<div class="qs">'+buf+'</div>';
    if(!Q.length) h+='<div class="note">Không có câu hỏi khớp.</div>';
  } else h+=respHtml(d, rows);
  $("main").innerHTML=h;
  wireSurvey(d);
}
function fmtAns(q, a){
  if(a==null) return "";
  if(q.t==="grid"||q.t==="checkgrid") return q.rows.map(function(r,i){ var v=a[i]; if(v==null||(Array.isArray(v)&&!v.length)) return ""; return r+": "+(Array.isArray(v)?v.join(", "):v); }).filter(Boolean).join(" · ");
  return Array.isArray(a)?a.join("; "):String(a);
}
function respHtml(d, rows){
  var f=nk(V.rq), L=rows.slice().reverse().map(function(r,i){ return {r:r, no:rows.length-i}; });
  if(f) L=L.filter(function(x){ return nk(x.r[1].map(function(a,k){ return fmtAns(d.questions[k], a); }).join(" ")).indexOf(f)>=0; });
  var hq=d.questions.filter(function(q){ return /bệnh viện|phòng khám|cơ sở công tác/i.test(q.q); })[0], nq=d.questions.filter(function(q){ return q.pii && /tên/i.test(q.q); })[0];
  return '<div class="tools" style="margin:6px 0 12px"><input class="inp" id="s-rq" placeholder="Tìm trong câu trả lời (bệnh viện, ý kiến…)" value="'+esc(V.rq)+'"></div><div class="rs">'+L.slice(0,V.lim).map(function(x){
    var a=x.r[1], title=(nq&&a[nq.k])||(hq&&a[hq.k])||("Câu trả lời #"+x.no);
    var items=d.questions.map(function(q){ var v=fmtAns(q, a[q.k]); return v?'<dt>'+esc((q.grp?String(q.grp).replace(/^(Câu\s+\d+).*$/,"$1")+" · ":"")+short(q.q))+'</dt><dd>'+esc(v)+'</dd>':''; }).join("");
    return '<div class="rc"><div class="h"><b>'+esc(title)+'</b><span>#'+x.no+' · '+esc(dt(x.r[0]))+'</span></div><dl>'+items+'</dl></div>';
  }).join("")+'</div>'+(L.length>V.lim?'<div style="text-align:center;margin-top:12px"><button class="btn" id="s-mo" type="button">Xem thêm '+(L.length-V.lim)+'</button></div>':'')+(!L.length?'<div class="note">Không có câu trả lời khớp.</div>':'');
}
function wireSurvey(d){
  $("s-w").onclick=function(){ watch(V.id); };
  $("s-r").onclick=function(){ var b=$("s-r"); b.disabled=true; loadData(V.id, true).then(function(){ toast("Đã cập nhật"); }, function(e){ b.disabled=false; toast(e.message); }); };
  $("s-sh").onclick=function(){ share(d); };
  $("s-more").onclick=function(){
    sheet('<h3>'+esc(d.title)+'</h3><div class="act" style="justify-content:flex-start;flex-direction:column;align-items:stretch">'+
      '<button class="btn" id="m-csv" type="button">'+I.dl+'Tải bảng thống kê (Excel / CSV)</button>'+
      (d.sheetUrl?'<a class="btn" href="'+esc(d.sheetUrl)+'" target="_blank" rel="noopener">Mở file Sheet kết quả</a>':'')+
      (d.editUrl?'<a class="btn" href="'+esc(d.editUrl)+'" target="_blank" rel="noopener">Mở form (sửa)</a>':'')+
      (d.formUrl?'<button class="btn" id="m-cp" type="button">Sao chép link gửi người trả lời</button>':'')+
      ((itemOf(V.id)||{}).canSet?'<button class="btn" id="m-cat" type="button">Đổi nhóm / sản phẩm</button>':'')+
      ((itemOf(V.id)||{}).canDel?'<button class="btn" id="m-rm" type="button">Bỏ khỏi danh sách</button>':'')+'</div><div class="act"><button class="btn dk" data-x="1" type="button">Đóng</button></div>');
    $("m-csv").onclick=function(){ csv(d); closeSheet(); };
    if($("m-cp")) $("m-cp").onclick=function(){ (navigator.clipboard?navigator.clipboard.writeText(d.formUrl):Promise.reject()).then(function(){ toast("Đã sao chép link"); }, function(){ toast(d.formUrl, 6000); }); closeSheet(); };
    if($("m-rm")) $("m-rm").onclick=function(){ removeSurvey(V.id); };
    if($("m-cat")) $("m-cat").onclick=function(){ catSheet(V.id); };
  };
  if($("s-cat")) $("s-cat").onclick=function(){ catSheet(V.id); };
  document.querySelectorAll("[data-t]").forEach(function(b){ b.onclick=function(){ V.tab=b.getAttribute("data-t"); render(); }; });
  document.querySelectorAll("[data-s]").forEach(function(b){ b.onclick=function(){ V.sec=b.getAttribute("data-s"); render(); }; });
  document.querySelectorAll("[data-fx]").forEach(function(b){ b.onclick=function(){ V.F.splice(+b.getAttribute("data-fx"),1); render(); }; });
  document.querySelectorAll("[data-tx]").forEach(function(b){ b.onclick=function(){ V["tx"+b.getAttribute("data-tx")]=1; render(); }; });
  document.querySelectorAll(".in[data-q],.kc[data-q]").forEach(function(b){ b.onclick=function(){ var e=$("q"+b.getAttribute("data-q")); if(e) e.scrollIntoView({behavior:"smooth", block:"center"}); }; });
  if($("s-fx")) $("s-fx").onclick=function(){ V.F=[]; render(); };
  if($("s-f")) $("s-f").onclick=function(){ filterSheet(d); };
  if($("s-sort")) $("s-sort").onclick=function(){ UI.sort=UI.sort==="cnt"?"form":"cnt"; ls(LS_UI, UI); render(); };
  if($("s-mo")) $("s-mo").onclick=function(){ V.lim+=20; render(); };
  var rq=$("s-rq"); if(rq) rq.oninput=function(){ var p=rq.selectionStart; V.rq=rq.value; render(); var r2=$("s-rq"); if(r2){ r2.focus(); try{ r2.setSelectionRange(p,p); }catch(_){} } };
  wireTips($("main"));
}
function filterSheet(d){
  var fq=d.questions.filter(function(q){ return (q.t==="radio"||q.t==="checkbox"||q.t==="scale") && q.opts.length && !isOptIn(q); });
  function fopts(x){ return isConsent(x)?x.opts.concat([NONE]):x.opts; }
  var sel=fq[0]?fq[0].k:null;
  function paint(){
    var q=d.questions[sel], cur=(V.F.filter(function(f){ return f.k===sel; })[0]||{v:[]}).v;
    sheet('<h3>Lọc người trả lời</h3><p>Chỉ thống kê những người chọn các câu trả lời dưới đây. Nhiều điều kiện = thoả tất cả.</p>'+
      '<select class="inp" id="f-q">'+fq.map(function(x){ return '<option value="'+x.k+'"'+(x.k===sel?' selected':'')+'>'+esc((qno(x)?"Câu "+qno(x)+" · ":"")+short(x.q)).slice(0,90)+'</option>'; }).join("")+'</select>'+
      '<div style="margin-top:8px">'+fopts(q).map(function(o,i){ return '<label class="ck"><input type="checkbox" value="'+i+'"'+(cur.indexOf(o)>=0?' checked':'')+'><span>'+esc(o)+'</span></label>'; }).join("")+'</div>'+
      '<div class="act"><button class="btn" data-x="1" type="button">Huỷ</button><button class="btn dk" id="f-ok" type="button">Áp dụng</button></div>');
    $("f-q").onchange=function(){ sel=+this.value; paint(); };
    $("f-ok").onclick=function(){
      var vals=[].slice.call(document.querySelectorAll(".ck input:checked")).map(function(x){ return fopts(q)[+x.value]; });
      V.F=V.F.filter(function(f){ return f.k!==sel; }); if(vals.length) V.F.push({k:sel, v:vals});
      closeSheet(); render();
    };
  }
  if(sel==null){ toast("Khảo sát không có câu để lọc"); return; } paint();
}
function share(d){
  var rows=rowsOf(d), ins=insights(d, rows);
  var txt="Customer Survey · "+d.title+"\n"+n0(rows.length)+" câu trả lời"+(V.F.length?" (đang lọc)":"")+"\n\n"+ins.map(function(x){ return "• "+(qno(x.q)?"Câu "+qno(x.q)+" · ":"")+short(x.q.q)+": "+x.v+" ("+pct(x.c,x.n)+")"; }).join("\n")+"\n\n"+location.href.split("#")[0]+"#s="+encodeURIComponent(d.id);
  if(navigator.share) navigator.share({title:"Customer Survey · "+d.title, text:txt}).catch(function(){});
  else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("Đã sao chép tóm tắt — dán vào Zalo / email"); }, function(){ toast("Chưa sao chép được"); });
}
function removeSurvey(id){
  var it=itemOf(id); if(!it) return;
  sheet('<h3>Bỏ khỏi danh sách?</h3><p>'+esc(it.title)+'</p><p class="sm">Chỉ ẩn khỏi Customer Survey. Form và file kết quả trên Google Drive giữ nguyên, thêm lại bằng link bất cứ lúc nào.</p><div class="act"><button class="btn" data-x="1" type="button">Huỷ</button><button class="btn dk" id="rm-ok" type="button">Bỏ khỏi danh sách</button></div>');
  $("rm-ok").onclick=function(){ closeSheet(); LIST=LIST.filter(function(x){ return x.id!==id; }); location.hash="#";
    api("rsRemove",{id:id}).then(function(d){ if(!d||!d.ok){ toast((d&&d.error)||"Chưa bỏ được"); loadList(true); } }); };
}
function csv(d){
  var rows=rowsOf(d), total=rows.length, out=[["Phần","Câu hỏi","Lựa chọn","Số người","% người trả lời câu này","Số người trả lời câu này","Tổng người trả lời"]];
  d.questions.forEach(function(q){
    if(q.pii||isOptIn(q)) return;
    var s=statOf(q, rows, d), title=(q.grp?q.grp+" · ":"")+q.q, bs=s.base||s.n;
    if(s.opts.length){ s.opts.forEach(function(o){ out.push([q.sec||"", title, o.v, o.c, pct(o.c,bs), bs, total]); }); if(s.none) out.push([q.sec||"", title, NONE, s.none, pct(s.none,bs), bs, total]); }
    else if(s.rows) s.rows.forEach(function(r){ q.cols.forEach(function(c){ out.push([q.sec||"", title+" ["+r.r+"]", c, r.c[c], pct(r.c[c],r.n), r.n, total]); }); });
    else (s.texts||[]).forEach(function(t){ out.push([q.sec||"", title, t.v, t.c, "", s.n, total]); });
  });
  var txt="﻿"+out.map(function(r){ return r.map(function(v){ v=String(v==null?"":v); return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }).join(","); }).join("\r\n");
  var a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"text/csv;charset=utf-8"}));
  var fn=d.title.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^\x20-\x7E]+/g,"-").replace(/[\\/:*?"<>|&]+/g," ").replace(/\s+/g," ").trim();
  a.download="Customer Survey - "+fn.slice(0,80)+(V.F.length?" (loc)":"")+".csv"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

/* ═════════ khởi động ═════════ */
function start(){
  instBtn();
  if(!API){ $("main").innerHTML='<div class="note err">App chưa được nối máy chủ.</div>'; return; }
  if(!auth()){ gate(); return; }
  var a=auth(), uc=$("uc"); uc.hidden=false; uc.textContent=initials(a.user.pic); uc.title=a.user.pic; uc.onclick=account;
  $("fab").hidden=!!V.id;
  try{ var cl=JSON.parse(localStorage.getItem(LS_LIST)||"null"); if(cl && cl.items && cl.pic===a.user.pic && !LIST){ LIST=cl.items; ME=cl.me; OWNER=cl.owner||OWNER; CATS=cl.cats; HUB=cl.hub||""; LISTAT=cl.at||1; cl.items.forEach(function(it){ PREV[it.id]=it.n; }); bell(); } }catch(_){}
  if(LIST) route(); else render();
  loadList().then(function(){ route(); startPoll(); }, function(e){ if(auth()){ $("main").innerHTML='<div class="note err">Không đọc được khảo sát: '+esc(e.message)+'</div><p><button class="btn" id="retry" type="button">Thử lại</button></p>'; var r=$("retry"); if(r) r.onclick=start; } });
}
$("bell").onclick=function(e){ e.stopPropagation(); bellPop(); };
$("inst").onclick=install;
$("fab").onclick=addSheet;
start();
})();
