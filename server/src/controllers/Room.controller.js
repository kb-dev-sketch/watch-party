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
// request to joih room

const requestToJoin = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;
  const userId = req.user._id;

  // Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Host is already a member
  if (room.host.toString() === userId.toString()) {
    throw new ApiError(400, "You are the host of this room");
  }

  // Check if already approved
  const isParticipant = room.participants.some(
    (id) => id.toString() === userId.toString(),
  );

  if (isParticipant) {
    throw new ApiError(400, "You are already a participant");
  }

  // Find an existing request
  const existingRequest = room.joinRequests.find(
    (request) => request.user.toString() === userId.toString(),
  );

  if (existingRequest?.status === "pending") {
    throw new ApiError(400, "Your request is already pending");
  }

  if (existingRequest?.status === "approved") {
    throw new ApiError(400, "Your request is already approved");
  }

  // Reuse a previously rejected request
  if (existingRequest) {
    existingRequest.status = "pending";
    existingRequest.requestedAt = new Date();
  } else {
    room.joinRequests.push({
      user: userId,
      status: "pending",
    });
  }

  await room.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { status: "pending" }, "Join request sent to host"),
    );
});
// get join Request

const getJoinRequests = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;

  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  }).populate("joinRequests.user", "username email");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Only host can see join requests
  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only host can view join requests");
  }

  const pendingRequests = room.joinRequests.filter(
    (request) => request.status === "pending",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        pendingRequests,
        "Pending join requests fetched successfully",
      ),
    );
});
// handle join request
const handleJoinRequest = asyncHandler(async (req, res) => {
  const { roomCode, requestId } = req.params;
  const { action } = req.body;

  if (!["approve", "reject"].includes(action)) {
    throw new ApiError(400, "Action must be approve or reject");
  }

  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Only host can approve or reject
  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only host can manage join requests");
  }

  // Find the requested entry
  const joinRequest = room.joinRequests.id(requestId);

  if (!joinRequest) {
    throw new ApiError(404, "Join request not found");
  }

  if (joinRequest.status !== "pending") {
    throw new ApiError(400, "This request has already been processed");
  }

  if (action === "approve") {
    const alreadyParticipant = room.participants.some(
      (id) => id.toString() === joinRequest.user.toString(),
    );

    if (!alreadyParticipant) {
      room.participants.push(joinRequest.user);
    }

    joinRequest.status = "approved";
  } else {
    joinRequest.status = "rejected";
  }

  await room.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: joinRequest.status },
        `Join request ${action}d successfully`,
      ),
    );
});

export {
  createRoom,
  getRoom,
  leaveRoom,
  handleJoinRequest,
  getJoinRequests,
  requestToJoin,
};
