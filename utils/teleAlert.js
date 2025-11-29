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

// MONEY ALERT — THE ONE THAT MAKES YOU SMILE
export const alertPayment = async (paymentData) => {
  const {
    name,
    email,
    ip,
    device,
    coins,
    newBalance,
    amountNGN,
    status = "SUCCESS"
  } = paymentData;

  await send(`
MONEY INCOMING

<b>Name:</b> ${name}
<b>Email:</b> ${email}
<b>IP:</b> ${ip}
<b>Device:</b> ${device.substring(0,50)}...
<b>Coins:</b> +${Number(coins).toLocaleString()}
<b>New Balance:</b> ${Number(newBalance).toLocaleString()} NexCoins
<b>Amount Paid:</b> ₦${Number(amountNGN).toLocaleString()}
<b>Status:</b> ${status === "SUCCESS" ? "SUCCESS" : "FAILED"}
<b>Time:</b> ${new Date().toLocaleString()}

Empire grows richer
  `.trim());
};

// FAILED PAYMENT ALERT — CATCH SCAMMERS INSTANTLY
export const alertFailedPayment = async (data) => {
  const {
    name = "Unknown",
    email,
    ip,
    device,
    coins,
    amountNGN,
    reason,
    transaction_id
  } = data;

  await send(`
PAYMENT FAILED — POSSIBLE FRAUD

<b>Name:</b> ${name}
<b>Email:</b> ${email}
<b>IP:</b> ${ip}
<b>Device:</b> ${device.substring(0,50)}...
<b>Attempted:</b> +\( {Number(coins).toLocaleString()} NexCoins (₦ \){Number(amountNGN).toLocaleString()})
<b>Reason:</b> <code>${reason || "unknown"}</code>
<b>Transaction ID:</b> <code>${transaction_id}</code>
<b>Time:</b> ${new Date().toLocaleString()}

Empire protected
  `.trim());
};
