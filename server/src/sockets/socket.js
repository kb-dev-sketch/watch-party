import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import Room from "../models/Room.js";

let io;

const userChannel = (userId) => `user:${userId}`;
const roomChannel = (roomCode) => `room:${roomCode.toUpperCase()}`;

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

      const user = await User.findById(decoded._id).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;

      next();
    } catch (error) {
      next(new Error("Invalid or expired authentication token"));
    }
  });

  // 2. Handle authenticated connections
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    console.log(`User connected: ${socket.user.username}`);

    // Every connection joins its private user channel
    socket.join(userChannel(userId));

    // 3. Join an approved Watch Party
    socket.on("join-room", async (roomCode, callback) => {
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
        }).select("host participants roomCode");

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

        // Prevent duplicate join notifications
        const alreadyJoined = socket.rooms.has(channel);

        await socket.join(channel);

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

        // A user cannot leave the socket channel while
        // they are still an approved database participant.
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

    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.user.username}`, reason);
    });
  });

  return io;
};

// 5. Access the initialized Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

export { initializeSocket, getIO, userChannel, roomChannel };
