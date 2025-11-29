// utils/teleAlert.js  ← FINAL BULLETPROOF VERSION
import "dotenv/config";

const send = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim(),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.log("Telegram offline");
  }
};

export const teleAlert = send;

export const alertNewUser = async (user, ip = "?", device = "?") => {
  await send(`
NEW CITIZEN JOINED
<b>Name:</b> ${user.name}
<b>Email:</b> ${user.email}
<b>IP:</b> ${ip}
<b>Device:</b> ${device.substring(0,50)}...
<b>Time:</b> ${new Date().toLocaleString()}
Empire grows
  `.trim());
};
