// server.js — FINAL (Clean Welcome + Glass Buttons + Safe Logic)

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(bodyParser.json());

// ====== CONFIG ======
const TOKEN = "8273341450:AAE-Sr9YZvxip2aAYvMdAy8IUatr1qvEUJ4";
const BOT_USERNAME = "EquAl_coinbot";
const WEBAPP_URL = "https://telegram-bot-u18i.onrender.com";
const CHANNEL_USERNAME = "@Livetrad1";

// ====== BOT ======
const bot = new TelegramBot(TOKEN, { polling: true });

// ====== DATA ======
const DATA_FILE = path.join(__dirname, "data.json");
let users = {};
if (fs.existsSync(DATA_FILE)) {
  try { users = JSON.parse(fs.readFileSync(DATA_FILE)); } catch {}
}
const saveData = () =>
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

function ensureUser(id) {
  if (!users[id]) {
    users[id] = {
      coins: 0,
      referrals: [],
      joinedReward: false,
      twitterRewarded: false,
      username: null,
      first_name: null,
      last_name: null
    };
  }
  return users[id];
}

function addCoins(id, n) {
  ensureUser(id);
  users[id].coins += Number(n || 0);
  saveData();
}

function addReferral(inviterId, newUser) {
  ensureUser(inviterId);
  const exists = users[inviterId].referrals.some(r => r.id === newUser.id);
  if (!exists) {
    users[inviterId].referrals.push(newUser);
    addCoins(inviterId, 3);
    saveData();
  }
}

// ====== /start ======

bot.onText(/\/start(?:\s+(\d+))?/, (msg, match) => {
  const chatId = String(msg.chat.id);
  const inviterId = match && match[1] ? String(match[1]) : null;

  // اطمینان از وجود کاربر
  ensureUser(chatId);

  // ذخیره اطلاعات پروفایل کاربر
  users[chatId].username = msg.from?.username || users[chatId].username || null;
  users[chatId].first_name = msg.from?.first_name || users[chatId].first_name || null;
  users[chatId].last_name = msg.from?.last_name || users[chatId].last_name || null;
  saveData();

  // ثبت زیرمجموعه اگر با لینک دعوت آمده
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
  const webLink = `${WEBAPP_URL}/`;

  const text = `Welcome to EquAL Coin 👋

This is a community-driven project built together with YOU.
Your activity, support, and participation shape the future of EquAL.

💰 Maximum coins you can earn from this bot: 20

Please take a moment to explore the project goals
and complete the tasks to start earning rewards.`;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "▶ Start", web_app: { url: webLink } }],
        [{ text: "🤝 Invite Friends", url: inviteLink }]
      ]
    }
  };

  bot.sendMessage(chatId, text, opts);
});


// ====== VERIFY CHANNEL (API) ======
app.post("/api/verify-join", async (req, res) => {
  const userId = String(req.body.userId);
  if (!userId) return res.json({ ok: false });

  ensureUser(userId);

  try {
    const m = await bot.getChatMember(CHANNEL_USERNAME, userId);
    if (["member", "administrator", "creator"].includes(m.status)) {
      if (!users[userId].joinedReward) {
        users[userId].joinedReward = true;
        addCoins(userId, 5);
      }
      return res.json({ ok: true, coins: users[userId].coins });
    }
    res.json({ ok: false, message: "not member" });
  } catch {
    res.json({ ok: false, message: "error" });
  }
});

// ====== API ======
app.get("/api/balance", (req, res) => {
  const u = users[req.query.userId] || { coins: 0, referrals: [] };
  res.json({ ok: true, coins: u.coins, referrals: u.referrals });
});

app.post("/api/generate-invite", (req, res) => {
  res.json({
    ok: true,
    inviteLink: `https://t.me/${BOT_USERNAME}?start=${req.body.userId}`
  });
});

// ====== FRONT ======
app.use(express.static(__dirname));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "index.htmL"))
);

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running");
  console.log("🤖 Bot started");
});


