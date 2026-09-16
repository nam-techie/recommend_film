import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { cinemaLayout } from '@/lib/cinema-layout'

export type CinemaView = 'overview' | 'screen' | 'seat' | 'character'

export function createCinemaCamera(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, capacity: number, render: () => void, onSelect: (event: PointerEvent) => void) {
  const orbit = new OrbitControls(camera, canvas)
  orbit.enableDamping = false; orbit.enablePan = false
  orbit.minDistance = 8; orbit.maxDistance = 65
  orbit.minPolarAngle = 0.18; orbit.maxPolarAngle = Math.PI / 2 - 0.025
  const layout = cinemaLayout(capacity), rows = 9, back = 8 * 1.65 + 3.4
  const projection = new THREE.Vector3(0, 4, -7.15)
  let fullScreen = false, mediaAspect = 16 / 9
  let view: CinemaView = 'overview', selected: string | null = null
  let yaw = 0, pitch = 0, screenDistance = 0, fitDistance = 0
  const points = new Map<number, { x: number; y: number }>()
  let down = { x: 0, y: 0 }, moved = false, pinched = false, lastPinch = 0
  const look = () => { camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, 0); camera.updateProjectionMatrix(); render() }
  const pinchDistance = () => { const pair = [...points.values()]; return pair.length < 2 ? 0 : Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) }
  const zoom = (factor: number) => {
    if (view === 'screen') {
      screenDistance = THREE.MathUtils.clamp(screenDistance * factor, fitDistance * 0.55, fitDistance * 1.35)
      camera.position.set(0, 4, projection.z + screenDistance); camera.lookAt(projection)
    } else if (view === 'seat') camera.fov = THREE.MathUtils.clamp(camera.fov * factor, 32, 100)
    camera.updateProjectionMatrix(); render()
  }
  const setView = (next: CinemaView, seatId: string | null, fullscreen = false, videoAspect = 16 / 9) => {
    fullScreen = fullscreen; mediaAspect = videoAspect
    view = next; selected = seatId; orbit.enabled = next === 'overview' || next === 'character'
    orbit.minDistance = next === 'character' ? 1.3 : 8
    orbit.maxDistance = next === 'character' ? 8 : 65
    camera.layers.set(next === 'screen' ? 1 : 0)
    if (next === 'overview') camera.layers.enable(2)
    if (next === 'seat') camera.layers.enable(3)
    points.clear(); pinched = false; moved = false
    camera.fov = next === 'seat' ? 78 : 48; camera.updateProjectionMatrix()
    const seat = layout.find(s => s.id === seatId)
    if (next === 'character' && seat) {
      orbit.target.set(seat.x, seat.y + .95, seat.z)
      camera.position.set(seat.x + 1.6, seat.y + 1.9, seat.z - 2.4)
      orbit.update(); render()
    } else if (next === 'seat' && seat) {
      // Eye position stays on the chair; dragging rotates the viewer's head.
      camera.position.set(seat.x, seat.y + (seat.vip ? 1.65 : 1.42), seat.z - (seat.vip ? 0.28 : 0.24))
      camera.lookAt(projection); camera.rotation.order = 'YXZ'
      yaw = camera.rotation.y; pitch = camera.rotation.x; look()
    } else if (next === 'screen') {
      // Screen-aligned camera: wheel/pinch changes distance, drag never orbits.
      const width = fullscreen ? Math.min(9.85, 4.82 * videoAspect) : 9.85
      const height = fullscreen ? Math.min(4.82, 9.85 / videoAspect) : 4.82
      fitDistance = Math.max(height / 2, width / (2 * camera.aspect)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (fullscreen ? 1 : 1.12)
      screenDistance = fitDistance
      camera.position.set(0, 4, projection.z + screenDistance); camera.lookAt(projection); render()
    } else {
      orbit.enabled = true
      orbit.target.set(0, 2.4, Math.max(1, back * 0.3))
      const offset = new THREE.Vector3(10.8, 11.5 + rows * 0.12, back + 3 - orbit.target.z)
      offset.multiplyScalar(Math.max(1.12, 1.35 / camera.aspect))
      camera.position.copy(orbit.target).add(offset); orbit.update(); render()
    }
  }
  const pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    points.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (points.size === 1) { down = { x: event.clientX, y: event.clientY }; moved = false; pinched = false }
    else { pinched = true; moved = true; lastPinch = pinchDistance() }
    if (view !== 'overview' && view !== 'character') canvas.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: PointerEvent) => {
    const previous = points.get(event.pointerId)
    if (!previous) return
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y
    points.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) moved = true
    if (view === 'overview' || view === 'character') return
    if (points.size > 1) {
      const distance = pinchDistance()
      if (distance > 0 && lastPinch > 0) zoom(lastPinch / distance)
      lastPinch = distance
    } else if (view === 'seat') {
      yaw -= dx * 0.004
      pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, -1.2, 1.2)
      look()
    }
  }
  const pointerUp = (event: PointerEvent) => {
    const tracked = points.delete(event.pointerId)
    if (tracked && !moved && !pinched && view === 'overview') onSelect(event)
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }
  const pointerCancel = (event: PointerEvent) => { points.delete(event.pointerId); moved = true }
  const wheel = (event: WheelEvent) => { if (view === 'overview' || view === 'character') return; event.preventDefault(); zoom(Math.exp(THREE.MathUtils.clamp(event.deltaY, -100, 100) * 0.003)) }
  const key = (event: KeyboardEvent) => {
    if (view === 'overview' || view === 'character') return
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(0.9) }
    else if (event.key === '-') { event.preventDefault(); zoom(1.1) }
    else if (view === 'seat' && event.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      if (event.key === 'ArrowLeft') yaw += 0.12
      if (event.key === 'ArrowRight') yaw -= 0.12
      if (event.key === 'ArrowUp') pitch = Math.min(1.2, pitch + 0.12)
      if (event.key === 'ArrowDown') pitch = Math.max(-1.2, pitch - 0.12)
      look()
    }
  }
  canvas.tabIndex = 0; canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerCancel)
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', key)
  orbit.addEventListener('change', render)
  return { setView, resize: () => setView(view, selected, fullScreen, mediaAspect), dispose: () => {
    orbit.dispose(); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove)
    canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel)
    canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('keydown', key)
  } }
}
