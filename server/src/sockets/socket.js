import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import Room from "../models/Room.js";
import Message from "../models/Message.Model.js";

let io;

const userChannel = (userId) => `user:${userId}`;
const roomChannel = (roomCode) => `room:${roomCode.toUpperCase()}`;

// Extract and validate YouTube video ID
const extractYouTubeVideoId = (url) => {
  try {
    if (typeof url !== "string") return null;

    const parsedUrl = new URL(url);

    let videoId = null;

    if (parsedUrl.hostname === "youtu.be") {
      videoId = parsedUrl.pathname.slice(1).split("/")[0];
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
        parsedUrl.hostname,
      )
    ) {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v");
      } else if (
        parsedUrl.pathname.startsWith("/embed/") ||
        parsedUrl.pathname.startsWith("/shorts/")
      ) {
        videoId = parsedUrl.pathname.split("/")[2];
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(videoId || "") ? videoId : null;
  } catch {
    return null;
  }
};

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // 1. Authenticate every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded.sub ?? decoded._id;
      if (!userId) {
        return next(new Error("Invalid authentication token"));
      }

      const user = await User.findById(userId).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid or expired authentication token"));
    }
  });

  // 2. Handle authenticated connections
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    console.log(`User connected: ${socket.user.username}`);

    // Every connection joins its private user channel
    socket.join(userChannel(userId));

    // Verify whether current user is Host or Moderator
    const verifyHost = async (roomCode) => {
      if (typeof roomCode !== "string" || !roomCode.trim()) {
        return null;
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const channel = roomChannel(normalizedCode);

      // Socket must be connected to this room
      if (!socket.rooms.has(channel)) {
        return null;
      }

      const room = await Room.findOne({
        roomCode: normalizedCode,
        isActive: true,
      }).select("host participants moderators roomCode");

      if (!room) return null;

      const isParticipant = room.participants.some(
        (id) => id.toString() === userId,
      );

      if (!isParticipant) return null;

      const isHost = room.host.toString() === userId;

      const isModerator = room.moderators.some(
        (id) => id.toString() === userId,
      );

      return isHost || isModerator ? room : null;
    };

    // 3. Join an approved Watch Party
    socket.on("join-room", async (roomCode, callback) => {
      console.log("JOIN ROOM EVENT RECEIVED:", roomCode);

      try {
        if (typeof roomCode !== "string" || !roomCode.trim()) {
          return callback?.({
            success: false,
            message: "Valid room code is required",
          });
        }

        const normalizedCode = roomCode.trim().toUpperCase();

        const room = await Room.findOne({
          roomCode: normalizedCode,
          isActive: true,
        }).select(
          "host participants roomCode videoUrl playbackState currentTime lastPlaybackUpdate",
        );

        if (!room) {
          return callback?.({
            success: false,
            message: "Room not found",
          });
        }

        const isParticipant = room.participants.some(
          (id) => id.toString() === userId,
        );

        if (!isParticipant) {
          return callback?.({
            success: false,
            message: "Host approval is required",
          });
        }

        const channel = roomChannel(normalizedCode);

        const alreadyJoined = socket.rooms.has(channel);

        await socket.join(channel);

        // Calculate current playback position
        const elapsedSeconds =
          room.playbackState === "playing"
            ? Math.max(
                0,
                (Date.now() - new Date(room.lastPlaybackUpdate).getTime()) /
                  1000,
              )
            : 0;

        const syncedTime = room.currentTime + elapsedSeconds;

        // Send current state to joining user
        socket.emit("sync-state", {
          videoUrl: room.videoUrl,
          playbackState: room.playbackState,
          currentTime: syncedTime,
          updatedAt: room.lastPlaybackUpdate,
        });

        if (!alreadyJoined) {
          socket.to(channel).emit("user-joined", {
            userId,
            username: socket.user.username,
          });
        }

        callback?.({
          success: true,
          message: "Joined Watch Party successfully",
          roomCode: normalizedCode,
        });
      } catch (error) {
        console.error("Socket join-room error:", error);

        callback?.({
          success: false,
          message: "Unable to join room",
        });
      }
    });
    socket.on(
      "send-message",
      async ({ roomCode, text, videoTime = null } = {}, callback) => {
        try {
          // 1. Validate input
          if (!roomCode || !text || !text.trim()) {
            return callback?.({
              success: false,
              message: "Room code and message are required",
            });
          }

          if (text.trim().length > 1000) {
            return callback?.({
              success: false,
              message: "Message cannot exceed 1000 characters",
            });
          }

          if (
            videoTime !== null &&
            (!Number.isFinite(videoTime) || videoTime < 0)
          ) {
            return callback?.({
              success: false,
              message: "Invalid video timestamp",
            });
          }

          // 2. Verify socket is in the room
          const channel = roomChannel(roomCode);

          if (!socket.rooms.has(channel)) {
            return callback?.({
              success: false,
              message: "You are not connected to this room",
            });
          }

          // 3. Verify user is an approved participant
          const room = await Room.findOne({
            roomCode: roomCode.toUpperCase(),
            isActive: true,
            participants: socket.user._id,
          });

          if (!room) {
            return callback?.({
              success: false,
              message: "You are not a member of this room",
            });
          }

          // 4. Save message in MongoDB
          const message = await Message.create({
            room: room._id,
            sender: socket.user._id,
            text: text.trim(),
            videoTime,
          });

          // 5. Populate sender details
          const populatedMessage = await Message.findById(message._id).populate(
            "sender",
            "username",
          );

          // 6. Broadcast to everyone in the room
          getIO().to(channel).emit("new-message", populatedMessage);

          // 7. Acknowledge sender
          callback?.({
            success: true,
            message: "Message sent successfully",
            data: populatedMessage,
          });
        } catch (error) {
          console.error("Send message error:", error);

          callback?.({
            success: false,
            message: "Failed to send message",
          });
        }
      },
    );
    socket.on(
      "react-to-message",
      async ({ roomCode, messageId, emoji } = {}, callback) => {
        try {
          const allowedEmojis = [
            "😂",
            "❤️",
            "🔥",
            "👍",
            "👏",
            "😍",
            "😮",
            "😢",
          ];

          if (!roomCode || !messageId || !allowedEmojis.includes(emoji)) {
            return callback?.({
              success: false,
              message: "Invalid reaction data",
            });
          }

          const channel = roomChannel(roomCode);

          // Verify socket joined the room
          if (!socket.rooms.has(channel)) {
            return callback?.({
              success: false,
              message: "You are not connected to this room",
            });
          }

          // Verify approved room membership
          const room = await Room.findOne({
            roomCode: roomCode.toUpperCase(),
            isActive: true,
            participants: socket.user._id,
          });

          if (!room) {
            return callback?.({
              success: false,
              message: "You are not a member of this room",
            });
          }

          // Find message belonging to this room
          const message = await Message.findOne({
            _id: messageId,
            room: room._id,
          });

          if (!message) {
            return callback?.({
              success: false,
              message: "Message not found",
            });
          }

          // Check existing reaction by this user
          const existingIndex = message.reactions.findIndex(
            (reaction) =>
              reaction.user.toString() === socket.user._id.toString(),
          );

          let action;

          if (existingIndex !== -1) {
            if (message.reactions[existingIndex].emoji === emoji) {
              // Same emoji again = remove reaction
              message.reactions.splice(existingIndex, 1);
              action = "removed";
            } else {
              // Different emoji = update reaction
              message.reactions[existingIndex].emoji = emoji;
              action = "updated";
            }
          } else {
            // Add new reaction
            message.reactions.push({
              user: socket.user._id,
              emoji,
            });
            action = "added";
          }

          await message.save();

          const updatedMessage = await Message.findById(message._id)
            .populate("sender", "username")
            .populate("reactions.user", "username");

          // Broadcast updated reactions to room
          getIO().to(channel).emit("message-reaction-updated", {
            messageId: message._id,
            reactions: updatedMessage.reactions,
          });

          return callback?.({
            success: true,
            action,
            message: "Reaction updated successfully",
            reactions: updatedMessage.reactions,
          });
        } catch (error) {
          console.error("React to message error:", error);

          return callback?.({
            success: false,
            message: "Failed to update reaction",
          });
        }
      },
    );
    // 4. Leave a Socket.IO room after REST membership removal
    socket.on("leave-room", async (roomCode, callback) => {
      try {
        if (typeof roomCode !== "string" || !roomCode.trim()) {
          return callback?.({
            success: false,
            message: "Valid room code is required",
          });
        }

        const normalizedCode = roomCode.trim().toUpperCase();

        const room = await Room.findOne({
          roomCode: normalizedCode,
        }).select("participants");

        const stillParticipant = room?.participants.some(
          (id) => id.toString() === userId,
        );

        if (stillParticipant) {
          return callback?.({
            success: false,
            message: "Leave through the room API first",
          });
        }

        const channel = roomChannel(normalizedCode);
        const wasJoined = socket.rooms.has(channel);

        await socket.leave(channel);

        if (wasJoined) {
          socket.to(channel).emit("user-left", {
            userId,
            username: socket.user.username,
          });
        }

        callback?.({
          success: true,
          message: "Left Socket.IO room successfully",
        });
      } catch (error) {
        console.error("Socket leave-room error:", error);

        callback?.({
          success: false,
          message: "Unable to leave room",
        });
      }
    });

    // 5. Participant requests playback control
    socket.on(
      "request-control",
      async ({ roomCode, action, payload = {} } = {}, callback) => {
        try {
          if (typeof roomCode !== "string" || !roomCode.trim()) {
            return callback?.({
              success: false,
              message: "Valid room code is required",
            });
          }

          const normalizedCode = roomCode.trim().toUpperCase();

          if (!socket.rooms.has(roomChannel(normalizedCode))) {
            return callback?.({
              success: false,
              message: "You are not connected to this room",
            });
          }

          const room = await Room.findOne({
            roomCode: normalizedCode,
            isActive: true,
          });

          if (!room) {
            return callback?.({
              success: false,
              message: "Room not found",
            });
          }

          const isParticipant = room.participants.some(
            (id) => id.toString() === userId,
          );

          if (!isParticipant) {
            return callback?.({
              success: false,
              message: "You are not a room participant",
            });
          }

          const isHost = room.host.toString() === userId;

          const isModerator = room.moderators.some(
            (id) => id.toString() === userId,
          );

          if (isHost || isModerator) {
            return callback?.({
              success: false,
              message: "You already have playback control permission",
            });
          }

          const allowedActions = ["play", "pause", "seek", "change-video"];

          if (!allowedActions.includes(action)) {
            return callback?.({
              success: false,
              message: "Invalid control action",
            });
          }

          // Prepare a validated payload
          let requestPayload = {};

          if (action === "play" || action === "pause") {
            if (payload.currentTime !== undefined) {
              const time = Number(payload.currentTime);

              if (!Number.isFinite(time) || time < 0) {
                return callback?.({
                  success: false,
                  message: "Invalid playback time",
                });
              }

              requestPayload.currentTime = time;
            }
          }

          if (action === "seek") {
            const time = Number(payload.currentTime);

            if (!Number.isFinite(time) || time < 0) {
              return callback?.({
                success: false,
                message: "Invalid seek time",
              });
            }

            requestPayload.currentTime = time;
          }

          if (action === "change-video") {
            const videoId = extractYouTubeVideoId(payload.videoUrl);

            if (!videoId) {
              return callback?.({
                success: false,
                message: "Valid YouTube video URL is required",
              });
            }

            requestPayload.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          }

          room.controlRequests = room.controlRequests || [];

          // Prevent duplicate pending requests for the same action
          const existingRequest = room.controlRequests.find(
            (request) =>
              request.requester.toString() === userId &&
              request.action === action &&
              request.status === "pending",
          );

          if (existingRequest) {
            return callback?.({
              success: false,
              message: "You already have a pending request for this action",
            });
          }

          const controlRequest = {
            requester: socket.user._id,
            action,
            payload: requestPayload,
            status: "pending",
            requestedAt: new Date(),
          };

          room.controlRequests.push(controlRequest);

          await room.save();

          const savedRequest =
            room.controlRequests[room.controlRequests.length - 1];

          const requestData = {
            requestId: savedRequest._id,
            roomCode: room.roomCode,
            requester: {
              userId,
              username: socket.user.username,
            },
            action,
            payload: requestPayload,
            status: "pending",
            requestedAt: savedRequest.requestedAt,
          };

          // Notify Host privately
          io.to(userChannel(room.host.toString())).emit(
            "control-request-received",
            requestData,
          );

          // Notify Moderators privately
          room.moderators.forEach((moderatorId) => {
            io.to(userChannel(moderatorId.toString())).emit(
              "control-request-received",
              requestData,
            );
          });

          callback?.({
            success: true,
            message: "Control request sent successfully",
            data: requestData,
          });
        } catch (error) {
          console.error("Control request error:", error);

          callback?.({
            success: false,
            message: "Unable to send control request",
          });
        }
      },
    );

    // 6. Get pending control requests (Host / Moderator only)
    socket.on("get-pending-control-requests", async (roomCode, callback) => {
      try {
        const room = await verifyHost(roomCode);

        if (!room) {
          return callback?.({
            success: false,
            message: "Only Host or Moderator can view control requests",
          });
        }

        const fullRoom = await Room.findById(room._id)
          .populate("controlRequests.requester", "username")
          .populate("controlRequests.reviewedBy", "username");

        const pendingRequests = fullRoom.controlRequests
          .filter((request) => request.status === "pending")
          .map((request) => ({
            requestId: request._id,
            requester: request.requester,
            action: request.action,
            payload: request.payload,
            status: request.status,
            requestedAt: request.requestedAt,
          }));

        callback?.({
          success: true,
          data: pendingRequests,
        });
      } catch (error) {
        console.error("Get pending requests error:", error);

        callback?.({
          success: false,
          message: "Unable to fetch pending requests",
        });
      }
    });

    // 7. Approve control request
    socket.on(
      "approve-control",
      async ({ roomCode, requestId } = {}, callback) => {
        try {
          const room = await verifyHost(roomCode);

          if (!room) {
            return callback?.({
              success: false,
              message: "Only Host or Moderator can approve requests",
            });
          }

          const request = room.controlRequests.id(requestId);

          if (!request || request.status !== "pending") {
            return callback?.({
              success: false,
              message: "Pending control request not found",
            });
          }

          // Requester must still be a room participant
          const requesterId = request.requester.toString();

          const requesterStillMember = room.participants.some(
            (id) => id.toString() === requesterId,
          );

          if (!requesterStillMember) {
            request.status = "rejected";
            request.reviewedBy = socket.user._id;

            await room.save();

            return callback?.({
              success: false,
              message: "Requester is no longer a room participant",
            });
          }

          const { action, payload } = request;

          // Execute approved action
          if (action === "play" || action === "pause") {
            const time = Number(payload?.currentTime ?? room.currentTime);

            if (!Number.isFinite(time) || time < 0) {
              return callback?.({
                success: false,
                message: "Invalid playback time",
              });
            }

            room.playbackState = action === "play" ? "playing" : "paused";

            room.currentTime = time;
          } else if (action === "seek") {
            const time = Number(payload?.currentTime);

            if (!Number.isFinite(time) || time < 0) {
              return callback?.({
                success: false,
                message: "Invalid seek time",
              });
            }

            room.currentTime = time;
          } else if (action === "change-video") {
            const videoId = extractYouTubeVideoId(payload?.videoUrl);

            if (!videoId) {
              return callback?.({
                success: false,
                message: "Invalid YouTube video URL",
              });
            }

            room.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            room.playbackState = "paused";
            room.currentTime = 0;
          } else {
            return callback?.({
              success: false,
              message: "Unsupported control action",
            });
          }

          request.status = "approved";
          request.reviewedBy = socket.user._id;

          room.lastPlaybackUpdate = new Date();

          await room.save();

          const channel = roomChannel(room.roomCode);

          const events = {
            play: "video-played",
            pause: "video-paused",
            seek: "video-seeked",
            "change-video": "video-changed",
          };

          const eventPayload =
            action === "change-video"
              ? {
                  videoUrl: room.videoUrl,
                  videoId: extractYouTubeVideoId(room.videoUrl),
                  currentTime: 0,
                  playbackState: "paused",
                  updatedAt: room.lastPlaybackUpdate,
                }
              : {
                  currentTime: room.currentTime,
                  playbackState: room.playbackState,
                  updatedAt: room.lastPlaybackUpdate,
                };

          // Execute approved action for all room participants
          io.to(channel).emit(events[action], eventPayload);

          // Notify room about request status
          io.to(channel).emit("control-request-updated", {
            requestId: request._id,
            status: "approved",
            reviewedBy: socket.user._id,
          });

          // Notify requester privately
          io.to(userChannel(requesterId)).emit("control-request-result", {
            requestId: request._id,
            roomCode: room.roomCode,
            status: "approved",
            action,
            message: "Your control request was approved",
          });

          callback?.({
            success: true,
            message: "Control request approved and executed",
          });
        } catch (error) {
          console.error("Approve control error:", error);

          callback?.({
            success: false,
            message: "Unable to approve control request",
          });
        }
      },
    );

    // 8. Reject control request
    socket.on(
      "reject-control",
      async ({ roomCode, requestId } = {}, callback) => {
        try {
          const room = await verifyHost(roomCode);

          if (!room) {
            return callback?.({
              success: false,
              message: "Only Host or Moderator can reject requests",
            });
          }

          const request = room.controlRequests.id(requestId);

          if (!request || request.status !== "pending") {
            return callback?.({
              success: false,
              message: "Pending control request not found",
            });
          }

          request.status = "rejected";
          request.reviewedBy = socket.user._id;

          await room.save();

          const requesterId = request.requester.toString();

          // Notify room about request status
          io.to(roomChannel(room.roomCode)).emit("control-request-updated", {
            requestId: request._id,
            status: "rejected",
            reviewedBy: socket.user._id,
          });

          // Notify requester privately
          io.to(userChannel(requesterId)).emit("control-request-result", {
            requestId: request._id,
            roomCode: room.roomCode,
            status: "rejected",
            action: request.action,
            message: "Your control request was rejected",
          });

          callback?.({
            success: true,
            message: "Control request rejected",
          });
        } catch (error) {
          console.error("Reject control error:", error);

          callback?.({
            success: false,
            message: "Unable to reject control request",
          });
        }
      },
    );

    // 9. Direct Play video (Host / Moderator only)
    socket.on(
      "play-video",
      async ({ roomCode, currentTime } = {}, callback) => {
        try {
          const room = await verifyHost(roomCode);

          if (!room) {
            return callback?.({
              success: false,
              message: "Only the host or moderator can control playback",
            });
          }

          const time = Number(currentTime);

          if (!Number.isFinite(time) || time < 0) {
            return callback?.({
              success: false,
              message: "Invalid playback time",
            });
          }

          room.playbackState = "playing";
          room.currentTime = time;
          room.lastPlaybackUpdate = new Date();

          await room.save();

          socket.to(roomChannel(room.roomCode)).emit("video-played", {
            currentTime: time,
            playbackState: "playing",
            updatedAt: room.lastPlaybackUpdate,
          });

          callback?.({ success: true });
        } catch (error) {
          console.error("Play video error:", error);

          callback?.({
            success: false,
            message: "Playback failed",
          });
        }
      },
    );

    // 10. Direct Pause video (Host / Moderator only)
    socket.on(
      "pause-video",
      async ({ roomCode, currentTime } = {}, callback) => {
        try {
          const room = await verifyHost(roomCode);

          if (!room) {
            return callback?.({
              success: false,
              message: "Only the host or moderator can control playback",
            });
          }

          const time = Number(currentTime);

          if (!Number.isFinite(time) || time < 0) {
            return callback?.({
              success: false,
              message: "Invalid playback time",
            });
          }

          room.playbackState = "paused";
          room.currentTime = time;
          room.lastPlaybackUpdate = new Date();

          await room.save();

          socket.to(roomChannel(room.roomCode)).emit("video-paused", {
            currentTime: time,
            playbackState: "paused",
            updatedAt: room.lastPlaybackUpdate,
          });

          callback?.({ success: true });
        } catch (error) {
          console.error("Pause video error:", error);

          callback?.({
            success: false,
            message: "Pause failed",
          });
        }
      },
    );

    // 11. Direct Seek video (Host / Moderator only)
    socket.on(
      "seek-video",
      async ({ roomCode, currentTime } = {}, callback) => {
        try {
          const room = await verifyHost(roomCode);

          if (!room) {
            return callback?.({
              success: false,
              message: "Only the host or moderator can control playback",
            });
          }

          const time = Number(currentTime);

          if (!Number.isFinite(time) || time < 0) {
            return callback?.({
              success: false,
              message: "Invalid playback time",
            });
          }

          room.currentTime = time;
          room.lastPlaybackUpdate = new Date();

          await room.save();

          socket.to(roomChannel(room.roomCode)).emit("video-seeked", {
            currentTime: time,
            playbackState: room.playbackState,
            updatedAt: room.lastPlaybackUpdate,
          });

          callback?.({ success: true });
        } catch (error) {
          console.error("Seek video error:", error);

          callback?.({
            success: false,
            message: "Seek failed",
          });
        }
      },
    );

    // 12. Direct Change video (Host / Moderator only)
    socket.on("change-video", async ({ roomCode, videoUrl } = {}, callback) => {
      try {
        const room = await verifyHost(roomCode);

        if (!room) {
          return callback?.({
            success: false,
            message: "Only the host or moderator can change video",
          });
        }

        const videoId = extractYouTubeVideoId(videoUrl);

        if (!videoId) {
          return callback?.({
            success: false,
            message: "Invalid YouTube video URL",
          });
        }

        room.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        room.playbackState = "paused";
        room.currentTime = 0;
        room.lastPlaybackUpdate = new Date();

        await room.save();

        socket.to(roomChannel(room.roomCode)).emit("video-changed", {
          videoUrl: room.videoUrl,
          videoId,
          playbackState: "paused",
          currentTime: 0,
          updatedAt: room.lastPlaybackUpdate,
        });

        callback?.({ success: true });
      } catch (error) {
        console.error("Change video error:", error);

        callback?.({
          success: false,
          message: "Video change failed",
        });
      }
    });

    // 13. Disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.user.username}`, reason);
    });
  });

  return io;
};

// Access initialized Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

export { initializeSocket, getIO, userChannel, roomChannel };
