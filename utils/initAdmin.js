utils/initAdmin.jsimport Admin from "../models/Admin.js";
import bcrypt from "bcrypt";

export async function initAdmin() {
  try {
    const existing = await Admin.findOne();
    if (existing) return; // admin already exists

    const password = process.env.ADMIN_PASSWORD || "ChangeThisPasswordNow!";
    const hash = await bcrypt.hash(password, 12);

    const admin = new Admin({
      name: "Owner",
      email: process.env.ADMIN_EMAIL,
      passwordHash: hash,
    });

    await admin.save();
    console.log("✅ Admin account created:", admin.email);
  } catch (err) {
    console.error("❌ Failed to create admin:", err);
  }
}
