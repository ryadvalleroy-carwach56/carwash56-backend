import { Router } from "express";
import { listServices, createService } from "../controllers/serviceController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", listServices);
router.post("/", requireAuth, requireAdmin, createService);

export default router;
