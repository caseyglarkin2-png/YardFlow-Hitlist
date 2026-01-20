export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*'],
  runtime: 'nodejs', // Force Node.js runtime for bcryptjs compatibility
};
