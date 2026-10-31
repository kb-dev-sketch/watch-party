import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    sessionVersion: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    passwordResetSentAt: { type: Date, default: null, select: false },
    passwordResetWindowStartedAt: { type: Date, default: null, select: false },
    passwordResetSendCount: { type: Number, default: 0, select: false },

    avatarUrl: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtpHash: { type: String, select: false, default: null },
    emailVerificationOtpExpiresAt: { type: Date, select: false, default: null },
    emailVerificationOtpSentAt: { type: Date, select: false, default: null },
    emailVerificationOtpWindowStartedAt: { type: Date, select: false, default: null },
    emailVerificationOtpSendCount: { type: Number, select: false, default: 0 },
    emailVerificationOtpFailedAttempts: { type: Number, select: false, default: 0 },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
