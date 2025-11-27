// one-off script createAdmin.js (run with node createAdmin.js)
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "./models/Admin.js";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const pw = "08089821951alp@00hoN08054521932";   // <-- change this
const hash = await bcrypt.hash(pw, 12);

const admin = new Admin({ 
  name: "You", 
  email: "admin@nexora.com",  // <-- change this 
  passwordHash: hash 
});

await admin.save();
console.log("Admin created:", admin.email);
process.exit(0);
