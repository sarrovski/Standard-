# Standard v16 — Payment Verification

## Main changes

- Sellers can no longer simply claim they accept a payment method.
- Every payment method now has a verification status:
  - Pending verification
  - Verified
  - Rejected
  - Needs re-check
- Public marketplace filters only use **Verified** payment methods.
- Public cards/pages show:
  - Verified accepted payments
  - Payment methods under review
- Rejected methods are kept for admin/seller context, not public promotion.
- Seller dashboard now has a stronger Payment Verification workflow.
- Admin has a Payment Verification Queue.

## Why

This prevents sellers from listing Card, PayPal, Crypto, or other methods just to attract buyers if they do not actually accept them.
