export { default } from "next-auth/middleware"

export const config = { 
  matcher: [
    "/dashboard/:path*",
    "/operador-caixa/:path*",
    "/supervisor-caixa/:path*",
    "/supervisor-conferencia/:path*",
    "/admin/:path*",
    // Add other authenticated routes here
  ] 
};

// Basic middleware example, more complex logic for MFA redirection would go here
// For example, checking session.user.mfaEnabled and current path.
// This simple version just ensures authentication for matched routes.
