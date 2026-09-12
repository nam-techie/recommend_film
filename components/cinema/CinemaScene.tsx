'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { cinemaLayout, CinemaPerson } from '@/lib/cinema-layout'
import { buildCinemaArchitecture } from './cinema-architecture'
import { createCinemaCamera } from './cinema-camera'
import { projectCinemaVideo } from './cinema-projection'

export interface CinemaSceneProps {
  capacity: number; seats: Record<string, string>; members: CinemaPerson[]; selected: string | null; currentMemberId: string
  screenFullscreen?: boolean; video?: HTMLVideoElement | null; poster?: string; title: string; view: 'overview' | 'screen' | 'seat'; resetKey: number
  onSelect: (seat: string) => void; onReady: () => void; onError: () => void
}

export default function CinemaScene(props: CinemaSceneProps) {
  const container = useRef<HTMLDivElement>(null)
  const latest = useRef(props); latest.current = props
  const controller = useRef<{ refresh: () => void; camera: () => void; video: () => void } | null>(null)

  useEffect(() => {
    const host = container.current
    if (!host) return
    let disposed = false, frame = 0
    const textures = new Set<THREE.Texture>()
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const instances = new Set<THREE.InstancedMesh>()
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#090b10')
    scene.fog = new THREE.Fog('#090b10', 26, 65)
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }) }
    catch { latest.current.onError(); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Rạp phim 3D. Kéo để xoay, cuộn để zoom. Dùng sơ đồ ghế bên cạnh để chọn bằng bàn phím.')
    renderer.domElement.setAttribute('role', 'application')
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    const layout = cinemaLayout(props.capacity)
    const rows = 9, back = 8 * 1.65 + 3.4
    let architecture: ReturnType<typeof buildCinemaArchitecture> | undefined
    const render = () => { if (!disposed && document.visibilityState !== 'hidden') { architecture?.update(camera); renderer.render(scene, camera) } }
    const mat = (color: string, roughness = 0.85, emissive?: string) => {
      const value = new THREE.MeshStandardMaterial({ color, roughness, ...(emissive ? { emissive, emissiveIntensity: 2 } : {}) })
      materials.add(value); return value
    }
    const charcoal = mat('#161820'), carpet = mat('#241a20'), black = mat('#090a0d'), red = mat('#a9162b', 0.7)
    const glow = mat('#ffcf8d', 0.5, '#eab977'), cool = mat('#adbcdb', 0.5, '#849ac6')
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const geometry = new THREE.BoxGeometry(w, h, d); geometries.add(geometry)
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); scene.add(mesh); return mesh
    }
    scene.add(new THREE.HemisphereLight('#dce6ff', '#30202a', 2.15))
    const main = new THREE.DirectionalLight('#ffdec7', 1.8); main.position.set(1, 12, 5); scene.add(main)
    const screenLight = new THREE.PointLight('#bfd8ff', 100, 24, 2); screenLight.position.set(0, 5, -5); scene.add(screenLight)
    box(12, 0.3, back + 10, 0, -0.35, (back - 8) / 2, charcoal)
    // Each platform is a solid riser; the center strip is the aisle.
    for (let row = 0; row < rows; row++) {
      const z = row * 1.65 + (row === 8 ? 0.75 : 0), height = row * 0.3 + 0.25
      box(9.8, height, row === 8 ? 2.7 : 1.65, 0, height / 2 - 0.25, z + 0.2, carpet)
      box(1.05, 0.015, 1.62, 0, row * 0.3 + 0.015, z + 0.2, black)
      box(1.05, 0.028, 0.028, 0, row * 0.3 + 0.035, z - 0.61, glow)
      for (const side of [-1, 1]) box(0.045, 0.028, 1.60, side * 4.52, row * 0.3 + 0.035, z + 0.2, glow)
    }
    box(10.8, 0.18, 2.1, 0, -0.08, -4.7, black)
    box(10.8, 0.035, 0.045, 0, 0.025, -3.7, glow)
    architecture = buildCinemaArchitecture(scene, rows, back)
    const front = box(11.2, 8.8, 0.15, 0, 4.0, -7.5, black)
    box(10.2, 5.15, 0.18, 0, 4.0, -7.26, charcoal)
    const screenCanvas = document.createElement('canvas'); screenCanvas.width = 1600; screenCanvas.height = 800
    const ctx = screenCanvas.getContext('2d')!
    const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace; textures.add(screenTexture)
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false, fog: false }); materials.add(screenMaterial)
    const screenGeometry = new THREE.PlaneGeometry(9.85, 4.82); geometries.add(screenGeometry)
    const screen = new THREE.Mesh(screenGeometry, screenMaterial); screen.position.set(0, 4, -7.15); screen.layers.enable(1); scene.add(screen)
    const drawScreen = (picture?: HTMLImageElement) => {
      ctx.fillStyle = '#111822'; ctx.fillRect(0, 0, 1600, 800)
      if (picture) {
        const scale = Math.min(1600 / picture.width, 800 / picture.height)
        ctx.drawImage(picture, (1600 - picture.width * scale) / 2, (800 - picture.height * scale) / 2, picture.width * scale, picture.height * scale)
      } else {
        ctx.fillStyle = '#d7b18a'; ctx.font = '500 38px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('C I N E M I N D', 800, 205)
        ctx.fillStyle = '#f6eee6'; ctx.font = '500 78px sans-serif'
        const title = latest.current.title
        const words = title.split(' '); let line = '', lines: string[] = []
        for (const word of words) { if (ctx.measureText(line + word).width > 1300) { lines.push(line.trim()); line = '' }; line += word + ' ' }
        lines.push(line.trim()); lines.slice(0, 3).forEach((value, i) => ctx.fillText(value, 800, 360 + i * 94))
        ctx.fillStyle = '#b7bdc9'; ctx.font = '30px sans-serif'; ctx.fillText('Cùng một bộ phim. Cùng một khoảnh khắc.', 800, 690)
      }
      screenTexture.needsUpdate = true; render()
    }
    drawScreen()
    if (props.poster) {
      const picture = new Image(); picture.crossOrigin = 'anonymous'
      picture.onload = () => { if (!disposed) drawScreen(picture) }; picture.src = props.poster
    }

    const matrix = new THREE.Object3D()
    const loadChairs = (vip: boolean) => {
      const seats = layout.filter(seat => seat.vip === vip)
      const group = new THREE.Group(); scene.add(group)
      const fallbackInstances: THREE.InstancedMesh[] = []
      const upholstery = vip ? mat('#e3dac9', 0.75) : red
      const parts: Array<[number, number, number, number, number, number, THREE.Material]> = [
        [0.86, 1.05, 0.22, 0, 0.98, 0.2, upholstery], [0.9, 0.23, 0.8, 0, 0.49, -0.05, upholstery],
        [0.2, 0.2, 0.75, -0.49, 0.74, 0, upholstery], [0.2, 0.2, 0.75, 0.49, 0.74, 0, upholstery],
        [0.65, 0.4, 0.45, 0, 0.22, 0.1, black],
      ]
      parts.forEach(([w, h, d, x, y, z, material]) => {
        const geometry = new RoundedBoxGeometry(w, h, d, 2, 0.07); geometries.add(geometry)
        const mesh = new THREE.InstancedMesh(geometry, material, seats.length)
        seats.forEach((seat, i) => { matrix.position.set(seat.x + x, seat.y + y, seat.z + z); matrix.rotation.set(0, 0, 0); matrix.scale.setScalar(vip ? 1.25 : 1); matrix.updateMatrix(); mesh.setMatrixAt(i, matrix.matrix) })
        instances.add(mesh); fallbackInstances.push(mesh); group.add(mesh)
      })
      new GLTFLoader().load(vip ? '/3d/cinema-vip-chair.optimized.glb' : '/3d/cinema-chair.optimized.glb', gltf => {
        if (disposed) { gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const list = Array.isArray(object.material) ? object.material : [object.material]; list.forEach(m => { Object.values(m).forEach(v => { if (v instanceof THREE.Texture) v.dispose() }); m.dispose() }) } }); return }
        const bounds = new THREE.Box3().setFromObject(gltf.scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3())
        const scale = (vip ? 1.42 : 1.02) / size.x
        gltf.scene.updateMatrixWorld(true)
        fallbackInstances.forEach(mesh => { mesh.dispose(); instances.delete(mesh) }); group.clear()
        gltf.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld)
          geometry.translate(-center.x, -bounds.min.y, -center.z); geometry.scale(scale, scale, scale)
          geometries.add(geometry); object.geometry.dispose()
          const list = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach(m => { if (m instanceof THREE.MeshStandardMaterial) { m.metalness = 0.12; m.roughness = 0.8; m.emissiveIntensity = 0; m.normalScale.set(0.5, 0.5) }; materials.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v) }) })
          const mesh = new THREE.InstancedMesh(geometry, object.material, seats.length)
          seats.forEach((seat, i) => { matrix.position.set(seat.x, seat.y + 0.025, seat.z); matrix.rotation.set(0, Math.PI, 0); matrix.scale.set(1, 1, 1); matrix.updateMatrix(); mesh.setMatrixAt(i, matrix.matrix) })
          instances.add(mesh); group.add(mesh)
        })
        render(); latest.current.onReady()
      }, undefined, () => { if (!disposed) render() })
    }
    loadChairs(false); loadChairs(true)
    const vipTrim = mat('#b9965d', 0.5, '#674922')
    box(9.7, 0.035, 0.06, 0, 2.435, 12.45, vipTrim)
    const pickables: THREE.Object3D[] = []
    const markers: THREE.Mesh[] = [], labels: THREE.Sprite[] = [], seatedAvatars: THREE.Sprite[] = []
    const labelTextures = new Map<string, THREE.CanvasTexture>()
    const badge = (text: string, color: string, avatar?: string) => {
      const key = `${text}:${color}:${avatar || ''}`
      if (labelTextures.has(key)) return labelTextures.get(key)!
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
      const context = canvas.getContext('2d')!
      context.fillStyle = '#10131b'; context.beginPath(); context.arc(64, 64, 58, 0, Math.PI * 2); context.fill()
      context.strokeStyle = color; context.lineWidth = 5; context.stroke()
      context.fillStyle = '#ffffff'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '600 40px sans-serif'; context.fillText(text, 64, 66)
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture); labelTextures.set(key, texture)
      if (avatar) {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => { if (!disposed) { context.save(); context.beginPath(); context.arc(64, 64, 53, 0, Math.PI * 2); context.clip(); const scale = Math.max(106 / img.width, 106 / img.height); context.drawImage(img, 64 - img.width * scale / 2, 64 - img.height * scale / 2, img.width * scale, img.height * scale); context.restore(); texture.needsUpdate = true; render() } }; img.src = avatar
      }
      return texture
    }
    const hitGeometry = new THREE.BoxGeometry(1.1, 1.65, 1.1); geometries.add(hitGeometry)
    const hitMaterial = new THREE.MeshBasicMaterial({ visible: false }); materials.add(hitMaterial)
    const ringGeometry = new THREE.RingGeometry(0.48, 0.55, 28); geometries.add(ringGeometry)
    layout.forEach(seat => {
      const hit = new THREE.Mesh(hitGeometry, hitMaterial); hit.position.set(seat.x, seat.y + 0.8, seat.z); hit.userData.seatId = seat.id; pickables.push(hit); scene.add(hit)
      const material = new THREE.MeshBasicMaterial({ color: '#cc8d69', side: THREE.DoubleSide }); materials.add(material)
      const ring = new THREE.Mesh(ringGeometry, material); ring.rotation.x = -Math.PI / 2; ring.position.set(seat.x, seat.y + 0.045, seat.z); scene.add(ring); markers.push(ring)
      const labelMaterial = new THREE.SpriteMaterial({ transparent: true, depthTest: true }); materials.add(labelMaterial)
      const label = new THREE.Sprite(labelMaterial); label.position.set(seat.x, seat.y + 1.92, seat.z); label.scale.set(0.47, 0.47, 1); label.userData.seatId = seat.id; label.layers.set(2); labels.push(label); pickables.push(label); scene.add(label)
      const avatarMaterial = new THREE.SpriteMaterial({ transparent: true, depthTest: true, depthWrite: false }); materials.add(avatarMaterial)
      const avatar = new THREE.Sprite(avatarMaterial)
      avatar.position.set(seat.x, seat.y + (seat.vip ? 1.02 : 0.95), seat.z - (seat.vip ? 0.28 : 0.24))
      avatar.scale.setScalar(seat.vip ? 0.42 : 0.36); avatar.layers.set(3); avatar.visible = false
      seatedAvatars.push(avatar); scene.add(avatar)
    })
    const refresh = () => {
      const p = latest.current
      layout.forEach((seat, i) => {
        const occupantId = p.seats[seat.id], person = p.members.find(m => m.memberId === occupantId)
        const own = occupantId === p.currentMemberId, selected = p.selected === seat.id
        const color = selected || own ? '#8ce3bd' : occupantId || seat.vip ? '#e6b989' : '#66717e'
        markers[i].visible = Boolean(occupantId || selected)
        ;(markers[i].material as THREE.MeshBasicMaterial).color.set(color)
        const initials = person?.displayName.split(' ').filter(Boolean).slice(-2).map(n => n[0]).join('').toUpperCase()
        labels[i].material.map = badge(occupantId ? initials || '•' : seat.id, color, person?.avatar)
        labels[i].material.needsUpdate = true
        labels[i].scale.setScalar(occupantId || selected ? 0.58 : 0.36)
        seatedAvatars[i].material.map = labels[i].material.map
        seatedAvatars[i].material.needsUpdate = true
        seatedAvatars[i].visible = Boolean(occupantId && seat.id !== p.selected)
      }); render()
    }
    const raycaster = new THREE.Raycaster(); raycaster.layers.set(2); raycaster.layers.enable(0)
    const selectSeat = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
      const hit = raycaster.intersectObjects(pickables)[0]
      if (hit) latest.current.onSelect(hit.object.userData.seatId)
    }
    const cameraControls = createCinemaCamera(camera, renderer.domElement, props.capacity, render, selectSeat)
    const setCamera = () => cameraControls.setView(latest.current.view, latest.current.selected, Boolean(latest.current.screenFullscreen), latest.current.video?.videoWidth && latest.current.video?.videoHeight ? latest.current.video.videoWidth / latest.current.video.videoHeight : 16 / 9)
    let releaseVideo = () => {}
    const bindVideo = () => {
      releaseVideo()
      releaseVideo = latest.current.video ? projectCinemaVideo(latest.current.video, screen, screenTexture, render) : () => {}
      render()
    }
    controller.current = { refresh, camera: setCamera, video: bindVideo }
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight
      if (!width || !height) return
      camera.aspect = width / height; camera.updateProjectionMatrix()
      renderer.setSize(width, height); cameraControls.resize()
    }

    const observer = new ResizeObserver(resize); observer.observe(host)
    const onLoss = (event: Event) => { event.preventDefault(); latest.current.onError() }
    renderer.domElement.addEventListener('webglcontextlost', onLoss)

    document.addEventListener('visibilitychange', render)
    resize(); setCamera(); refresh(); bindVideo(); frame = requestAnimationFrame(render)
    // The procedural seats render immediately while the optimized GLB streams in.
    latest.current.onReady()
    return () => {
      disposed = true; controller.current = null; cancelAnimationFrame(frame); observer.disconnect(); cameraControls.dispose(); releaseVideo()
      document.removeEventListener('visibilitychange', render)
      renderer.domElement.removeEventListener('webglcontextlost', onLoss)
      architecture?.dispose(); instances.forEach(mesh => mesh.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove(); scene.clear()
      void front
    }
  }, [props.capacity, props.poster, props.title])

  useEffect(() => { controller.current?.refresh() }, [props.seats, props.selected, props.members, props.currentMemberId])
  useEffect(() => { controller.current?.camera() }, [props.view, props.resetKey, props.screenFullscreen])
  useEffect(() => { if (props.view === 'seat') controller.current?.camera() }, [props.selected, props.view])
  useEffect(() => { controller.current?.video() }, [props.video])
  return <div ref={container} style={{ width: '100%', height: '100%' }} />
}
