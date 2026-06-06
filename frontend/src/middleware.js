import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Read cookies for session status and role
  const sessionToken = request.cookies.get('timesheet_session');
  const userRole = request.cookies.get('user_role')?.value;
  const isAuthenticated = !!sessionToken;

  // Public/Auth routes
  const isAuthRoute = pathname.startsWith('/login') || 
                      pathname.startsWith('/signup') || 
                      pathname.startsWith('/invite');

  // Static assets or next internal routes
  const isStaticFile = pathname.includes('.') || 
                       pathname.startsWith('/_next') || 
                       pathname.startsWith('/api');

  if (isStaticFile) {
    return NextResponse.next();
  }

  // Redirect logic
  if (!isAuthenticated && !isAuthRoute) {
    // If not authenticated and trying to access portal pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthRoute) {
    // If authenticated and trying to access auth pages, redirect to dashboard
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Client-side role-based routing checks in middleware as an extra guard
  if (isAuthenticated) {
    // Admin cannot access timesheet submission bulk page or edit-requests page
    if (pathname.startsWith('/timesheet/bulk') || pathname.startsWith('/edit-requests')) {
      if (userRole === 'admin') {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    // Admin only pages
    if (pathname.startsWith('/audit') || pathname.startsWith('/users')) {
      if (userRole !== 'admin') {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    // Manager / Admin pages
    if (pathname.startsWith('/team') || 
        pathname.startsWith('/clients') || 
        pathname.startsWith('/categories') || 
        pathname.startsWith('/reports')) {
      if (userRole !== 'manager' && userRole !== 'admin') {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply to all routes except static, _next, favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
