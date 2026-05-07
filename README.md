# Standard v9 — Dashboard + No Claim System

Frontend-only MVP for Standard.

## Main change

The claim system has been removed.

Instead:
- users login from the top right
- users land in their buyer account
- sellers with an active seller subscription get a full seller dashboard
- resellers with an active reseller subscription get reseller offer tools
- admins approve/reject seller submissions, reseller offers, payment profiles, and listings

## Routes

- `/`
- `/marketplace`
- `/listings/phantomx-tracker`
- `/login`
- `/account`
- `/dashboard`
- `/dashboard?tab=listings`
- `/dashboard?tab=builder`
- `/dashboard?tab=offers`
- `/dashboard?tab=payments`
- `/dashboard?tab=analytics`
- `/dashboard?tab=billing`
- `/admin`

## Tech

- Next.js 14
- Tailwind CSS
- No Prisma
- No database
- No auth provider yet
- Mock role-based login flow
