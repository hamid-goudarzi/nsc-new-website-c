// Lets the admin know when a saved change has gone live.
export const GET = () => new Response(JSON.stringify({ builtAt: new Date().toISOString(), commit: process.env.VERCEL_GIT_COMMIT_SHA || null }), { headers: { 'Content-Type': 'application/json' } });
