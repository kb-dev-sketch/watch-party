import { Router } from "express";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
} from "../controllers/room.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createRoom);
router.get("/:roomCode", verifyJWT, getRoom);
router.post("/:roomCode/join", verifyJWT, joinRoom);
router.delete("/:roomCode/leave", verifyJWT, leaveRoom);
export default router;
