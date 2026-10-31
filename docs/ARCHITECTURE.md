# Architecture overview

## Components

```text
React/Vite browser
  ├─ Axios REST calls ───────────────> Express API ─────> MongoDB
  ├─ Socket.IO connection/events ────> Socket.IO server ─> MongoDB
  └─ YouTube IFrame Player API <───── synchronized playback events
```

The client is a Vite single-page app hosted on Vercel. The Express API and Socket.IO server share one Node.js process and Render origin. MongoDB stores users, rooms, join requests, control requests, and chat messages.

## Authentication

Signup and login are HTTP requests. The server hashes passwords with bcryptjs, signs a JWT, and returns it in the `watchparty_token` HTTP-only cookie. Axios sends credentialed requests, and Socket.IO authenticates each connection from that cookie. The server checks the JWT and session version before attaching the user to the socket. The browser cannot read the HTTP-only cookie from JavaScript.

## Room and playback flow

1. A host creates a room. The server stores the host as a participant and returns a room code.
2. A participant asks to join using that code. The request is stored in MongoDB as pending and sent to the host over a private Socket.IO user channel.
3. On approval, the server records the participant, joins their active sockets to the room channel, and emits `join-approved`. The client fetches the updated room and joins the Socket.IO room.
4. Chat, participant changes, and playback updates are sent as Socket.IO events. The server verifies room membership before accepting room events.
5. Participants without playback permission send `request-control` events for play, pause, seek, or video changes. The server stores these requests; a host or moderator reviews them through `approve-control` or `reject-control`.
6. On approval, the server persists playback state and broadcasts the corresponding event (`video-played`, `video-paused`, `video-seeked`, or `video-changed`). Each client applies it to its YouTube IFrame player.

Socket.IO carries the immediate real-time updates; MongoDB is the persistent source for room state and pending requests.

## Deployment notes

- Render serves the API and WebSocket connection at `https://watch-party-svw7.onrender.com`.
- Vercel serves the client. Configure `VITE_API_URL`, `VITE_SOCKET_URL`, and Render's `CLIENT_URL` to match the deployed origins.
- For reliable cross-site cookie behavior, especially in Safari, use frontend and API subdomains under the same custom domain. See [DEPLOYMENT.md](../DEPLOYMENT.md).
