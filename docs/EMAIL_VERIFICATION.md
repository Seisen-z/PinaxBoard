# Tackly account verification

## Flow

Registration keeps the password in Supabase Auth and sends a six-digit code. The application stores only a normalized pending email and a UI cooldown timestamp in HTTP-only, SameSite=Lax cookies (30-minute lifetime; Secure in production). A valid code confirms the email and starts the normal Supabase session. Unconfirmed password sign-in opens the same verification screen without sending another email automatically.

Six individually labelled digit boxes support numeric keyboards, auto-advance, Backspace/arrow/Home/End navigation, complete-code paste into any box, and one-time-code autofill on the first box. The form submits the same combined six-digit `code` field; incomplete boxes block submission. Resend has a visible 60-second countdown. Change email clears pending state and returns to registration. Wrong, expired and consumed codes never create a session; a missing pending cookie returns to registration. The app remains usable locally when signed out.

## Active provider settings

- Confirmation required; six-digit email OTP, expiration 600 seconds.
- Confirmation subject: `Your Tackly verification code`.
- Template: `supabase/templates/confirm-signup.html`, with `{{ .Token }}`. The message contains Tackly branding, no provider branding, external assets or tracking links.
- Custom SMTP sender: Tackly, `tackly.no@gmail.com`; Gmail TLS port 465.
- SMTP minimum frequency: 60 seconds. Provider email quota: 30/hour for this project; delivery is also subject to Gmail limits.
- OTP expiration is a project-level Auth setting, not limited to this page. Existing other Auth templates remain unchanged.

Keep SMTP credentials only in `.env.local` and the provider's private SMTP configuration. The Gmail account that generated the app password must match SMTP_USER and the sender email. A display name can be Tackly; the Gmail address is an actual account, not an invented address.

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tackly.no@gmail.com
SMTP_PASS=
SMTP_FROM_NAME=Tackly
```

Changing the local SMTP password does not by itself update hosted Auth SMTP; apply it through the Auth SMTP settings or the credential-reading Management API helper. Never commit the environment file, app password or Management access token.

## Durable application limits

Migration `0010_signup_verification_limits.sql` installs a private RLS-enabled limiter and a service-role-only RPC. The server SHA-256 hashes the normalized destination before submitting the rate key; the table holds no raw addresses, passwords, codes or note content.

- Send: 3 attempts per 15-minute window, at least 60 seconds apart.
- Verify: 5 attempts per 10-minute window.
- Concurrent requests serialize on the rate row. Browser countdowns and pending-cookie timestamps do not authorize sends or reset server limits.
- Service/limiter failure fails closed with a retryable message. Denied attempts do not inflate the counter. Send failures consume a slot to bound repeated failing delivery attempts.
- Entries older than one day are removed opportunistically on another limiter call; retention cleanup is not a separate guaranteed daily job.

These limits cover the application's server actions. Direct calls to Supabase's public Auth endpoints remain subject to the provider's independent rate limits, not this application RPC. Anonymous and authenticated API roles cannot execute the limiter or read its state.

## Rollout and rollback

Apply migration 0010 before deploying the new server actions, then configure the hosted confirmation template/SMTP and restart the app with the same project credentials. The service-role key stays server-only.

Source rollback restores the old signup branch (confirmation-link success message); it does not change hosted Auth settings or delete accounts. Restore the original confirmation template, subject, OTP settings and send quota when rolling back the flow, then apply `supabase/rollback/0010_signup_verification_limits.sql` only after the new actions are retired. The SMTP account remains the explicitly configured sender; no real account or workspace is deleted by the rollback.

Current validation and email-delivery status: `../../otp-email-evidence/VERIFICATION.txt`. Provider-issued test codes establish real verification/session behavior independently of inbox delivery; they are not delivery proof. Preview screenshots use a fake code.
