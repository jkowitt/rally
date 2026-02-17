# Rally

Fan engagement platform for college and professional sports. Fans earn points by attending events, checking in at venues, making predictions, and participating in game-day lobbies. The platform includes social features like crews, head-to-head comparisons, shareable fan cards, and a tiered loyalty system.

## Architecture

| Layer | Tech | Directory |
|-------|------|-----------|
| API Server | Express + Prisma + PostgreSQL | `server/` |
| Web App | Next.js 14 (App Router) | `website/` |
| Mobile (React Native) | Expo | `RallyPreview/` |
| iOS Native | Swift / SwiftUI | `Rally/`, `Packages/` |
| Android Native | Kotlin / Jetpack Compose | `Android/` |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm

### Server

```bash
cd server
npm install
cp .env.example .env          # set DATABASE_URL, JWT_SECRET
npx prisma db push             # create tables
npm run db:seed                # seed schools + sample events
npm run dev                    # http://localhost:3001
```

### Website

```bash
cd website
npm install
npm run dev                    # http://localhost:3000
```

### Docker (full stack)

```bash
docker compose up --build      # API on :3001, web on :3000, Postgres on :5432
```

## API Reference

Base URL: `http://localhost:3001/api`

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account (name, email, password, handle, favoriteSchool) |
| POST | `/auth/login` | No | Sign in, returns JWT |
| POST | `/auth/check-handle` | No | Validate handle for profanity/availability |
| GET | `/auth/me` | Yes | Current user profile |
| PUT | `/auth/profile` | Yes | Update profile fields |
| PUT | `/auth/handle` | Yes | Change handle (moderation enforced) |
| POST | `/auth/forgot-password` | No | Send password reset email |
| POST | `/auth/reset-password` | No | Reset password with token |

### Schools

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/schools` | No | List all schools |
| GET | `/schools/:id` | No | School detail |

### Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | Optional | List events (filter by school, sport, date range) |
| GET | `/events/:id` | Optional | Event detail with activations |
| POST | `/events` | Admin | Create event |
| PUT | `/events/:id` | Admin | Update event |
| POST | `/events/:id/earn` | Yes | Earn points for an activation |

### Fan Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/fan-profile/me` | Yes | Get my fan profile + milestones |
| PUT | `/fan-profile/me` | Yes | Update bio, favorite chant, sport breakdown |
| GET | `/fan-profile/:handle` | Optional | View a fan's public profile |

### Game Lobby

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/game-lobby/:eventId` | Yes | Get or create lobby for an event |
| POST | `/game-lobby/:lobbyId/checkin` | Yes | Check in to lobby |
| POST | `/game-lobby/:lobbyId/reaction` | Yes | Send a reaction (CHEER, BOO, WAVE, etc.) |

### Crews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/crews/mine` | Yes | My crew memberships |
| POST | `/crews` | Yes | Create a crew |
| GET | `/crews/:id` | Yes | Crew detail with members |
| POST | `/crews/:id/join` | Yes | Join a crew |
| POST | `/crews/:id/leave` | Yes | Leave a crew |
| POST | `/crews/:id/promote` | Yes | Promote member (CAPTAIN only) |

### Share Cards

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/share-cards/mine` | Yes | My share cards |
| GET | `/share-cards/:id` | Optional | View a share card (increments views) |
| POST | `/share-cards/fan-resume` | Yes | Generate fan resume card |
| POST | `/share-cards/milestone/:id` | Yes | Create milestone share card |
| POST | `/share-cards/head-to-head` | Yes | Generate H2H comparison card |
| POST | `/share-cards/:id/shared` | Yes | Track share event |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users with filters |
| GET | `/health` | No | Health check |
| GET | `/notifications` | Yes | User notifications |
| GET | `/affiliates` | Yes | Affiliate offers |
| GET | `/monetization/settings` | Admin | Ad/monetization config |

## Data Models

21 Prisma models covering:

- **Users & Auth** — RallyUser (tiers, handles, warnings, points)
- **Schools & Events** — School, Event, EventActivation
- **Points & Rewards** — PointsEntry, Reward, BonusOffer
- **Social Identity** — FanProfile, GameLobby, LobbyPresence, LobbyReaction, Crew, CrewMember, FanMilestone, ShareCard
- **Platform** — Notification, AnalyticsEvent, AffiliateOffer, MonetizationSettings, ContentItem, TeammateInvitation

## Tier System

| Tier | Points Required |
|------|----------------|
| Bronze | 0 |
| Silver | 500 |
| Gold | 2,000 |
| Platinum | 10,000 |

## Handle Moderation

Usernames go through a multi-layer filter:

1. **Blocklist** — exact match against known slurs/profanity
2. **Substring scan** — checks for blocked words embedded in longer strings
3. **Leet-speak normalization** — `$` -> s, `1` -> i, `0` -> o, `3` -> e, `@` -> a, `!` -> i
4. **Repeated char collapse** — `fuuuuck` -> `fuck`

Enforcement escalates: Warning 1 -> Warning 2 (final) -> Forced rename with 72-hour lock.

## Security

- JWT authentication with bcrypt password hashing
- Rate limiting on auth endpoints (10-20 req/15min) and API-wide (120 req/min)
- Zod schema validation on all write endpoints
- 1 MB request body limit
- Server-side warning count tracking (no client bypass)

## Testing

```bash
cd server
npm test              # run all tests
npm run test:watch    # watch mode
```

43 unit tests covering handle moderation, tier computation, and input validation schemas.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | Server port (default: 3001) |
| `DISABLE_SCHEDULER` | Set `true` to skip ESPN auto-sync |

## License

Proprietary.
