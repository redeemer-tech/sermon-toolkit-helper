This is the Redeemer sermon toolkit generator. It creates small-group material from a sermon transcript and retains sermon/toolkit history so new discussion questions can take recent weeks into account.

## Environment

The server requires:

```text
OPENAI_API_KEY
GROQ_API_KEY
APP_PASSWORD
BLOB_READ_WRITE_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AUTH_SESSION_SECRET
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must point to the Redeemer Supabase project. `AUTH_SESSION_SECRET` must be at least 32 characters and signs the HTTP-only church session cookie. `APP_PASSWORD` is retained only for compatibility with older deployments and is not used by the church login flow.

Apply the migrations in `supabase/migrations` before generating a toolkit. Church accounts are created manually in the service-role-only `churches` table; there is intentionally no sign-up or public account-creation endpoint. Each sermon session, saved toolkit, recent-history query, and edited system prompt is scoped to the logged-in church.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
