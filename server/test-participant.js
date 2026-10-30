import { io } from "socket.io-client";

const PARTICIPANT_TOKEN = "process.env.PARTICIPANT_TOKEN";
const ROOM_CODE = "CB534995";

const socket = io("http://localhost:5003", {
  auth: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YWUzZDFhODQ2NDU1NjA1OTVjYTdmNjEiLCJpYXQiOjE3OTM0MDMxNTksImV4cCI6MTc5MzQ4OTU1OX0.gtOVN7w_N5H4pjgYdM40u2xpwWZ9RK9cJdcWrNwDLJ4",
  },
});

socket.on("connect", () => {
  console.log("Participant connected:", socket.id);

  console.log("Sending join-room...");

  socket.emit("join-room", { roomCode: "CB534995" });
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
