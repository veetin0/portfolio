import type { Metadata } from 'next'
import Link from 'next/link'
import { profile } from '@/data/profile'
import { SITE_URL } from '@/lib/site'

/**
 * Gym+ support page.
 *
 * Both stores require a support URL and both actually check it — a reviewer
 * landing on a portfolio homepage with no mention of the app is a reason to come
 * back with questions. This is that page.
 *
 * Deliberately answers the questions an app with no accounts and no server
 * generates: there is no password to reset and no support desk, so the useful
 * content is "how do I move my data" and "why is the app telling me this".
 *
 * Route is submitted to App Store Connect and Play Console — keep it stable.
 */

const CANONICAL = `${SITE_URL}/gymplus/support`

export const metadata: Metadata = {
  title: 'Support — Gym+',
  description:
    'Help for Gym+, the offline training log: backups, rest timer notifications, units, and how the next weight is chosen.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Support — Gym+',
    description: 'Help for Gym+, the offline training log.',
    url: CANONICAL,
    type: 'article',
  },
  robots: { index: true, follow: true },
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-base font-medium tracking-tight text-text">{q}</h2>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-muted text-pretty">
        {children}
      </div>
    </section>
  )
}

export default function GymPlusSupportPage() {
  const email = profile.links.email
  return (
    <main className="mx-auto max-w-[68ch] px-6 py-20 sm:py-28">
      <p className="eyebrow">Support</p>

      <h1 className="mt-4 text-3xl font-medium tracking-tightest text-text sm:text-4xl">Gym+</h1>

      <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted text-pretty">
        Gym+ is a training log that writes the programme too. It runs entirely on your phone —
        there is no account to sign into and no server holding your data, so most of what follows
        is about your device rather than about us.
      </p>

      <p className="mt-6 border-l-2 border-signal/70 pl-4 text-base leading-relaxed text-text">
        Something broken, or an idea?{' '}
        <a
          href={`mailto:${email}?subject=Gym%2B%20support`}
          className="underline decoration-dim underline-offset-4 transition-colors hover:decoration-signal"
        >
          {email}
        </a>
      </p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
        It is one person answering, so give it a couple of days. Saying which phone and which
        version of Gym+ you are on saves a round trip.
      </p>

      <Q q="How do I move to a new phone, or back up my training?">
        <p>
          <strong className="font-medium text-text">Profile → Export Data</strong> writes
          everything — workouts, programmes, records, settings — to a single file, and hands it to
          your share sheet. Send it wherever you like: email, cloud storage, AirDrop.
        </p>
        <p>
          On the new phone, install Gym+ and use{' '}
          <strong className="font-medium text-text">Profile → Import Data</strong> to load that
          file back. Do the export <em>before</em> you uninstall: because nothing is stored on a
          server, uninstalling deletes the only copy.
        </p>
      </Q>

      <Q q="The rest timer never notifies me">
        <p>
          The countdown on screen always works. The notification when rest ends needs permission,
          which Gym+ asks for the first time you use the timer. If you declined, it will not ask
          again — enable it in your phone&rsquo;s Settings under Gym+ → Notifications.
        </p>
        <p>
          On Android, also check that battery optimisation is not restricting the app, since an
          aggressively restricted app can have its scheduled alerts delayed.
        </p>
      </Q>

      <Q q="Why is it telling me to add weight, or to back off?">
        <p>
          Gym+ uses double progression. It only suggests more weight once{' '}
          <em>every</em> work set has reached the target reps, not just your best set — so a
          session where the last set fell short means the same load comes back next time, with one
          more rep to aim for.
        </p>
        <p>
          If the same weight falls short three sessions running, it will suggest dropping to about
          90% instead. That is deliberate: reps come back faster from a step down than from
          repeating a session that already failed.
        </p>
        <p>
          How hard the last set felt matters too. If you rate a set as having nothing left in
          reserve, Gym+ holds the weight rather than adding to it.
        </p>
      </Q>

      <Q q="The programme it generated is too hard, or too easy">
        <p>
          Volume is scaled to the training experience you picked when generating it. Generating a
          new programme at a different experience level changes how many exercises and sets each
          session gets. Your logged history is not affected — programmes and the training log are
          separate.
        </p>
        <p>
          You can also swap any exercise inside a programme for another that trains the same
          muscle, if a movement does not suit you or the equipment is taken.
        </p>
      </Q>

      <Q q="Can I switch between kilograms and pounds?">
        <p>
          <strong className="font-medium text-text">Profile → Weight Unit</strong>. Everything already
          logged converts with it, and the plate calculator and suggested jumps follow the unit you
          are in, so the numbers stay loadable on a real bar.
        </p>
      </Q>

      <Q q="How do I delete my data?">
        <p>
          Delete individual workouts and programmes inside the app, or uninstall Gym+ to remove
          everything at once. Since nothing is held on a server, uninstalling is complete deletion —
          there is no copy for anyone to retrieve, including the developer.
        </p>
      </Q>

      <Q q="Is there an account, or a subscription?">
        <p>
          No to both. There is no sign-up, no subscription, no advertising and no analytics. The
          app is free, and your training data never leaves your phone. The{' '}
          <Link
            href="/gymplus/privacy"
            className="text-text underline decoration-dim underline-offset-4 transition-colors hover:decoration-signal"
          >
            privacy policy
          </Link>{' '}
          sets out the one exception, which is the store&rsquo;s own rating prompt.
        </p>
      </Q>

      <div className="mt-16 h-px hairline" />

      <Link
        href="/"
        className="mt-8 inline-block font-mono text-2xs uppercase tracking-widest text-dim transition-colors hover:text-text"
      >
        ← {profile.name}
      </Link>
    </main>
  )
}
