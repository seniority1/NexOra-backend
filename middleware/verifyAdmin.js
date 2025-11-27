import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
const JWT_SECRET = process.env.JWT_SECRET;

export default async function verifyAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ message: "Not authorized" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    const admin = await Admin.findById(decoded.id).select("-passwordHash");
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    req.admin = admin;
    next();
  } catch (err) {
    console.error("verifyAdmin error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
}
