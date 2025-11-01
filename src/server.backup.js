import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import devSeedRoutes from "./routes/devSeedRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- ROUTES API ---
app.get("/", (_req, res) => res.json({ ok: true, service: "carwash56-backend", root: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "carwash56-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/dev", devSeedRoutes);

// --- DB + SERVER ---
const PORT = process.env.PORT || 4000;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/carwash56";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✓ MongoDB connected");
    app.listen(PORT, () => console.log(`✓ API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("✗ DB connection error:", err);
    process.exit(1);
  });
