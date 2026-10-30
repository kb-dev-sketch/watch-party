import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import Room from "../models/Room.js";

let io;

const userChannel = (userId) => `user:${userId}`;
const roomChannel = (roomCode) => `room:${roomCode.toUpperCase()}`;
const extractYouTubeVideoId = (url) => {
  try {
    const parsedUrl = new URL(url);

    let videoId = null;

    if (parsedUrl.hostname === "youtu.be") {
      videoId = parsedUrl.pathname.slice(1);
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
        parsedUrl.hostname,
      )
    ) {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v");
      } else if (parsedUrl.pathname.startsWith("/embed/")) {
        videoId = parsedUrl.pathname.split("/")[2];
      } else if (parsedUrl.pathname.startsWith("/shorts/")) {
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

        // Prevent duplicate join notifications
        const alreadyJoined = socket.rooms.has(channel);
        await socket.join(channel);
        const elapsedSeconds =
          room.playbackState === "playing"
            ? (Date.now() - new Date(room.lastPlaybackUpdate).getTime()) / 1000
            : 0;

        const syncedTime = room.currentTime + elapsedSeconds;
        socket.emit("sync-state", {
          videoUrl: room.videoUrl,
          playbackState: room.playbackState,
          currentTime: room.currentTime,
          updatedAt: room.lastPlaybackUpdate,
          currentTime: syncedTime,
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
    const normalizedCode = roomCode.trim().toUpperCase();
    const channel = roomChannel(normalizedCode);

    if (!socket.rooms.has(channel)) return null;
    const verifyHost = async (roomCode) => {
      if (typeof roomCode !== "string" || !roomCode.trim()) {
        return null;
      }

      const room = await Room.findOne({
        roomCode: roomCode.trim().toUpperCase(),
        isActive: true,
      }).select("host participants moderators roomCode");

      if (!room) return null;

      const userId = socket.user._id.toString();

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

    socket.on("play-video", async ({ roomCode, currentTime }, callback) => {
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
        callback?.({ success: false, message: "Playback failed" });
      }
    });

    socket.on("pause-video", async ({ roomCode, currentTime }, callback) => {
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
        callback?.({ success: false, message: "Pause failed" });
      }
    });
    // Seek video
    socket.on("seek-video", async ({ roomCode, currentTime }, callback) => {
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

        socket.to(roomChannel(room.roomCode)).emit("video-changed", {
          videoUrl: room.videoUrl,
          videoId,
          playbackState: "paused",
          currentTime: 0,
        });

        callback?.({ success: true });
      } catch (error) {
        console.error("Seek video error:", error);
        callback?.({ success: false, message: "Seek failed" });
      }
    });
    // Change video
    socket.on("change-video", async ({ roomCode, videoUrl }, callback) => {
      try {
        const room = await verifyHost(roomCode);

        if (!room) {
          return callback?.({
            success: false,
            message: "Only the host or moderator can change video",
          });
        }

        if (typeof videoUrl !== "string" || !videoUrl.trim()) {
          return callback?.({
            success: false,
            message: "Valid video URL is required",
          });
        }

        const videoId = extractYouTubeVideoId(videoUrl.trim());

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
          playbackState: "paused",
          currentTime: 0,
        });

        callback?.({ success: true });
      } catch (error) {
        console.error("Change video error:", error);
        callback?.({ success: false, message: "Video change failed" });
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
