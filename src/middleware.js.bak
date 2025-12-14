import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public paths without authentication
        const publicPaths = [
          '/login',
          '/register', 
          '/forgot-password',
          '/reset-password',
          '/api/auth',
          '/manifest.json',
          '/sw.js',
          '/icons',
          '/offline',
          '/_next',
          '/favicon.ico'
        ]

        const pathname = req.nextUrl.pathname

        // Check if path is public
        const isPublicPath = publicPaths.some(path => 
          pathname.startsWith(path) || pathname === path
        )

        if (isPublicPath) {
          return true
        }

        // Require authentication for all other paths
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.png$|.*\\.svg$|.*\\.jpg$|manifest.json|sw.js).*)'
  ]
}