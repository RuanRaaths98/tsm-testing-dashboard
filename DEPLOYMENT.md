# Buyer Behaviour Review Deployment

## Local app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase-schema.sql`.
4. Copy your project URL and anon key into Vercel as:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Without these variables, the app still works locally using browser storage. With them, client dashboards sync through Supabase.

## Vercel setup

1. Push this `buyer-review-app` folder to GitHub.
2. Import the repo in Vercel.
3. Add the two Supabase environment variables.
4. Deploy.
5. Add your custom domain in Vercel, for example `reviews.youragency.com`.

## Security note

The included Supabase policies are intentionally permissive for a fast internal launch. Before sharing beyond your internal team, put the Vercel deployment behind password protection or replace the policies with authenticated-user policies.
