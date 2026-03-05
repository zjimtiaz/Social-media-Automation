#!/bin/sh
# Runtime replacement of NEXT_PUBLIC_ env vars in built JS files.
# Next.js inlines these at build time, so we swap placeholders with
# real values from Railway environment variables at container start.

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ "$NEXT_PUBLIC_SUPABASE_URL" != "https://placeholder.supabase.co" ]; then
  echo "Injecting runtime NEXT_PUBLIC_SUPABASE_URL..."
  find /app/.next -name "*.js" -exec sed -i "s|https://placeholder.supabase.co|${NEXT_PUBLIC_SUPABASE_URL}|g" {} +
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" != "placeholder-anon-key" ]; then
  echo "Injecting runtime NEXT_PUBLIC_SUPABASE_ANON_KEY..."
  find /app/.next -name "*.js" -exec sed -i "s|placeholder-anon-key|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" {} +
fi

echo "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
