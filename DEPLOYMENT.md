# Deployment

The client is deployed as a Vite SPA on Vercel. The Express and Socket.IO server is a Node web service on Render.

## Render API

1. Push this repository to GitHub and create a Render Blueprint from its root `render.yaml`.
2. Set `MONGODB_URI` to the production MongoDB connection string.
3. Set `CLIENT_URL` to the exact Vercel production origin (for example, `https://watch-party.vercel.app`).
4. Set `EMAIL_USER` and `EMAIL_PASS` to the Gmail account and its 16-character Google App Password.
5. Keep the generated `JWT_SECRET` private. Render uses `/api/health` as the service health check.

The API and Socket.IO server share the same Render origin. The frontend must use that origin for both configured URLs.

The Blueprint uses Render's free plan for an initial deployment. Free services can sleep after inactivity and can restart; use a paid plan for a production watch party that needs consistently fast API and socket availability.

## Vercel client

1. Import the same repository into Vercel and set the project root directory to `client`.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Add these production environment variables, replacing the API hostname with the deployed Render hostname:

   ```ini
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
   VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

4. Deploy the client, copy its production origin into Render's `CLIENT_URL`, then redeploy the API.

The `client/vercel.json` rewrite keeps React Router paths such as `/verify-email` and `/reset-password` working on direct visits.

## Cookie and domain note

The app authenticates with an HTTP-only cookie. For reliable Safari behavior, use custom frontend and API subdomains under the same registrable domain (for example, `watch.example.com` and `api.example.com`). The default `vercel.app` and `onrender.com` domains are cross-site, and browser privacy rules can block cross-site cookies.

The in-process rate limiter is per server instance. Use a shared store before scaling the API to multiple instances.
