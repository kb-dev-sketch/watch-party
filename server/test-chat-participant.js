import { io } from "socket.io-client";

const socket = io("http://localhost:5003", {
  auth: {
    token: process.env.PARTICIPANT_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Participant connected:", socket.id);

  socket.emit("join-room", "CB534995", (response) => {
    console.log("Participant join response:", response);
    //
    socket.on("message-reaction-updated", (data) => {
      console.log("Reaction updated:", data);
    });
    if (response?.success) {
      socket.emit(
        "send-message",
        {
          roomCode: "CB534995",
          text: "Hello everyone! 😂",
          videoTime: 120,
        },
        (result) => {
          console.log("Send message response:", result);
        },
      );
    }
  });
});
socket.on("sync-state", (state) => {
  console.log("RECOVERED PLAYBACK STATE:", state);
});

socket.on("new-message", (message) => {
  console.log("Participant received message:", message);
});
socket.on("video-changed", (data) => {
  console.log("Participant received new video:", data);
});
socket.on("video-played", (data) => {
  console.log("Video played:", data);
});

socket.on("video-paused", (data) => {
  console.log("Video paused:", data);
});

socket.on("video-seeked", (data) => {
  console.log("Video seeked:", data);
});
socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});
