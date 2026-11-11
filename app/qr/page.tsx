import type { Metadata } from 'next'
import { Shell } from '@/components/Shell'

/**
 * Where the printed QR code points. Scanning it lands here, not on `/`.
 *
 * Why a route and not `?ref=qr`: Vercel Web Analytics records the pathname on
 * every plan, but its docs say nothing about whether generic query strings are
 * kept or stripped, and the one documented query feature — UTM parameters — is
 * a paid add-on. Custom events (`track()`) are Pro and up. A distinct path is
 * the only mechanism documented to work on any plan, so scans appear in
 * Analytics as their own row next to `/`.
 *
 * Why not a redirect: a 308 from /qr to / is resolved before any HTML is
 * served, so the analytics script never runs and the scan is never counted.
 * This renders the real thing instead — a scan lands on the portfolio itself,
 * with no interstitial and no extra tap.
 *
 * noindex keeps it out of search as a duplicate of the homepage. The canonical
 * in the root layout already points at the site root, and it is deliberately
 * absent from sitemap.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function Page() {
  return <Shell />
}
