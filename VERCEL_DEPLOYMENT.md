# Vercel production configuration

The browser should use the same-origin Next.js HTTP proxy and connect directly
to the FastAPI WebSocket endpoint.

Configure these Vercel values for Production (and equivalent UAT values for
Preview):

```dotenv
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_API_BASE=/api/backend
NEXT_PUBLIC_WS_URL=wss://api.example.com
NEXT_PUBLIC_DEBUG_BACKEND=false
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
```

Never put the Supabase service-role key, JWT secret, AWS credentials, Pinecone
key, or model-provider keys in Vercel or in any `NEXT_PUBLIC_*` variable.

The matching backend production secret must include:

```dotenv
PUBLIC_SITE_URL=https://app.example.com
PUBLIC_BASE_URL=https://api.example.com
ALLOWED_ORIGINS=https://app.example.com
ALLOWED_HOSTS=api.example.com
VERCEL_APP_NAME=the-vercel-project-slug
```

`VERCEL_APP_NAME` permits only that project's generated preview origins. Add a
custom frontend domain explicitly to `ALLOWED_ORIGINS`. After changing any
value, redeploy the frontend so Next.js bakes the public variables into the
production build.

Production verification:

1. `https://api.example.com/health` returns HTTP 200.
2. Login, logout, password recovery, and mandatory password change work.
3. A Learn response streams over `wss://api.example.com` and shows citations.
4. Review produces all enabled question formats.
5. Assessment completes a three-step guided scenario.
6. Lecturer upload → test-query → publish works for DOCX and PPTX.
7. Browser developer tools show no mixed-content, CORS, or WebSocket errors.
