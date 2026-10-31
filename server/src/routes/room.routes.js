import { Router } from "express";
import {
  createRoom,
  getMyRooms,
  getRoom,
  requestToJoin,
  getJoinRequests,
  handleJoinRequest,
  leaveRoom,
  transferHost,
  assignParticipantRole,
  removeParticipant,
  getRoomMessages,
} from "../controllers/Room.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createRoom);
router.get("/mine", verifyJWT, getMyRooms);
router.get("/:roomCode", verifyJWT, getRoom);
router.delete("/:roomCode/leave", verifyJWT, leaveRoom);
// Participant sends a join request
router.post("/:roomCode/request", verifyJWT, requestToJoin);

// Host views pending requests
router.get("/:roomCode/requests", verifyJWT, getJoinRequests);

// Host approves or rejects a request
router.patch("/:roomCode/requests/:requestId", verifyJWT, handleJoinRequest);

router.patch("/:roomCode/transfer-host", verifyJWT, transferHost);
// Host assigns or changes participant role
router.patch(
  "/:roomCode/participants/:userId/role",
  verifyJWT,
  assignParticipantRole,
);

// Host removes participant
router.delete("/:roomCode/participants/:userId", verifyJWT, removeParticipant);
router.get("/:roomCode/messages", verifyJWT, getRoomMessages);
export default router;
