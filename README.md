# Watch Party

A real-time YouTube watch-party app. Create private rooms, invite people with a room code, approve join requests, chat, and synchronize playback.

## Live deployment

- **Frontend (Vercel):** `https://<your-vercel-production-domain>` — replace this with the Production URL shown in the Vercel project dashboard. The actual Vercel hostname is not stored in this repository.
- **Backend API (Render):** <https://watch-party-svw7.onrender.com>
- **Health check:** <https://watch-party-svw7.onrender.com/api/health>
- **Socket.IO:** `https://watch-party-svw7.onrender.com` (same Render service as the API)

The Render free service may take a short time to wake after inactivity.

## Features

- JWT authentication in an HTTP-only cookie
- Private watch rooms with host-approved join requests
- Real-time chat, participant management, and synchronized YouTube playback
- Playback control requests that hosts or moderators can approve or decline
- Video queue and room discovery
- Password reset by email when an email provider is configured

## Technologies

- **Client:** React 19, Vite, React Router, Socket.IO Client, Axios
- **Server:** Node.js, Express 5, Socket.IO
- **Data:** MongoDB with Mongoose
- **Authentication:** JWT, HTTP-only cookies, bcryptjs
- **Deployment:** Vercel (client) and Render (API + WebSockets)

## Local setup

### Requirements

- Node.js 22.12 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string

### 1. Configure the server

```bash
cd server
npm install
cp .env.example .env
```

Set these values in `server/.env`:

```ini
PORT=5003
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/watch-party
JWT_SECRET=replace_with_a_long_random_secret
```

`EMAIL_USER` and `EMAIL_PASS` are only needed for password-reset emails. They are not needed for signup or login. Never commit `.env` or share its secrets.

Start the API and Socket.IO server in this terminal:

```bash
npm run dev
```

### 2. Configure and start the client

In a second terminal from the repository root:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The local client config is:

```ini
VITE_API_URL=http://localhost:5003/api/v1
VITE_SOCKET_URL=http://localhost:5003
```

Open <http://localhost:5173>. The API health endpoint is <http://localhost:5003/api/health>.

## Production environment

For Vercel, set `VITE_API_URL` to `https://watch-party-svw7.onrender.com/api/v1` and `VITE_SOCKET_URL` to `https://watch-party-svw7.onrender.com`. For Render, set `CLIENT_URL` to the exact Vercel production origin and configure `MONGODB_URI` and a strong `JWT_SECRET`. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment steps and cookie/domain notes.

Render's free web services block outbound SMTP. If password-reset emails are required, configure an email provider's HTTPS API or use a paid service with SMTP access.

## Architecture and walkthrough

- [Architecture overview](docs/ARCHITECTURE.md) — request flow, authentication, and how Socket.IO coordinates rooms and playback.
- [Code walkthrough guide](docs/CODE_WALKTHROUGH.md) — key files and a concise presentation order.

