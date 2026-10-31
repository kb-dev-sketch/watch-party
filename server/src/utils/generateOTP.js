import { randomInt } from "node:crypto";

export const generateOTP = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
