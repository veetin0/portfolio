/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` and `next build` both write to the same directory, so running a
  // build while a dev server is live corrupts its chunks and the page renders
  // half-styled. Set NEXT_DIST_DIR to build into a scratch directory instead:
  //
  //   NEXT_DIST_DIR=.next-verify npm run build
  //
  // See `npm run verify`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },

  /**
   * Security headers.
   *
   * Be clear-eyed about what this buys: the CSP below allows 'unsafe-inline'
   * for scripts, because Next injects an inline bootstrap and the RSC payload
   * on every page, and their content changes per build so hashes are not
   * practical. A nonce-based policy needs middleware, which forces dynamic
   * rendering and would give up the fully-static output.
   *
   * So script-src is NOT meaningful XSS mitigation here. The real protection is
   * that no untrusted input reaches the DOM: the URL hash is only ever used as
   * a lookup key against an allow-list in DeepLink, and everything else is
   * React text nodes.
   *
   * What these headers do earn:
   *   frame-ancestors / X-Frame-Options  — nobody can iframe the site and pass
   *                                        it off as theirs
   *   object-src 'none'                  — no Flash/plugin embedding
   *   base-uri 'self'                    — no <base> hijack of relative URLs
   *   form-action 'self'                 — a form can't be pointed off-site
   *   nosniff                            — no MIME confusion on the downloads
   *   Referrer-Policy                    — stop leaking full URLs to sites you
   *                                        link out to
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // Vercel Analytics is same-origin (/_vercel/insights/*), so 'self' covers it.
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
