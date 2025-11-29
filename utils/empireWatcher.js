// utils/empireWatcher.js  ← Safe, clean, never touches auth
import { alertNewUser, alertBannedDevice } from "./teleAlert.js";
import Ban from "../models/Ban.js";

// Call these from ANYWHERE — no controller changes needed
export const watchRegister = async (user, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || "unknown";
  const fp = req.body.fingerprint || "none";

  // Permanent ban check
  const permBan = await Ban.findOne({
    $or: [{ ip }, { fingerprint: fp }]
  });

  if (permBan) {
    await alertBannedDevice(ip, fp);
    return { blocked: true };
  }

  // New user alert
  await alertNewUser(user, ip, req.headers['user-agent'] || "unknown");
  return { blocked: false };
};
