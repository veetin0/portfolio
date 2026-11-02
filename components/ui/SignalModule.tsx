'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * The Signal Module: a small terminal box with the work constellation
 * orbiting it. Built in Blender (assets-src/signal-module/build.py) and
 * exported to public/models/signal-module.glb.
 *
 * Deliberately not draggable. The canvas it sits on is drag-to-pan, so
 * camera controls here would fight every gesture; the model instead leans
 * toward the pointer and its nodes keep orbiting on their own.
 *
 * three.js is imported inside the effect so it never lands in the initial
 * bundle. If WebGL or the file is unavailable this renders nothing, same
 * contract as <Portrait>.
 */
export function SignalModule({
  src = '/models/signal-module.glb',
  className,
}: {
  src?: string
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
        ])
        if (disposed) return

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.toneMapping = THREE.NeutralToneMapping
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
        host.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const pmrem = new THREE.PMREMGenerator(renderer)
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        scene.environment = env
        scene.environmentIntensity = 1.0

        const key = new THREE.DirectionalLight(0xffffff, 3.2)
        key.position.set(-0.4, 0.6, 0.7)
        const rim = new THREE.DirectionalLight(0xc6f24e, 1.1)
        rim.position.set(0.5, 0.3, -0.7)
        scene.add(key, rim)

        const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10)

        const gltf = await new GLTFLoader().loadAsync(src)
        if (disposed) {
          renderer.dispose()
          return
        }

        const model = gltf.scene
        const pivot = new THREE.Group()
        pivot.add(model)
        scene.add(pivot)

        // Centre on the body and frame the whole orbit.
        const box = new THREE.Box3().setFromObject(model)
        const centre = box.getCenter(new THREE.Vector3())
        model.position.sub(centre)
        const radius = box.getSize(new THREE.Vector3()).length() / 2

        const nodes = model.getObjectByName('Nodes')

        const fit = () => {
          const w = host.clientWidth
          const h = host.clientHeight
          if (!w || !h) return
          renderer.setSize(w, h, false)
          camera.aspect = w / h
          const vFov = (camera.fov * Math.PI) / 180
          const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
          const dist = (radius * 0.92) / Math.sin(Math.min(vFov, hFov) / 2)
          camera.position.set(0, dist * 0.2, dist * 0.98)
          camera.lookAt(0, 0, 0)
          camera.updateProjectionMatrix()
        }
        fit()
        const ro = new ResizeObserver(() => {
          fit()
          draw(performance.now())
        })
        ro.observe(host)

        // Pointer lean, eased. Stored as -1..1 across the viewport.
        const aim = { x: 0, y: 0 }
        const lean = { x: 0, y: 0 }
        const onMove = (e: PointerEvent) => {
          aim.x = (e.clientX / window.innerWidth) * 2 - 1
          aim.y = (e.clientY / window.innerHeight) * 2 - 1
        }
        if (!reduced) window.addEventListener('pointermove', onMove, { passive: true })

        let last = performance.now()
        let spin = 0
        const draw = (now: number) => {
          const dt = Math.min(0.064, (now - last) / 1000)
          last = now
          const k = 1 - Math.pow(0.001, dt)
          lean.x += (aim.x - lean.x) * k * 0.5
          lean.y += (aim.y - lean.y) * k * 0.5
          if (!reduced) spin += dt * 0.5
          pivot.rotation.y = -0.55 + lean.x * 0.32 + (reduced ? 0 : Math.sin(now / 2600) * 0.06)
          pivot.rotation.x = lean.y * 0.12
          if (nodes) nodes.rotation.y = spin
          renderer.render(scene, camera)
        }

        let raf = 0
        let visible = true
        const loop = (now: number) => {
          raf = 0
          draw(now)
          if (visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop)
        }
        const start = () => {
          if (!raf && visible && !document.hidden && !reduced) {
            last = performance.now()
            raf = requestAnimationFrame(loop)
          }
        }
        // Stop burning frames while panned away or in another tab.
        const io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting
          start()
        })
        io.observe(host)
        document.addEventListener('visibilitychange', start)

        draw(performance.now())
        start()
        setReady(true)

        cleanup = () => {
          cancelAnimationFrame(raf)
          io.disconnect()
          ro.disconnect()
          window.removeEventListener('pointermove', onMove)
          document.removeEventListener('visibilitychange', start)
          scene.traverse((o) => {
            const m = o as import('three').Mesh
            if (!m.isMesh) return
            m.geometry.dispose()
            ;[m.material].flat().forEach((mat) => mat.dispose())
          })
          env.dispose()
          pmrem.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        if (!disposed) setFailed(true)
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [src, reduced])

  if (failed) return null

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn(
        'pointer-events-none select-none transition-opacity duration-[1200ms] ease-out',
        ready ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  )
}
