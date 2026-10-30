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
    controlRequests: [
      {
        requester: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        action: {
          type: String,
          enum: ["play", "pause", "seek", "change-video"],
          required: true,
        },

        payload: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
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

        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
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
