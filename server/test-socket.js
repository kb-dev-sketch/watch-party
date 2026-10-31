import { io } from "socket.io-client";

const HOST_TOKEN = process.env.HOST_TOKEN;
if (!HOST_TOKEN) throw new Error("Set HOST_TOKEN in the environment before running this script");

const ROOM_CODE = "CB534995";

const socket = io("http://localhost:5003", {
  auth: {
    token: HOST_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("join-room", ROOM_CODE, (response) => {
    console.log("Join response:", response);
  });
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});

socket.on("control-request-received", (data) => {
  console.log("Control request received:", data);
});

socket.on("video-paused", (data) => {
  console.log("Video paused:", data);
});
