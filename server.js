// server.js (نسخه نهایی اصلاح‌شده)
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

// ====== ساخت ربات ======
const bot = new TelegramBot(TOKEN, { polling: true });

// ====== فایل داده ======
const DATA_FILE = path.join(__dirname, "data.json");
let users = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    users = {};
  }
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// ====== توابع پایه ======
function ensureUser(userId) {
  if (!users[userId]) users[userId] = { coins: 0, referrals: [] };
  return users[userId];
}

function addCoins(userId, amount) {
  ensureUser(userId);
  users[userId].coins = (users[userId].coins || 0) + Number(amount || 0);
  saveData();
}

function addReferral(inviterId, newUserObj) {
  ensureUser(inviterId);
  const exists = users[inviterId].referrals.some(r => String(r.id) === String(newUserObj.id));
  if (!exists) {
    users[inviterId].referrals.push(newUserObj);
    addCoins(inviterId, 3);
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

  ensureUser(chatId);

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

// ====== چک عضویت در کانال (/check) ======
bot.onText(/\/check/, async (msg) => {
  const chatId = String(msg.chat.id);
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, chatId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      addCoins(chatId, 5);
      bot.sendMessage(chatId, "✅ عضو کانال هستی — 5 کوین اضافه شد!");
    } else {
      bot.sendMessage(chatId, "❌ هنوز عضو کانال نیستی.");
    }
  } catch (e) {
    console.error("check error:", e);
    bot.sendMessage(chatId, "⚠️ خطا در بررسی عضویت. مطمئن شو ربات ادمین کانال هست و یوزرنیم کانال درسته.");
  }
});

// ====== API‌ها ======

// موجودی و لیست زیرمجموعه‌ها
app.get("/api/balance", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  const u = users[userId] || { coins: 0, referrals: [] };
  res.json({ ok: true, coins: u.coins, referrals: u.referrals });
});

// ساخت لینک دعوت
app.post("/api/generate-invite", (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${userId}`;
  res.json({ ok: true, inviteLink });
});

// پاداش توییتر (نمونه ساده)
app.post("/api/twitter-reward", (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  addCoins(userId, 3);
  res.json({ ok: true, coins: users[userId].coins });
});

// بررسی عضویت در کانال
app.post("/api/verify-join", async (req, res) => {
  const userId = String(req.body.userId);
  if (!userId) return res.json({ ok: false, message: "userId required" });
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      addCoins(userId, 5);
      return res.json({ ok: true, coins: users[userId].coins });
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
  res.sendFile(path.join(__dirname, "index.htmL"));
});

// ====== استارت ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("🤖 Bot started...");
});
