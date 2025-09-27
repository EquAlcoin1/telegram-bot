
// script.js (فرانت — نسخه کامل و اصلاح‌شده)

// ====== تنظیمات ======
const API_ROOT = ''; // اگر سرور روی آدرس دیگری است اینو تغییر بده، مثلا 'http://localhost:3000'

function qs(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

// CURRENT_USER_ID از query string
let CURRENT_USER_ID = qs('userId') || null;
const INVITE_PARAM = qs('invite') || null;

// ====== المان‌ها ======
const coinValueEl = document.getElementById('coinValue');
const referralCountEl = document.getElementById('referralCount');
const referralListDesc = document.getElementById('referralListDesc');

const twitterBtn = document.getElementById('twitterBtn');
const inviteBtn = document.getElementById('inviteBtn');
const joinBtn = document.getElementById('joinBtn');
const verifyJoinBtn = document.getElementById('verifyJoinBtn');

// ====== صفحه‌بندی (nav) ======
const screens = {
  homeScreen: document.getElementById('homeScreen'),
  tasksScreen: document.getElementById('tasksScreen'),
  soonScreen: document.getElementById('soonScreen')
};
const navButtons = document.querySelectorAll('.nav-btn');

function showScreen(id){
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  if(screens[id]) screens[id].classList.remove('hidden');
  navButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-target') === id));
}
navButtons.forEach(b => b.addEventListener('click', ()=> showScreen(b.getAttribute('data-target'))));
showScreen('homeScreen');

// ====== درخواست‌ها و بروزرسانی UI ======
async function refresh(){
  if(!CURRENT_USER_ID){
    coinValueEl.textContent = '0';
    if(referralCountEl) referralCountEl.textContent = '0';
    if(referralListDesc) referralListDesc.textContent = 'Open the bot and click the web link to auto-fill your ID.';
    return;
  }

  try{
    const res = await fetch(`${API_ROOT}/api/balance?userId=${encodeURIComponent(CURRENT_USER_ID)}`);
    const j = await res.json();
    if(j.ok){
      coinValueEl.textContent = j.coins ?? 0;
      if(referralCountEl) referralCountEl.textContent = (j.referrals && j.referrals.length) || 0;
      if(referralListDesc) referralListDesc.textContent = (j.referrals && j.referrals.join(', ')) || 'No referrals yet.';
    }else{
      console.warn('balance API error:', j);
    }
  }catch(err){
    console.error('Failed to fetch balance:', err);
  }
}

// پذیرش دعوت (اگر لینک با ?invite باز بشه)
(function tryAcceptInvite(){
  const visitorId = qs('visitorId') || null;
  if(INVITE_PARAM && visitorId){
    fetch(`${API_ROOT}/accept-invite?invite=${encodeURIComponent(INVITE_PARAM)}&visitorId=${encodeURIComponent(visitorId)}`)
      .then(r=>r.json())
      .then(j=>{
        console.log('accept-invite result:', j);
        setTimeout(refresh, 500);
      })
      .catch(e=>console.error('accept-invite error:', e));
  }
})();

// initial refresh
refresh();

// ====== توییتر: باز کن + بعد 10 ثانیه پاداش ======
if(twitterBtn){
  twitterBtn.addEventListener('click', ()=>{
    setTimeout(async ()=>{
      if(!CURRENT_USER_ID){
        alert('Please open this web UI from the link sent by the bot so we know your userId.');
        return;
      }
      try{
        const r = await fetch(`${API_ROOT}/api/twitter-reward`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ userId: CURRENT_USER_ID })
        });
        const j = await r.json();
        if(j.ok) {
          refresh();
          twitterBtn.textContent = 'Done ✅';
          twitterBtn.disabled = true;
        } else {
          alert('Twitter reward: ' + (j.message || 'error'));
        }
      }catch(err){
        console.error('twitter-reward error:', err);
        alert('Failed to contact server for twitter reward.');
      }
    }, 10000); // 10s delay
  });
}

// ====== دعوت: ساخت لینک دعوت ======
if(inviteBtn){
  inviteBtn.addEventListener('click', async ()=>{
    if(!CURRENT_USER_ID) return alert('Open this page from the link sent by the bot so we know your userId.');
    try{
      const r = await fetch(`${API_ROOT}/api/generate-invite`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const j = await r.json();
      if(j.ok && j.inviteLink){
        await navigator.clipboard.writeText(j.inviteLink);
        alert('Invite link copied to clipboard!');
      } else {
        alert('Failed to generate invite link.');
      }
    }catch(err){
      console.error('generate-invite error:', err);
      alert('Error generating invite link.');
    }
  });
}

// ====== Join channel: Verify ======
if(verifyJoinBtn){
  verifyJoinBtn.addEventListener('click', async ()=>{
    if(!CURRENT_USER_ID) return alert('Open this page from the link sent by the bot so we know your userId.');
    try{
      const r = await fetch(`${API_ROOT}/api/verify-join`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const j = await r.json();
      if(j.ok){
        alert('Verified — coins added.');
        refresh();
        verifyJoinBtn.textContent = 'Verified ✅';
        verifyJoinBtn.disabled = true;
      } else {
        alert('Not verified: ' + (j.message || ''));
      }
    }catch(err){
      console.error('verify-join error:', err);
      alert('Error verifying join.');
    }
  });
}
