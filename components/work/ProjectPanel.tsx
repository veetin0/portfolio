'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { projects, projectById } from '@/data/projects'
import { nodeById } from '@/lib/graph'
import { flyTo } from '@/lib/camera'
import { useUI } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd, StatusChip, Tag } from '@/components/ui/primitives'
import { Preview } from '@/components/ui/Preview'

const spring = { type: 'spring' as const, stiffness: 420, damping: 40, mass: 0.9 }

export function ProjectPanel() {
  const openProject = useUI((s) => s.openProject)
  const openAt = useUI((s) => s.openAt)
  const close = useUI((s) => s.close)
  const pinTag = useUI((s) => s.pinTag)

  const project = openProject ? projectById.get(openProject) : undefined

  const index = project ? projects.findIndex((p) => p.id === project.id) : -1

  // A store listing is a call to action; a repo link is a reference. Splitting
  // them means "install this" never has to compete with "read the source" for
  // the same row of a list.
  const links = project?.links ?? []
  const storeLinks = links.filter((l) => l.kind === 'appstore' || l.kind === 'playstore')
  const otherLinks = links.filter((l) => l.kind !== 'appstore' && l.kind !== 'playstore')
  const step = (delta: number) => {
    if (index < 0) return
    const next = projects[(index + delta + projects.length) % projects.length]
    openAt(next.id)
    const node = nodeById.get(next.id)
    if (node) flyTo(node.x, node.y, 1.05)
  }

  return (
    <AnimatePresence>
      {project && (
        <>
          {/* Scrim. Dims the canvas without hiding it — you should still feel
              where you are in the world. */}
          <motion.button
            key="scrim"
            aria-label="Close project"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-bg/55 backdrop-blur-[2px]"
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={project.name}
            initial={{ x: '104%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '104%', opacity: 0.6 }}
            transition={spring}
            className={cn(
              'pane fixed z-50 flex flex-col rounded-2xl',
              'inset-x-3 bottom-3 top-16 sm:inset-x-auto sm:right-3 sm:top-3 sm:w-[460px]'
            )}
          >
            <header className="relative shrink-0 overflow-hidden rounded-t-2xl border-b border-line">
              <div className="h-[124px] w-full opacity-90">
                {project.media?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.media[0].src}
                    alt={project.media[0].alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Preview project={project} className="h-full w-full" />
                )}
              </div>

              <button
                data-interactive
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-bg/70 text-muted backdrop-blur transition-colors hover:border-signal/40 hover:text-signal"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
            </header>

            <div data-scrollable className="mask-b flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {/* A jury's verdict outranks anything the page says about itself,
                  so it goes above the status line, not in with the metrics. */}
              {project.award && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-signal/35 bg-signal/[0.08] px-3 py-1">
                  <AwardIcon />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-signal">
                    {project.award}
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center gap-3">
                <StatusChip status={project.status} />
                <span className="h-3 w-px bg-line" />
                <span className="eyebrow">{project.domain}</span>
                <span className="h-3 w-px bg-line" />
                <span className="eyebrow">{project.year}</span>
              </div>

              <h2 className="text-[26px] font-medium leading-tight tracking-tightest text-text">
                {project.name}
              </h2>
              <p className="mt-1 text-sm text-muted">{project.tagline}</p>

              {project.attribution && (
                <p className="mt-5 flex gap-2.5 rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
                  <span aria-hidden className="shrink-0 font-mono text-dim">
                    ⓘ
                  </span>
                  <span className="text-pretty">{project.attribution}</span>
                </p>
              )}

              <p className="mt-5 text-[13.5px] leading-relaxed text-text/85 text-pretty">
                {project.summary}
              </p>

              {project.metrics && (
                <div
                  className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line"
                  // Columns follow the data. A fixed 3 leaves an empty cell
                  // for any project that only has two metrics.
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(project.metrics.length, 3)}, minmax(0, 1fr))`,
                  }}
                >
                  {project.metrics.map((m) => (
                    <div key={m.label} className="bg-raised px-3 py-2.5">
                      <div className="font-mono text-[13px] text-signal">{m.value}</div>
                      {/* Wraps rather than truncates — three columns is tight
                          on a phone and a clipped label reads as a bug. */}
                      <div className="eyebrow mt-0.5 leading-tight">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <Section title="What it does">
                <ul className="space-y-2.5">
                  {project.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                      <span aria-hidden className="mt-[7px] h-px w-2.5 shrink-0 bg-dim" />
                      <span className="text-pretty">{f}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Built with">
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map((t) => (
                    <Tag
                      key={t}
                      onClick={() => {
                        // Tapping a dependency lights up every other project
                        // that shares it, then gets out of the way.
                        pinTag(t)
                        close()
                      }}
                    >
                      {t}
                    </Tag>
                  ))}
                </div>
              </Section>

              {project.downloads && project.downloads.length > 0 && (
                <Section title="Download">
                  <div className="flex flex-col gap-2">
                    {project.downloads.map((d) => (
                      <div key={d.href}>
                        <a
                          data-interactive
                          href={d.href}
                          download
                          className="group flex items-center justify-between gap-3 rounded-lg border border-signal/25 bg-signal/[0.06] px-3.5 py-3 transition-colors hover:border-signal/45 hover:bg-signal/[0.11]"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2">
                              <span className="text-[13px] text-signal">{d.label}</span>
                              {d.license && (
                                <span className="rounded border border-signal/30 px-1.5 py-px font-mono text-[10px] leading-none text-signal/80">
                                  {d.license}
                                </span>
                              )}
                            </span>
                            {d.requires && (
                              <span className="mt-1 font-mono text-2xs text-dim">
                                {d.requires}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-2.5">
                            <span className="font-mono text-2xs text-muted">{d.size}</span>
                            <DownloadIcon />
                          </span>
                        </a>

                        {d.note && (
                          <p className="mt-2 flex gap-2 rounded-lg border border-line bg-raised/50 px-3 py-2 text-[11.5px] leading-relaxed text-muted">
                            <span aria-hidden className="shrink-0 text-dim">
                              ⚠
                            </span>
                            <span className="text-pretty">{d.note}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {storeLinks.length > 0 && (
                <Section title="Get it">
                  <div className="flex flex-wrap gap-2">
                    {storeLinks.map((l) => (
                      <a
                        key={l.href}
                        data-interactive
                        href={l.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex flex-1 basis-[9rem] items-center gap-2.5 rounded-lg border border-line bg-raised px-3.5 py-3 text-[13px] text-muted transition-colors hover:border-signal/40 hover:text-signal"
                      >
                        {l.kind === 'appstore' ? <AppleIcon /> : <PlayIcon />}
                        <span className="truncate">{l.label}</span>
                        <span
                          aria-hidden
                          className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {otherLinks.length > 0 && (
                <Section title={otherLinks.some((l) => l.kind === 'upstream') ? 'Related' : 'Links'}>
                  <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
                    {otherLinks.map((l) => (
                      <a
                        key={l.href + l.label}
                        data-interactive
                        href={l.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-center justify-between bg-raised px-3.5 py-3 text-[13px] text-muted transition-colors hover:bg-raised/60 hover:text-signal"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              'shrink-0 font-mono text-2xs uppercase tracking-wider',
                              // Upstream is someone else's work; it must not
                              // wear the same badge as your own source.
                              l.kind === 'upstream'
                                ? 'text-dim'
                                : 'text-dim group-hover:text-signal/60'
                            )}
                          >
                            {l.kind}
                          </span>
                          <span className="truncate">{l.label}</span>
                        </span>
                        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                          →
                        </span>
                      </a>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <span className="font-mono text-2xs text-dim">
                {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="hidden font-mono text-2xs text-dim sm:inline">
                  <Kbd>esc</Kbd> to close
                </span>
                <NavButton onClick={() => step(-1)} label="Previous project">
                  ←
                </NavButton>
                <NavButton onClick={() => step(1)} label="Next project">
                  →
                </NavButton>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function AwardIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden className="text-signal">
      <circle cx="5.5" cy="4" r="3.2" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M3.6 6.9 2.8 10l2.7-1.4L8.2 10l-.8-3.1"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden
      className="text-signal transition-transform duration-300 group-hover:translate-y-0.5"
    >
      <path
        d="M6.5 1v8m0 0L3.5 6m3 3l3-3M1.5 11.5h10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Store marks, drawn as monochrome glyphs so they sit in the panel's own
   palette rather than importing two brands' colour schemes into a dark UI.
   Both are simplified for a 15px box — recognisable at size, not replicas. */

function AppleIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0 text-muted transition-colors group-hover:text-signal"
    >
      <path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.9.8 3.1.7 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.8ZM14 5.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0 text-muted transition-colors group-hover:text-signal"
    >
      <path d="M3.6 1.8a1.3 1.3 0 0 0-.5 1.1v18.2c0 .5.2.9.5 1.1l.1.1L13.8 12v-.2L3.7 1.8h-.1Z" />
      <path d="M17.2 15.4 14 12.2v-.3l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.3l-3.8 2.1h-.1Z" />
      <path d="m17.3 15.3-3.3-3.3-10.4 10.4c.4.4 1 .4 1.6.1l12.1-6.9M17.3 8.7 5.2 1.8c-.6-.4-1.2-.3-1.6.1L14 12.3l3.3-3.6Z" />
    </svg>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  )
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      data-interactive
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded border border-line text-xs text-muted transition-colors hover:border-signal/40 hover:text-signal"
    >
      {children}
    </button>
  )
}
