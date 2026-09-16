import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cinemaLayout, type CinemaPerson } from '@/lib/cinema-layout'
import { characterAsset, characterForPlan, type CinemaCharacter, type CinemaCharacterPreview } from '@/lib/cinema-character'
import { attachCharacterBadge } from './cinema-character-badge'
import { createCharacterRig, prepareCharacterGeometry, characterSeatOffset } from './cinema-character-rig'

type Seat = ReturnType<typeof cinemaLayout>[number]
type Rig = ReturnType<typeof createCharacterRig>
type Template = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] }
type Actor = { badge: ReturnType<typeof attachCharacterBadge>; rig: Rig; seat: Seat; variant: CinemaCharacter; started: number; path: THREE.Vector3[]; lengths: number[]; distance: number; duration: number; moving: boolean; phase: number }

export function cinemaEntryPath(seat: Seat) {
  return [new THREE.Vector3(4.8, 2.4, 15.5), new THREE.Vector3(0, 2.4, 15.5), new THREE.Vector3(0, seat.y, seat.z - .72), new THREE.Vector3(seat.x, seat.y, seat.z - .72), new THREE.Vector3(seat.x, seat.y, seat.z + characterSeatOffset(seat.vip))]
}

/** Renders confirmed seat occupants; character choices are currently local to this viewer. */
export function createCinemaAudience(scene: THREE.Scene, render: () => void, badgeTexture: (text: string, color: string, avatar?: string) => THREE.Texture) {
  const actors = new Map<string, Actor>(), templates = new Map<CinemaCharacter, Promise<Template>>()
  const owned = new Set<Template>(), sourceGeometries = new Set<THREE.BufferGeometry>()
  let disposed = false, generation = 0, frame = 0, lastFrame = 0, replay = -1
  let hiddenMember: string | undefined, currentSeats: Record<string, string> = {}
  let preview: CinemaCharacterPreview | undefined
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const release = (template: Template) => {
    template.geometry.dispose()
    const materials = Array.isArray(template.material) ? template.material : [template.material]
    for (const material of materials) { Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose() }); material.dispose() }
  }
  const load = (variant: CinemaCharacter) => {
    if (!templates.has(variant)) {
      const promise = new GLTFLoader().loadAsync(characterAsset(variant)).then(gltf => {
        gltf.scene.updateMatrixWorld(true)
        let source: THREE.Mesh | undefined
        gltf.scene.traverse(node => { if (node instanceof THREE.Mesh) source = node })
        if (!source) throw new Error('Character mesh missing')
        const template = { geometry: prepareCharacterGeometry(source.geometry, source.matrixWorld), material: source.material }
        sourceGeometries.add(source.geometry)
        for (const material of Array.isArray(template.material) ? template.material : [template.material]) {
          if (material instanceof THREE.MeshStandardMaterial) { material.metalness = .05; material.roughness = .9; material.normalScale.set(.35, .35) }
        }
        if (disposed) { release(template); source.geometry.dispose() }
        else owned.add(template)
        return template
      }).catch(error => { templates.delete(variant); throw error })
      templates.set(variant, promise)
    }
    return templates.get(variant)!
  }
  const position = new THREE.Vector3(), direction = new THREE.Vector3()
  function updateActor(actor: Actor, now: number) {
    const { rig, seat } = actor
    const elapsed = (now - actor.started) / 1000
    const walkTime = actor.duration, sit = actor.moving && !motion.matches ? THREE.MathUtils.smoothstep(elapsed - walkTime, 0, .75) : 1
    const walking = actor.moving && !motion.matches && elapsed < walkTime
    if (walking) {
      let remaining = Math.min(actor.distance, elapsed * 2.2), segment = 0
      while (segment < actor.lengths.length - 1 && remaining > actor.lengths[segment]) remaining -= actor.lengths[segment++]
      const from = actor.path[segment], to = actor.path[segment + 1]
      position.lerpVectors(from, to, Math.min(1, remaining / Math.max(.001, actor.lengths[segment])))
      rig.group.position.copy(position); direction.subVectors(to, from)
      rig.group.rotation.y = Math.atan2(direction.x, direction.z)
    } else {
      rig.group.position.set(seat.x, seat.y, seat.z + characterSeatOffset(seat.vip))
      rig.group.rotation.y = Math.PI
    }
    rig.pose(sit, elapsed * 8, walking, now / 1000 + actor.phase, !motion.matches, seat.vip)
    if (actor.moving && (sit === 1 || motion.matches)) { actor.moving = false; preview?.onStatus('seated') }
  }
  function tick(now: number) {
    frame = 0
    if (disposed || document.hidden) return
    if (now - lastFrame >= 1000 / 30) {
      for (const actor of actors.values()) updateActor(actor, now)
      render(); lastFrame = now
    }
    if (!motion.matches && actors.size) frame = requestAnimationFrame(tick)
  }
  function wake() {
    if (disposed || document.hidden) return
    for (const actor of actors.values()) updateActor(actor, performance.now())
    render()
    if (!frame && !motion.matches && actors.size) frame = requestAnimationFrame(tick)
  }
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else wake() }
  document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', wake)
  function sync(seats: Record<string, string>, memberId: string, config: CinemaCharacterPreview, members: CinemaPerson[]) {
    preview = config; currentSeats = seats
    const revision = ++generation, restart = config.replay !== replay; replay = config.replay
    const layout = cinemaLayout()
    for (const [id, actor] of actors) {
      if (!Object.values(seats).includes(id)) { scene.remove(actor.rig.group); actor.badge.dispose(); actor.rig.dispose(); actors.delete(id) }
    }
    const ownSeat = Object.entries(seats).find(([, id]) => id === memberId)
    if (ownSeat && (!actors.has(memberId) || actors.get(memberId)?.variant !== config.character)) config.onStatus('loading')
    Object.entries(seats).forEach(([seatId, id], index) => {
      const seat = layout.find(item => item.id === seatId)
      if (!seat) return
      const person = members.find(member => member.memberId === id)
      const variant = id === memberId ? config.character : characterForPlan(person?.characterGender || 'male', person?.accountPlan)
      const initials = person?.displayName.trim().split(/\s+/).map(word => word[0]).slice(-2).join('').toUpperCase() || '?'
      const avatar = badgeTexture(initials, id === memberId ? '#8ce3bd' : person?.accountPlan === 'ultra' ? '#d7b677' : '#b8c4d1', person?.avatar)
      const existing = actors.get(id)
      existing?.badge.update(avatar)
      if (existing && existing.seat.id === seatId && existing.variant === variant && !(id === memberId && restart)) return
      void load(variant).then(template => {
        if (disposed || generation !== revision) return
        const previous = actors.get(id)
        if (previous) { scene.remove(previous.rig.group); previous.badge.dispose(); previous.rig.dispose() }
        const rig = createCharacterRig(template.geometry, template.material), path = cinemaEntryPath(seat)
        const lengths = path.slice(1).map((point, i) => point.distanceTo(path[i])), distance = lengths.reduce((sum, length) => sum + length, 0)
        // A costume change preserves the seated pose; replay and seat changes enter from the rear aisle.
        const moving = id === memberId && (!previous || previous.seat.id !== seatId || restart)
        const actor: Actor = { badge: attachCharacterBadge(rig, avatar, id), rig, seat, variant, path, lengths, distance, duration: distance / 2.2, started: performance.now(), moving, phase: index * 1.7 }
        actors.set(id, actor); rig.group.visible = id !== hiddenMember; scene.add(rig.group)
        if (id === memberId) config.onStatus(moving && !motion.matches ? 'walking' : 'seated')
        wake()
      }).catch(() => { if (!disposed && generation === revision) config.onStatus('error') })
    })
    wake()
  }
  return {
    sync,
    hideAtSeat(seatId: string | null) {
      hiddenMember = seatId ? currentSeats[seatId] : undefined
      for (const [id, actor] of actors) actor.rig.group.visible = id !== hiddenMember
    },
    dispose() {
      disposed = true; generation++; cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', wake)
      for (const actor of actors.values()) { scene.remove(actor.rig.group); actor.badge.dispose(); actor.rig.dispose() }
      owned.forEach(release); sourceGeometries.forEach(geometry => geometry.dispose()); actors.clear()
    },
  }
}
