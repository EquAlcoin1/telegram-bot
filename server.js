// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ====== تنظیمات از متغیرهای محیطی ======
const TOKEN = process.env.TOKEN || "8032373080:AAEXxhTJL7EXyNbamzSvRQXAcMfXdKMtnDw"; // توکن ربات (از BotFather)
const BOT_USERNAME = process.env.BOT_USERNAME || "EquAl_coin_Bot"; // یوزرنیم ربات بدون @
const WEBAPP_URL = process.env.WEBAPP_URL || "https://telegram-bot-u18i.onrender.com"; // آدرس عمومی وب‌اپ
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@Livetrad1"; // یوزرنیم کانال (با @)

// اطمینان از توکن
if (!TOKEN) {
  console.error("ERROR: TOKEN environment variable is required");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// فایل داده محلی
const DATA_FILE = path.join(__dirname, "data.json");
let users = {};
if (fs.existsSync(DATA_FILE)) {
  try { users = JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e){ users = {}; }
}
function saveData(){ fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2)); }

// کوین و رفرال
function addCoins(userId, amount){
  if (!users[userId]) users[userId] = { coins: 0, referrals: [] };
  users[userId].coins += Number(amount||0);
  saveData();
}
function addReferral(inviterId, newUserId){
  if (!users[inviterId]) users[inviterId] = { coins: 0, referrals: [] };
  if (!users[inviterId].referrals.includes(newUserId)) {
    users[inviterId].referrals.push(newUserId);
    addCoins(inviterId, 3); // پاداش مستقیم
    // اگر زیرمجموعه‌های اون تکمیل شد، پاداش اضافه
    if (users[newUserId]?.referrals?.length >= 3) addCoins(inviterId, 4);
  }
}

// ====== هندل /start ======
bot.onText(/\/start(?:\s+(\d+))?/, (msg, match) => {
  const chatId = String(msg.chat.id);
  const inviterId = match && match[1] ? String(match[1]) : null;

  if (!users[chatId]) {
    users[chatId] = { coins: 0, referrals: [] };
    saveData();
    if (inviterId && inviterId !== chatId) addReferral(inviterId, chatId);
  }

  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${chatId}`;
  const webLink =`${WEBAPP_URL}/?userId=${chatId}`;

  // متن پیام + دکمه URL برای باز کردن وب‌اپ
  const text = `سلام ${msg.chat.first_name || ''}! 👋\nتو الان ${users[chatId].coins} کوین داری.\n\nلینک دعوت اختصاصی تو:\n${inviteLink}\n\nبرای دیدن کیف‌پول و تکسک‌ها وب‌اپ رو باز کن:`;
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

// ====== چک عضویت در کانال (command /check) ======
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
    console.error(e);
    bot.sendMessage(chatId, "⚠️ خطا در بررسی عضویت (احتمالاً یوزرنیم کانال درست نیست یا ربات دسترسی ندارد).");
  }
});

// ====== API برای فرانت‌اند ======
app.get("/api/balance", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });
  res.json({ ok: true, coins: users[userId]?.coins || 0, referrals: users[userId]?.referrals || [] });
});

// سرو محتوای فرانت‌اند (پوشه frontend)
app.use(express.static(__dirname));

// ====== استارت سرور ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT} (PORT=${PORT})`);
  console.log("🤖 Bot started (polling) ...");
});





