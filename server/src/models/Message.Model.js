import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emoji: {
      type: String,
      required: true,
      maxlength: 16,
    },
  },
  { timestamps: true },
);

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Video timestamp where this message/reaction happened
    videoTime: {
      type: Number,
      min: 0,
      default: null,
    },

    reactions: [reactionSchema],
  },
  { timestamps: true },
);

messageSchema.index({ room: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
