// makeAdmin.js
// Utilisation: node makeAdmin.js email@exemple.com

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/carwash56";

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error("❌ Donne un email : node makeAdmin.js email@domaine.com");
    process.exit(1);
  }

  console.log("🔄 Connexion MongoDB...");
  await mongoose.connect(MONGO_URI);

  console.log(`🔍 Recherche utilisateur avec email ${emailArg} ...`);
  const user = await User.findOne({ email: emailArg });

  if (!user) {
    console.error("❌ Utilisateur introuvable.");
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`✅ OK : ${user.fullName} est maintenant ADMIN`);
  console.log(`   id: ${user._id}`);
  console.log(`   email: ${user.email}`);
  console.log(`   role: ${user.role}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
