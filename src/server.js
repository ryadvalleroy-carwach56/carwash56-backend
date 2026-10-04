// src/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";
// --- Routes (assure-toi que ces fichiers existent)
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import devSeedRoutes from "./routes/devSeedRoutes.js";

// Charger les variables d'env (.env)
dotenv.config();

const firebaseServiceAccountPath =
  "/etc/secrets/firebase-service-account.json";

const serviceAccount = JSON.parse(
  fs.readFileSync(firebaseServiceAccountPath, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function sendExpoPush(expoPushToken, title, body, data = {}) {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
      }),
    });

    const result = await response.json();
    console.log("📲 Réponse Expo Push :", result);
  } catch (error) {
    console.error("❌ Erreur Expo Push :", error);
  }
}

async function checkReservationReminders() {
  try {
    console.log("🔎 Vérification des rappels de rendez-vous...");

    const snapshot = await firestore
      .collection("reservations")
      .where("status", "==", "accepted")
      .get();

    console.log(
      `📅 ${snapshot.size} rendez-vous confirmé(s) trouvé(s)`
    );

    for (const doc of snapshot.docs) {
      const reservation = doc.data();

      if (!reservation.dateDay || !reservation.slot) continue;

      const slotStart = Number(
        String(reservation.slot).split("-")[0]
      );

      if (!slotStart) continue;

      const appointmentDate = new Date(
        `${reservation.dateDay}T${String(slotStart).padStart(2, "0")}:00:00+02:00`
      );

      const hoursBefore =
        (appointmentDate.getTime() - Date.now()) /
        (1000 * 60 * 60);

      console.log(
        `⏱️ ${reservation.customerName || "Client"} : ${hoursBefore.toFixed(
          1
        )} h avant le rendez-vous`
      );
      if (
  hoursBefore >= 23.5 &&
  hoursBefore <= 24.5 &&
  !reservation.reminder24hSent
) {
  console.log("🔔 Rappel 24h à envoyer :", reservation.customerName || "Client");
}
    }
  } catch (error) {
    console.error("❌ Erreur vérification rappels :", error);
  }
}

console.log("✅ Firebase Admin connecté");

checkReservationReminders();

// ESM-friendly __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App
const app = express();

// Middlewares de base
app.use(cors());
app.use(express.json());

// Fichiers statiques (public/) -> pour /delete-account et autres pages statiques
// Note: __dirname = src/, donc ../public pointe sur /public à la racine du backend
app.use(express.static(path.join(__dirname, "../public")));

// --- Routes API
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/dev", devSeedRoutes);

// Healthcheck simple
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "carwash56-backend" });
});

// Page "Suppression de compte" (obligatoire pour Play Console)
app.get("/delete-account", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/delete-account.html"));
});

app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/privacy-policy.html"));
});

// --- Gestion des erreurs (optionnel mais utile)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

// --- Démarrage du serveur après connexion MongoDB
const PORT = process.env.PORT || 4000;
// Exemple Atlas:
// MONGO_URI=mongodb+srv://<db_username>:<db_password>@<cluster>.mongodb.net/<db_name>?retryWrites=true&w=majority&appName=<appName>
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/carwash56";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });
