import { randomBytes } from "crypto";
import Room from "../models/Room.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO, userChannel, roomChannel } from "../sockets/socket.js";
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
    .populate("participants", "username email")
    .populate("moderators", "username");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully"));
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
  // add socket
  // Socket.IO actions only when request is approved
  if (action === "approve") {
    const io = getIO();

    const privateChannel = userChannel(joinRequest.user.toString());
    const partyChannel = roomChannel(room.roomCode);

    // Add all active connections of approved user to the room
    await io.in(privateChannel).socketsJoin(partyChannel);

    // Notify approved user
    io.to(privateChannel).emit("join-approved", {
      roomCode: room.roomCode,
      message: "Your join request has been approved",
    });

    // Notify existing room participants
    io.to(partyChannel).except(privateChannel).emit("user-joined", {
      userId: joinRequest.user,
    });
  }
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
// leave room with automatic host transfer and when no one is in room then close the room after host leave

const leaveRoom = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;
  const userId = req.user._id.toString();

  // Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Check participant membership
  const isParticipant = room.participants.some(
    (id) => id.toString() === userId,
  );

  if (!isParticipant) {
    throw new ApiError(400, "You are not a participant");
  }

  // Check whether current user is host
  const isHost = room.host.toString() === userId;

  // If host is leaving, transfer ownership
  if (isHost) {
    const newHost = room.participants.find((id) => id.toString() !== userId);

    // If no other participant exists, close room
    if (!newHost) {
      room.isActive = false;
      room.participants = [];

      await room.save();
      // Socket.IO: remove all active connections of this user
      const io = getIO();

      const leavingUserChannel = userChannel(userId);
      const watchPartyChannel = roomChannel(room.roomCode);

      await io.in(leavingUserChannel).socketsLeave(watchPartyChannel);

      // Notify remaining participants
      io.to(watchPartyChannel).emit("user-left", {
        userId,
      });

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Room closed successfully"));
    }

    // Assign new host
    room.host = newHost;
  }

  // Remove leaving user from participants
  room.participants = room.participants.filter(
    (id) => id.toString() !== userId,
  );
  room.moderators = room.moderators.filter((id) => id.toString() !== userId);
  await room.save();
  // Socket.IO: remove all active connections of leaving user
  const io = getIO();

  const leavingUserChannel = userChannel(userId);
  const watchPartyChannel = roomChannel(room.roomCode);

  await io.in(leavingUserChannel).socketsLeave(watchPartyChannel);

  // Notify remaining participants
  io.to(watchPartyChannel).emit("user-left", {
    userId,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        isHost
          ? "You left the room and host ownership was transferred"
          : "Left room successfully",
      ),
    );
});

// transfer host

const transferHost = asyncHandler(async (req, res) => {
  const { roomCode } = req.params;
  const { newHostId } = req.body;

  // 1. Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // 2. Only current host can transfer ownership
  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only current host can transfer ownership");
  }

  // 3. Validate new host ID
  if (!newHostId) {
    throw new ApiError(400, "New host ID is required");
  }

  // 4. Prevent transferring to yourself
  if (newHostId === req.user._id.toString()) {
    throw new ApiError(400, "You are already the host");
  }

  // 5. Check whether selected user is an approved participant
  const isParticipant = room.participants.some(
    (id) => id.toString() === newHostId.toString(),
  );

  if (!isParticipant) {
    throw new ApiError(400, "Selected user is not a room participant");
  }

  // 6. Transfer ownership
  room.host = newHostId;
  room.moderators = room.moderators.filter(
    (id) => id.toString() !== newHostId.toString(),
  );
  await room.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { newHost: room.host },
        "Host transferred successfully",
      ),
    );
});

const assignParticipantRole = asyncHandler(async (req, res) => {
  const { roomCode, userId } = req.params;
  const { role } = req.body;

  // Validate role
  if (!["moderator", "participant"].includes(role)) {
    throw new ApiError(400, "Role must be moderator or participant");
  }

  // Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Only host can assign roles
  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only host can assign roles");
  }

  // Host role cannot be changed
  if (room.host.toString() === userId) {
    throw new ApiError(400, "Host role cannot be changed");
  }

  // Check participant membership
  const isParticipant = room.participants.some(
    (id) => id.toString() === userId,
  );

  if (!isParticipant) {
    throw new ApiError(404, "Participant not found in this room");
  }

  // Promote or demote participant
  if (role === "moderator") {
    const alreadyModerator = room.moderators.some(
      (id) => id.toString() === userId,
    );

    if (!alreadyModerator) {
      room.moderators.push(userId);
    }
  } else {
    room.moderators = room.moderators.filter((id) => id.toString() !== userId);
  }

  await room.save();

  const roleData = {
    roomCode: room.roomCode,
    userId,
    role,
  };

  const io = getIO();

  // Notify all room participants
  io.to(roomChannel(room.roomCode)).emit("role-updated", roleData);

  // Notify the particular user
  io.to(userChannel(userId)).emit("my-role-updated", roleData);

  return res
    .status(200)
    .json(
      new ApiResponse(200, roleData, `Participant role updated to ${role}`),
    );
});
const removeParticipant = asyncHandler(async (req, res) => {
  const { roomCode, userId } = req.params;

  // Find active room
  const room = await Room.findOne({
    roomCode: roomCode.toUpperCase(),
    isActive: true,
  });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Only host can remove participants
  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only host can remove participants");
  }

  // Host cannot remove themselves
  if (room.host.toString() === userId) {
    throw new ApiError(400, "Host cannot remove themselves");
  }

  // Check participant membership
  const isParticipant = room.participants.some(
    (id) => id.toString() === userId,
  );

  if (!isParticipant) {
    throw new ApiError(404, "Participant not found in this room");
  }

  // Remove participant
  room.participants = room.participants.filter(
    (id) => id.toString() !== userId,
  );

  // Remove moderator permission too
  room.moderators = room.moderators.filter((id) => id.toString() !== userId);

  await room.save();

  const io = getIO();

  const partyChannel = roomChannel(room.roomCode);
  const privateChannel = userChannel(userId);

  // Notify removed participant
  io.to(privateChannel).emit("removed-from-room", {
    roomCode: room.roomCode,
    message: "You have been removed from this room by the host",
  });

  // Remove all active sockets of this user from room
  await io.in(privateChannel).socketsLeave(partyChannel);

  // Notify remaining participants
  io.to(partyChannel).emit("participant-removed", {
    userId,
    roomCode: room.roomCode,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Participant removed successfully"));
});

export {
  createRoom,
  getRoom,
  handleJoinRequest,
  getJoinRequests,
  requestToJoin,
  leaveRoom,
  transferHost,
  removeParticipant,
  assignParticipantRole,
};
