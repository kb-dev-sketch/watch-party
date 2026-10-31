# Watch Party client

React and Vite client for the Watch Party API.

## Local setup

1. Copy `.env.example` to `.env` and set `VITE_API_URL` and `VITE_SOCKET_URL` for your backend.
2. Install dependencies with `npm install`.
3. Start the client with `npm run dev`.

The client uses the backend's HTTP only `watchparty_token` cookie for API and Socket.IO authentication. Configure the backend `CLIENT_URL` to match the client origin and enable credentialed CORS.

Rooms are invite-only. A participant must enter a room code and receive host approval before joining; rooms are not listed publicly.

## Production build

Set the two Vite environment variables to the deployed API and Socket.IO origins, then run `npm run build`. Vite writes the static site to `dist/`.
