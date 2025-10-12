// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ====== تنظیمات ======
const TOKEN = process.env.TOKEN || "8032373080:AAEXxhTJL7EXyNbamzSvRQXAcMfXdKMtnDw";
const BOT_USERNAME = process.env.BOT_USERNAME || "EquAl_coin_Bot";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://telegram-bot-u18i.onrender.com";
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@Livetrad1"; // 👈 حتما با @

const bot = new TelegramBot(TOKEN, { polling: true });

// ====== فایل داده ======
const DATA_FILE = path.join(__dirname, "data.json");
let users = {};
if (fs.existsSync(DATA_FILE)) {
  try { users = JSON.parse(fs.readFileSync(DATA_FILE)); } catch { users = {}; }
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2)); }

// ====== توابع ======
function addCoins(userId, amount) {
  if (!users[userId]) users[userId] = { coins: 0, referrals: [], username: "", name: "" };
  users[userId].coins += Number(amount || 0);
  saveData();
}

function addReferral(inviterId, newUser) {
  if (!users[inviterId]) users[inviterId] = { coins: 0, referrals: [], username: "", name: "" };

  const displayName = newUser.username
    ? `@${newUser.username}`
    : (newUser.first_name || "Unknown");

  if (!users[inviterId].referrals.some(r => r.id === newUser.id)) {
    users[inviterId].referrals.push({ id: newUser.id, name: displayName });
    addCoins(inviterId, 3); // پاداش دعوت مستقیم
  }

  saveData();
}

// ====== /start ======
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = String(msg.chat.id);
  const inviterId = match && match[1] ? String(match[1]) : null;

  if (!users[chatId]) {
    users[chatId] = {
      coins: 0,
      referrals: [],
      username: msg.from.username || "",
      name: msg.from.first_name || ""
    };
    saveData();

    if (inviterId && inviterId !== chatId) addReferral(inviterId, msg.from);
  }

  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${chatId}`;
  const webLink = `${WEBAPP_URL}/?userId=${chatId}`;

  const text = `سلام ${msg.chat.first_name || ''}! 👋
تو الان ${users[chatId].coins} کوین داری 💰

🔗 لینک دعوت اختصاصی:
${inviteLink}

🌐 برای دیدن کیف‌پول و تسک‌ها وب‌اپ رو باز کن👇`;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Open Web App", url: webLink }],
        [{ text: "👥 Invite Friends", url: inviteLink }]
      ]
    }
  });
});

// ====== بررسی عضویت در کانال ======
app.get("/verifyJoin", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ ok: false, message: "userId required" });

  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      addCoins(userId, 5);
      return res.json({ ok: true, message: "Joined! +5 coins added" });
    } else {
      return res.json({ ok: false, message: "User not joined" });
    }
  } catch (err) {
    console.error("verifyJoin error:", err.message);
    return res.json({ ok: false, message: "Error verifying join" });
  }
});

// ====== گرفتن اطلاعات کاربر برای وب‌اپ ======
app.get("/api/balance", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ ok: false, message: "userId required" });

  const user = users[userId] || { coins: 0, referrals: [] };
  res.json({ ok: true, coins: user.coins, referrals: user.referrals });
});

// ====== سرو فایل‌های استاتیک ======
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.htmL")); // 👈 اصلاح‌شده (نه htmL)
});

// ====== اجرای سرور ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🤖 Bot started...");
});










