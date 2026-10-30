import { Router } from "express";
import {
  createRoom,
  getRoom,
  leaveRoom,
  requestToJoin,
  getJoinRequests,
  handleJoinRequest,
} from "../controllers/room.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createRoom);
router.get("/:roomCode", verifyJWT, getRoom);
router.delete("/:roomCode/leave", verifyJWT, leaveRoom);
// Participant sends a join request
router.post("/:roomCode/request", verifyJWT, requestToJoin);

// Host views pending requests
router.get("/:roomCode/requests", verifyJWT, getJoinRequests);

// Host approves or rejects a request
router.patch("/:roomCode/requests/:requestId", verifyJWT, handleJoinRequest);
export default router;
