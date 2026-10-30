import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    videoUrl: {
      type: String,
      default: "",
    },

    playbackState: {
      type: String,
      enum: ["playing", "paused"],
      default: "paused",
    },

    currentTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastPlaybackUpdate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
