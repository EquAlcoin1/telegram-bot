// server.js (اصلاح‌شده: یک‌بارگی پاداش‌ها + نمایش نام/یوزرنیم referrals + index.html fix)
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ====== تنظیمات ======
const TOKEN = "8032373080:AAEXxhTJL7EXyNbamzSvRQXAcMfXdKMtnDw"; // توکن ربات شما
const BOT_USERNAME = "EquAl_coin_Bot"; // یوزرنیم ربات (بدون @)
const WEBAPP_URL = "https://telegram-bot-u18i.onrender.com"; // آدرس وب‌اپ شما
const CHANNEL_USERNAME = "@Livetrad1"; // یوزرنیم کانال با @

// ====== ربات (polling) ======
const bot = new TelegramBot(TOKEN, { polling: true });

// ====== فایل داده ======
const DATA_FILE = path.join(__dirname, "data.json");
let users = {};
if (fs.existsSync(DATA_FILE)) {
  try { users = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { users = {}; }
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2)); }

// ====== توابع پایه ======
function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      coins: 0,
      referrals: [],
      joinedReward: false,      // برای پاداش کانال (یک‌بار)
      twitterRewarded: false,   // برای پاداش توییتر (یک‌بار)
      username: null,
      first_name: null,
      last_name: null
    };
  }
  return users[userId];
}

function addCoins(userId, amount) {
  ensureUser(userId);
  users[userId].coins = (Number(users[userId].coins) || 0) + Number(amount || 0);
  saveData();
}

// newUserObj should be { id, username, first_name, last_name }
function addReferral(inviterId, newUserObj) {
  ensureUser(inviterId);
  const exists = users[inviterId].referrals.some(r => String(r.id) === String(newUserObj.id));
  if (!exists) {
    // ذخیرهٔ شیء کامل برای نمایش نام/یوزرنیم در فرانت
    users[inviterId].referrals.push({
      id: String(newUserObj.id),
      username: newUserObj.username || null,
      first_name: newUserObj.first_name || null,
      last_name: newUserObj.last_name || null
    });
    addCoins(inviterId, 3); // پاداش دعوت مستقیم

    // اگر زیرمجموعه‌های این newUser در دیتابیس خودش 3 تا داشت => پاداش اضافه (قواعد توی کد قبلی حفظ شد)
    const newUserStore = users[String(newUserObj.id)] || { referrals: [] };
    if ((newUserStore.referrals || []).length >= 3) {
      addCoins(inviterId, 4);
    }
    saveData();
  }
}

// ====== /start ======
bot.onText(/\/start(?:\s+(\d+))?/, (msg, match) => {
  const chatId = String(msg.chat.id);
  const inviterId = match && match[1] ? String(match[1]) : null;

  // اطمینان از وجود کاربر و ذخیره اطلاعات پروفایل برای نمایش در referrals دیگران
  ensureUser(chatId);
  users[chatId].username = msg.from?.username || users[chatId].username || null;
  users[chatId].first_name = msg.from?.first_name || users[chatId].first_name || null;
  users[chatId].last_name = msg.from?.last_name || users[chatId].last_name || null;
  saveData();

  // اگر با لینک دعوت اومده باشه، ثبت زیرمجموعه به شکل شیء با نام/یوزرنیم
  if (inviterId && inviterId !== chatId) {
    const newUserObj = {
      id: chatId,
      username: msg.from?.username || null,
      first_name: msg.from?.first_name || null,
      last_name: msg.from?.last_name || null
    };
    addReferral(inviterId, newUserObj);
  }

  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${chatId}`;
  const webLink = `${WEBAPP_URL}/?userId=${chatId}`;

  const text = `سلام ${msg.chat.first_name || ""}! 👋
تو الان ${users[chatId].coins} کوین داری.

🔗 لینک دعوت اختصاصی تو:
${inviteLink}

برای دیدن کیف‌پول و تسک‌ها وب‌اپ رو باز کن:`;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Web App", url: webLink }],
        [{ text: "Click to invite", url: inviteLink }]
      ]
    }
  };
  bot.sendMessage(chatId, text, opts);
});

// ====== چک عضویت در کانال (/check) — یک‌بارگی پاداش ======
bot.onText(/\/check/, async (msg) => {
  const chatId = String(msg.chat.id);
  ensureUser(chatId);

  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, chatId);

    if (["member", "administrator", "creator"].includes(member.status)) {
      if (users[chatId].joinedReward) {
        bot.sendMessage(chatId, "✅ تو الان عضو کانال هستی — قبلاً پاداش عضویت رو دریافت کردی.");
      } else {
        addCoins(chatId, 5);
        users[chatId].joinedReward = true;
        saveData();
        bot.sendMessage(chatId, "🎉 تبریک! ۵ کوین بابت عضویت در کانال دریافت کردی.");
      }
    } else {
      bot.sendMessage(chatId, "❌ هنوز عضو کانال نیستی. اول عضو شو و بعد /check رو بزن.");
    }
  } catch (e) {
    console.error("check error:", e);
    bot.sendMessage(chatId, "⚠️ خطا در بررسی عضویت؛ مطمئن شو ربات ادمین کانال هست و یوزرنیم کانال درست تنظیم شده.");
  }
});

// ====== API‌ها ======

// موجودی و لیست زیرمجموعه‌ها (referrals به‌صورت آرایهٔ اشیاء)
app.get("/api/balance", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  const u = users[userId] || { coins: 0, referrals: [] };
  return res.json({ ok: true, coins: u.coins || 0, referrals: u.referrals || [] });
});

// ساخت لینک دعوت
app.post("/api/generate-invite", (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${userId}`;
  return res.json({ ok: true, inviteLink });
});

// پاداش توییتر — فقط یک‌بار برای هر کاربر
app.post("/api/twitter-reward", (req, res) => {
  const userId = String(req.body.userId);
  if (!userId) return res.json({ ok: false, message: "userId required" });
  ensureUser(userId);
  if (users[userId].twitterRewarded) {
    return res.json({ ok: false, message: "already rewarded" });
  }
  users[userId].twitterRewarded = true;
  addCoins(userId, 3);
  return res.json({ ok: true, coins: users[userId].coins });
});

// verify-join از فرانت (یک‌بارگی پاداش)
app.post("/api/verify-join", async (req, res) => {
  const userId = String(req.body.userId);
  if (!userId) return res.json({ ok: false, message: "userId required" });
  ensureUser(userId);

  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      if (users[userId].joinedReward) {
        return res.json({ ok: true, message: "already rewarded", coins: users[userId].coins });
      } else {
        users[userId].joinedReward = true;
        addCoins(userId, 5);
        return res.json({ ok: true, message: "rewarded", coins: users[userId].coins });
      }
    } else {
      return res.json({ ok: false, message: "not a member" });
    }
  } catch (e) {
    console.error("verify-join error:", e);
    return res.json({ ok: false, message: "error verifying join" });
  }
});

// ====== سرو فایل‌های فرانت‌اند ======
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.htmL")); // اصلاح نام فایل
});

// ====== اجرا ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("🤖 Bot started...");
});
