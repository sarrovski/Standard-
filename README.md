# Standard v20 — Working MVP

## Main change

This version connects the main product flows using browser localStorage.

It is not production backend yet, but it lets the product work end-to-end in-browser:

- login redirects by account type
- seller can create products
- products appear in seller dashboard
- products appear in marketplace
- dynamic product pages work for created products
- seller can submit payment verification requests
- admin can approve / reject payment requests
- featured category slots can be reserved only if available

## Important

This is the correct bridge before real backend.

Next production step:
- Auth: Clerk / Supabase Auth
- Database: Supabase Postgres / Prisma
- Uploads: UploadThing / S3 / Supabase Storage
- Payments: Stripe
- Admin permissions: backend-enforced role checks
