import { randomBytes } from "crypto";
import Room from "../models/Room.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createRoom = asyncHandler(async (req, res) => {
  const { name, videoUrl = "" } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Room name is required");
  }

  const roomCode = randomBytes(4).toString("hex").toUpperCase();

  const room = await Room.create({
    name: name.trim(),
    roomCode,
    host: req.user._id,
    participants: [req.user._id],
    videoUrl,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, room, "Room created successfully"));
});

const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({
    roomCode: req.params.roomCode.toUpperCase(),
    isActive: true,
  })
    .populate("host", "username email")
    .populate("participants", "username");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully"));
});

// join ROOM
const joinRoom = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;

  // 1. Find the active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // 2. Check whether user is already a participant
  const isAlreadyJoined = room.participants.some(
    (participantId) => participantId.toString() === req.user._id.toString(),
  );

  if (isAlreadyJoined) {
    throw new ApiError(400, "You have already joined this room");
  }

  // 3. Add user to participants
  room.participants.push(req.user._id);

  await room.save();

  // 4. Send response
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Joined room successfully"));
});
// ACTIVE ROOM
const leaveRoom = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;

  // 1. Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // 2. Host cannot leave without transferring ownership
  if (room.host.toString() === req.user._id.toString()) {
    throw new ApiError(403, "Host must transfer ownership before leaving");
  }

  // 3. Check participant membership
  const isParticipant = room.participants.some(
    (participantId) => participantId.toString() === req.user._id.toString(),
  );

  if (!isParticipant) {
    throw new ApiError(400, "You are not a participant of this room");
  }

  // 4. Remove participant
  room.participants = room.participants.filter(
    (participantId) => participantId.toString() !== req.user._id.toString(),
  );

  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Left room successfully"));
});
export { createRoom, getRoom, joinRoom, leaveRoom };
