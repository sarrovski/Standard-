# Standard v14 — Realistic Auth Flow

## Main changes

- Reworked login to feel like a real SaaS auth flow.
- Removed visible role-picking cards from `/login`.
- Added one clean login form:
  - email
  - password
  - forgot password
  - create account
- Added `/signup`.
- Added `/auth-routing` to explain/simulate automatic post-login routing.
- Role detection is now described as backend logic:
  - Admin -> `/admin`
  - Seller + active subscription -> `/dashboard`
  - Seller without active subscription -> `/account?view=sell`
  - User -> `/account`
- Navbar stays public and simple:
  - Marketplace
  - Sell on Standard
  - How it works
  - Trust
  - Terms
  - Login
- Internal pages are still reachable after login/redirect, but are not shown as public nav items.

## Routes

- `/`
- `/marketplace`
- `/trust`
- `/terms`
- `/login`
- `/signup`
- `/auth-routing`
- `/account`
- `/dashboard`
- `/admin`
