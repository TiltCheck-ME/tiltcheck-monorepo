# TiltCheck Auto-Claimer Web Frontend

Web interface for users to submit their Stake API keys and view claim results.

## Features

- Simple, single-page interface
- Secure API key submission (keys never exposed to client after submission)
- Real-time claim status updates
- Claim history with filtering (claimed/skipped/failed)
- Responsive design
- No login required (userId-based sessions)

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Create `.env` file:

```bash
# Backend API URL (for production deployment)
VITE_API_URL=https://api.tiltcheck.com
```

In development, API requests are proxied to `http://localhost:8080`.

## Usage Flow

1. User visits the page
2. User enters their Stake API key
3. Frontend submits key to `/api/claim/submit`
4. Backend returns a userId
5. Frontend stores userId in localStorage
6. Frontend polls `/api/claim/status/:userId` for updates
7. User can view detailed history at `/api/claim/history/:userId`

## Security

- API keys are submitted once and stored encrypted server-side
- Frontend never stores API keys (only userId)
- All claims are processed server-side
- HTTPS required in production
- CORS configured for allowed origins

## Deployment

### Static Hosting (GitHub Pages / Vercel)

```bash
pnpm build
# Upload dist/ folder to static hosting
```

### Railway

The backend server can serve the static frontend:

```bash
# Build frontend
cd apps/web
pnpm build

# Copy to backend public folder
cp -r dist/* ../../backend/public/

# Deploy backend (will serve frontend)
cd ../../backend
railway up
```

## Project Structure

```
apps/web/
├── public/          # Static assets
├── src/
│   ├── App.tsx      # Main app component
│   ├── main.tsx     # Entry point
│   ├── api.ts       # API client
│   └── types.ts     # TypeScript types
├── index.html       # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```
