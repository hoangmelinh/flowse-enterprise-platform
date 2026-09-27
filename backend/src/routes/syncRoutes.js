import { Router } from "express";
import { handleBatchSync } from "../controllers/syncController.js";

const router = Router();

router.post("/batch", handleBatchSync);

export default router;
