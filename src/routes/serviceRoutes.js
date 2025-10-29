import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/services
 * Retourne toutes les formules de lavage
 * (lecture directe dans la collection "services")
 */
router.get("/", async (req, res) => {
  try {
    const list = await mongoose.connection
      .collection("services")
      .find({})
      .toArray();

    return res.json(list);
  } catch (err) {
    console.error("list services error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

export default router;
