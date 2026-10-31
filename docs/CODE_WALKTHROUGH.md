# Code walkthrough guide

A short walkthrough can follow the same path as a user entering a watch party.

## 1. Start at the client

- `client/src/App.jsx` declares page routes and protects room pages.
- `client/src/context/AuthContext.jsx` loads the current user and handles signup, login, and logout.
- `client/src/lib/api.js` configures Axios with the API base URL and credentialed cookie requests.
- `client/src/pages/WatchRoom.jsx` connects the room UI, YouTube IFrame Player, REST calls, and Socket.IO events.

## 2. Explain the server

- `server/src/server.js` connects MongoDB, creates the HTTP server, and initializes Socket.IO.
- `server/src/app.js` configures CORS, cookies, JSON parsing, health check, and API routes.
- `server/src/routes/auth.routes.js` and `server/src/controllers/user.controller.js` implement account creation, JWT login, and password reset.
- `server/src/middleware/auth.middleware.js` verifies JWT cookies for protected HTTP routes.
- `server/src/models/Room.js` defines room membership, join requests, playback state, and control requests.
- `server/src/controllers/Room.controller.js` handles room creation, discovery, join approval, and participant management.
- `server/src/sockets/socket.js` authenticates sockets, checks room membership, handles real-time events, and broadcasts approved playback changes.

## 3. Demonstrate the end-to-end flow

1. Create two accounts in separate browsers or sessions and log in.
2. Create a room in one session and use its invite code in the other.
3. Show that the participant request appears for the host, then approve it.
4. Send a chat message and show it arrive in the other session.
5. As a participant, request pause or seek; approve or decline it as host and observe the result.
6. Add a YouTube URL to the queue and demonstrate synchronized playback.

## 4. Technologies and design choices to explain

- **React + Vite:** component-based client and fast local development/build.
- **Express:** REST endpoints for authentication and room management.
- **Socket.IO:** persistent, bidirectional events for chat, presence, approvals, and playback sync.
- **MongoDB/Mongoose:** durable storage and schema validation for users, rooms, requests, and messages.
- **JWT + HTTP-only cookie:** session authentication shared by HTTP and Socket.IO without exposing the token to browser JavaScript.
- **YouTube IFrame Player API:** embeds videos and applies synchronized play, pause, and seek commands.


- Render free services may sleep between visits, causing a cold start.
- Browser third-party-cookie policies can affect authentication when Vercel and Render use unrelated domains; a shared custom domain is the reliable production setup.
- Password-reset email requires an email provider. Render's free service cannot make outbound SMTP connections.
- The backend package currently has no automated test suite configured.
