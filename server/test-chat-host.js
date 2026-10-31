import { io } from "socket.io-client";

const HOST_TOKEN = process.env.HOST_TOKEN;
if (!HOST_TOKEN) throw new Error("Set HOST_TOKEN in the environment before running this script");

const socket = io("http://localhost:5003", {
  auth: {
    token: HOST_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Host connected:", socket.id);

  socket.emit("join-room", "CB534995", (response) => {
    console.log("Host join response:", response);

    if (!response?.success) return;

    // 1. Change Video
    socket.emit(
      "change-video",
      {
        roomCode: "CB534995",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      (result) => {
        console.log("Change video response:", result);

        if (!result?.success) return;

        // 2. Play Video
        socket.emit(
          "play-video",
          {
            roomCode: "CB534995",
            currentTime: 30,
          },
          (playResponse) => {
            console.log("Play response:", playResponse);

            // 3. Pause Video
            socket.emit(
              "pause-video",
              {
                roomCode: "CB534995",
                currentTime: 45,
              },
              (pauseResponse) => {
                console.log("Pause response:", pauseResponse);

                // 4. Seek Video
                socket.emit(
                  "seek-video",
                  {
                    roomCode: "CB534995",
                    currentTime: 90,
                  },
                  (seekResponse) => {
                    console.log("Seek response:", seekResponse);
                  },
                );
              },
            );
          },
        );
      },
    );
  });
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Host disconnected:", reason);
});
