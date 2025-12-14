// ====== تنظیمات ======
const API_ROOT = 'https://telegram-bot-u18i.onrender.com';

function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

// ====== گرفتن userId (استاندارد تلگرام + fallback لینک) ======
let CURRENT_USER_ID = null;

// 1️⃣ گرفتن از Telegram WebApp (دکمه Start آبی)
if (window.Telegram && window.Telegram.WebApp) {
  const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
  if (tgUser && tgUser.id) {
    CURRENT_USER_ID = tgUser.id.toString();
  }
  window.Telegram.WebApp.ready();
}

// 2️⃣ fallback برای لینک قدیمی (?userId=)
if (!CURRENT_USER_ID) {
  CURRENT_USER_ID = qs('userId');
}

// ====== المنت‌ها ======
const coinValueEl = document.getElementById('coinValue');
const referralCountEl = document.getElementById('referralCount');
const referralListDesc = document.getElementById('referralListDesc');
const twitterBtn = document.getElementById('twitterBtn');
const inviteBtn = document.getElementById('inviteBtn');
const joinBtn = document.getElementById('joinBtn');
const verifyJoinBtn = document.getElementById('verifyJoinBtn');

// ====== صفحه‌بندی ======
const screens = {
  homeScreen: document.getElementById('homeScreen'),
  tasksScreen: document.getElementById('tasksScreen'),
  soonScreen: document.getElementById('soonScreen')
};
const navButtons = document.querySelectorAll('.nav-btn');

function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  if (screens[id]) screens[id].classList.remove('hidden');
  navButtons.forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-target') === id)
  );
}

navButtons.forEach(b =>
  b.addEventListener('click', () => showScreen(b.getAttribute('data-target')))
);

showScreen('homeScreen');

// ====== بروزرسانی اطلاعات ======
async function refresh() {
  if (!CURRENT_USER_ID) {
    coinValueEl.textContent = '0';
    if (referralCountEl) referralCountEl.textContent = '0';
    if (referralListDesc) referralListDesc.textContent = 'Open the bot link first.';
    return;
  }

  try {
    const res = await fetch(
      `${API_ROOT}/api/balance?userId=${encodeURIComponent(CURRENT_USER_ID)}`
    );
    const j = await res.json();

    if (j.ok) {
      const prev = Number(coinValueEl.textContent || 0);
      const next = Number(j.coins || 0);
      coinValueEl.textContent = next;

      if (next > prev) {
        coinValueEl.style.transform = 'scale(1.06)';
        setTimeout(() => (coinValueEl.style.transform = ''), 220);
      }

      if (referralCountEl)
        referralCountEl.textContent = (j.referrals && j.referrals.length) || 0;

      if (j.referrals && j.referrals.length > 0) {
        const names = j.referrals.map(r => {
          if (typeof r === 'string') return r;
          if (r.username) return '@' + r.username;
          if (r.first_name && r.last_name)
            return `${r.first_name} ${r.last_name}`;
          if (r.first_name) return r.first_name;
          return 'Unknown';
        });
        if (referralListDesc) referralListDesc.textContent = names.join(', ');
      } else {
        if (referralListDesc)
          referralListDesc.textContent = 'No referrals yet.';
      }
    } else {
      console.warn('balance API error:', j);
    }
  } catch (err) {
    console.error('Failed to fetch balance:', err);
  }
}

// ====== دکمه توییتر ======
if (twitterBtn) {
  twitterBtn.addEventListener('click', () => {
    setTimeout(async () => {
      if (!CURRENT_USER_ID) return alert('Open bot link first.');
      try {
        const r = await fetch(`${API_ROOT}/api/twitter-reward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: CURRENT_USER_ID })
        });
        const j = await r.json();
        if (j.ok) {
          refresh();
          twitterBtn.textContent = 'Done ✅';
          twitterBtn.disabled = true;
        } else {
          alert('Twitter reward: ' + (j.message || 'error'));
        }
      } catch (err) {
        console.error(err);
      }
    }, 10000);
  });
}

// ====== دکمه دعوت ======
if (inviteBtn) {
  inviteBtn.addEventListener('click', async () => {
    if (!CURRENT_USER_ID) return alert('Open bot link first.');
    try {
      const r = await fetch(`${API_ROOT}/api/generate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const j = await r.json();
      if (j.ok && j.inviteLink) {
        await navigator.clipboard.writeText(j.inviteLink);
        alert('Invite link copied to clipboard!');
      } else {
        alert('Failed to generate invite link.');
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// ====== دکمه Verify کانال ======
if (verifyJoinBtn) {
  verifyJoinBtn.addEventListener('click', async () => {
    if (!CURRENT_USER_ID) return alert('Open bot link first.');

    try {
      const r = await fetch(`${API_ROOT}/api/verify-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const j = await r.json();

      if (j.ok) {
        alert('✅ Verified — coins added.');
        refresh();
        verifyJoinBtn.textContent = 'Verified ✅';
        verifyJoinBtn.disabled = true;
      } else {
        alert('❌ ' + (j.message || 'Not verified.'));
      }
    } catch (err) {
      console.error('verify-join error:', err);
      alert('Error verifying join.');
    }
  });
}

// ====== شروع ======
refresh();
