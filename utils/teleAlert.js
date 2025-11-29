// utils/teleAlert.js  ← FINAL VERSION — COPY EXACTLY
export default async function teleAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram alerts disabled (no config)");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim(),
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.log("Telegram alert failed (offline?)");
  }
}

// ——— QUICK SHORTCUTS (use these everywhere) ———
export const alertNewUser = (user, ip = "?", device = "?") => teleAlert(`
NEW CITIZEN JOINED
<b>Name:</b> ${user.name}
<b>Email:</b> ${user.email}
<b>IP:</b> ${ip}
<b>Device:</b> ${device.substring(0,50)}...
<b>Time:</b> ${new Date().toLocaleString()}
Empire grows
`);

export const alertPayment = (email, amountNGN, coins) => teleAlert(`
MONEY INCOMING
<b>User:</b> ${email}
<b>Amount:</b> ₦${Number(amountNGN).toLocaleString()}
<b>Coins Added:</b> +${coins.toLocaleString()}
<b>Time:</b> ${new Date().toLocaleString()}
`);

export const alertBigGift = (email, coins, adminEmail) => teleAlert(`
ROYAL GIFT BESTOWED
<b>To:</b> ${email}
<b>Coins:</b> ${coins.toLocaleString()}
<b>By:</b> ${adminEmail}
<b>Time:</b> ${new Date().toLocaleString()}
`);

export const alertBannedDevice = (ip, fingerprint) => teleAlert(`
BANNED DEVICE BLOCKED
<b>IP:</b> ${ip}
<b>Fingerprint:</b> <code>${fingerprint?.substring(0,20)}...</code>
<b>Time:</b> ${new Date().toLocaleString()}
The wall holds
`);

export const alertNuclear = (action) => teleAlert(`
NUCLEAR COMMAND EXECUTED
<b>Action:</b> ${action}
<b>By:</b> King
<b>Time:</b> ${new Date().toLocaleString()}
Empire reset
`);
