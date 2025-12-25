import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Define your protected routes here
// Using (.*) allows matching sub-routes (e.g., /dashboard/settings)
const isProtectedRoute = createRouteMatcher([
  '/notifications(.*)',
  '/admin(.*)',
  '/report(.*)',
  '/report-issue(.*)',
  '/status(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. Check if the current route is protected
  if (isProtectedRoute(req)) {
    // 3. If protected, enforce authentication
    // This will redirect unauthenticated users to the sign-in page
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};