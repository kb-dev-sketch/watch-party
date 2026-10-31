import { io } from "socket.io-client";

const PARTICIPANT_TOKEN = process.env.PARTICIPANT_TOKEN;
const ROOM_CODE = "CB534995";

if (!PARTICIPANT_TOKEN) throw new Error("Set PARTICIPANT_TOKEN in the environment before running this script");

const socket = io("http://localhost:5003", {
  auth: {
    token: PARTICIPANT_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Participant connected:", socket.id);

  console.log("Sending join-room...");

  socket.emit("join-room", ROOM_CODE, (response) => console.log("Join response:", response));
});

socket.on("sync-state", (data) => {
  console.log("Room joined! Sync state:", data);

  console.log("Sending pause request...");

  socket.emit(
    "request-control",
    {
      roomCode: "CB534995",
      action: "pause",
      payload: { currentTime: 120 },
    },
    (result) => {
      console.log("Request response:", result);
    },
  );
});

socket.on("control-request-result", (data) => {
  console.log("Control request result:", data);
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});
