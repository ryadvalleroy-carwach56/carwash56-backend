import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * POST /api/dev/seed-services
 * Ajoute quelques services de base dans la base MongoDB actuelle (Atlas)
 * sans besoin de token.
 */
router.post("/seed-services", async (req, res) => {
  try {
    const servicesToInsert = [
      {
        name: "Lavage extérieur rapide",
        description: "Mousse active, rinçage haute pression, séchage microfibre",
        priceEUR: 25,
        durationMin: 30,
        createdAt: new Date(),
      },
      {
        name: "Complet intérieur + extérieur",
        description: "Extérieur + aspiration habitacle + plastiques nettoyés",
        priceEUR: 50,
        durationMin: 60,
        createdAt: new Date(),
      },
      {
        name: "Luxe détaillage",
        description: "Nettoyage complet + finitions + jantes + vitres + parfum habitacle",
        priceEUR: 80,
        durationMin: 90,
        createdAt: new Date(),
      },
    ];

    const result = await mongoose.connection
      .collection("services")
      .insertMany(servicesToInsert);

    return res.json({
      ok: true,
      insertedCount: result.insertedCount,
      services: Object.values(result.insertedIds).map((id, i) => ({
        _id: id,
        ...servicesToInsert[i],
      })),
    });
  } catch (err) {
    console.error("seed-services error >>>", err);
    return res.status(500).json({
      error: "Server error",
      details: String(err),
    });
  }
});

/**
 * GET /api/dev/services
 * Voir les services dispo (debug)
 */
router.get("/services", async (req, res) => {
  try {
    const list = await mongoose.connection
      .collection("services")
      .find({})
      .toArray();

    return res.json(list);
  } catch (err) {
    console.error("list services error >>>", err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
});

export default router;
