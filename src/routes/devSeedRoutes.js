import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/ping", (_req, res) => res.json({ ok: true, route: "dev", ping: "pong" }));

router.post("/seed-services", async (_req, res) => {
  try {
    const col = mongoose.connection.collection("services");
    const count = await col.countDocuments();
    if (count === 0) {
      await col.insertMany([
        { name: "Lavage extérieur rapide", description: "Pré-lavage + rinçage + séchage microfibre", priceEUR: 25, durationMin: 30 },
        { name: "Complet intérieur/extérieur", description: "Extérieur + aspirateur + plastiques", priceEUR: 49, durationMin: 75 },
      ]);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "seed error", details: String(e) });
  }
});

router.post("/seed-admin", async (req, res) => {
  try {
    const { fullName, email, password, secret } = req.body || {};
    if (!secret || secret !== process.env.SEED_SECRET) {
      return res.status(403).json({ error: "Forbidden (bad secret)" });
    }
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Missing fullName/email/password" });
    }

    const users = mongoose.connection.collection("users");
    const existing = await users.findOne({ email });
    if (existing) return res.json({ ok: true, note: "already exists", email });

    const passwordHash = await bcrypt.hash(password, 10);
    await users.insertOne({ fullName, email, passwordHash, role: "admin", createdAt: new Date() });
    return res.json({ ok: true, email, role: "admin" });
  } catch (e) {
    return res.status(500).json({ error: "seed-admin error", details: String(e) });
  }
});

export default router;
