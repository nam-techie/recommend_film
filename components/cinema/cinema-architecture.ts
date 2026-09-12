import * as THREE from 'three'

/** Auditorium shell. Cut away only the surfaces between the orbit camera and room. */
export function buildCinemaArchitecture(scene: THREE.Scene, rows: number, back: number) {
  const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  const root = new THREE.Group(); scene.add(root)
  const left = new THREE.Group(), right = new THREE.Group(), rear = new THREE.Group(), ceiling = new THREE.Group()
  root.add(left, right, rear, ceiling)
  const material = (color: string, roughness = 0.9, emission?: string) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, ...(emission ? { emissive: emission, emissiveIntensity: 1.3 } : {}) })
    materials.add(value); return value
  }
  const wall = material('#14151b'), felt = material('#272830'), feltDark = material('#1b1d25')
  const walnut = material('#483631'), bronze = material('#84654d', 0.45), metal = material('#353a41', 0.5)
  const dark = material('#090b0e'), red = material('#481720'), fabric = material('#40252d')
  const light = material('#ffe0ad', 0.5, '#f4bd74'), blueLight = material('#b8d0ed', 0.5, '#91b6e6')
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const shape = new THREE.BoxGeometry(w, h, d); geometry.add(shape)
    const mesh = new THREE.Mesh(shape, mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh
  }
  const cylinder = (parent: THREE.Object3D, radius: number, length: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const shape = new THREE.CylinderGeometry(radius, radius, length, 16); geometry.add(shape)
    const mesh = new THREE.Mesh(shape, mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh
  }
  const label = (parent: THREE.Object3D, text: string, width: number, height: number, x: number, y: number, z: number, rotation = 0, color = '#bdebd3', background = '#143e30') => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = background; ctx.fillRect(0, 0, 768, 192)
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 66px sans-serif'; ctx.fillText(text, 384, 100)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture)
    const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }); materials.add(mat)
    const shape = new THREE.PlaneGeometry(width, height); geometry.add(shape)
    const mesh = new THREE.Mesh(shape, mat); mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh)
  }
  const endLevel = (rows - 1) * 0.3
  // A continuous landing behind the last row connects both entry doors.
  box(root, 11.1, endLevel + 0.25, 2.4, 0, (endLevel - 0.25) / 2, back - 0.175, fabric)
  box(root, 11.05, 0.015, 0.04, 0, endLevel + 0.02, back + 0.9, bronze)
  box(root, 10.9, 0.025, 3.0, 0, -0.18, -2.2, fabric)
  // Carpet threads follow the direction of walking, as in the supplied room photo.
  const carpetCanvas = document.createElement('canvas'); carpetCanvas.width = 128; carpetCanvas.height = 128
  const carpetContext = carpetCanvas.getContext('2d')!
  carpetContext.fillStyle = '#201d24'; carpetContext.fillRect(0, 0, 128, 128)
  for (let x = 0; x < 128; x += 4) { carpetContext.fillStyle = x % 12 === 0 ? '#4a3138' : '#302934'; carpetContext.fillRect(x, 0, 1, 128) }
  for (let y = 0; y < 128; y += 4) { carpetContext.fillStyle = '#ffffff08'; carpetContext.fillRect(0, y, 128, 1) }
  const carpetTexture = new THREE.CanvasTexture(carpetCanvas); carpetTexture.wrapS = carpetTexture.wrapT = THREE.RepeatWrapping; carpetTexture.repeat.set(2, 3); carpetTexture.colorSpace = THREE.SRGBColorSpace; textures.add(carpetTexture)
  const aisle = material('#ffffff'); aisle.map = carpetTexture
  for (let row = 0; row < rows; row++) {
    const level = row * 0.3, z = row * 1.65
    box(root, 1.02, 0.012, 1.56, 0, level + 0.028, z + 0.21, aisle)
    for (const side of [-1, 1]) {
      box(root, 0.028, 0.023, 1.59, side * 0.53, level + 0.042, z + 0.2, bronze)
      box(root, 0.38, 0.15, 0.045, side * 3.55, level - 0.075, z - 0.625, dark)
      label(root, String.fromCharCode(65 + row), 0.21, 0.095, side * 3.55, level - 0.06, z - 0.652, Math.PI, '#e7c18f', '#17171b')
    }
  }
  for (const [side, group] of [[-1, left], [1, right]] as const) {
    const rotation = -side * Math.PI / 2
    box(group, 0.2, 8.7, back + 9, side * 5.7, 4.1, (back - 7.8) / 2, wall)
    box(group, 0.24, 0.13, back + 8.7, side * 5.53, 7.94, (back - 7.8) / 2, walnut)
    box(group, 0.025, 0.025, back + 8.6, side * 5.39, 7.85, (back - 7.8) / 2, light)
    for (let z = -4.8, index = 0; z < back - 1.8; z += 2.9, index++) {
      box(group, 0.12, 5.9, 2.72, side * 5.51, 4.35, z, index % 2 ? feltDark : felt)
      box(group, 0.18, 5.95, 0.045, side * 5.45, 4.35, z - 1.37, bronze)
      box(group, 0.2, 1.35, 2.72, side * 5.45, 0.57, z, walnut)
      // Intersecting pale light strips echo the reference auditorium's wall motif.
      for (const direction of [-1, 1]) {
        const strip = box(group, 0.045, 3.1, 0.045, side * 5.35, 4.45, z, blueLight)
        strip.rotation.x = direction * 0.65
      }
      if (index % 2 === 0) {
        const speaker = box(group, 0.32, 0.88, 0.48, side * 5.2, 6.45, z, dark)
        speaker.rotation.z = side * 0.1
        const grille = box(group, 0.025, 0.7, 0.38, side * 5.02, 6.43, z, metal)
        grille.rotation.z = side * 0.1
        for (let line = 0; line < 7; line++) box(group, 0.026, 0.018, 0.32, side * 5.002, 6.15 + line * 0.09, z, dark)
      }
    }
    // Double acoustic doors, brass push bars, green exit light and room plaque.
    const doorZ = back - 0.15
    box(group, 0.25, 2.85, 1.95, side * 5.43, endLevel + 1.425, doorZ, bronze)
    box(group, 0.27, 2.65, 1.76, side * 5.39, endLevel + 1.325, doorZ, dark)
    for (const offset of [-0.44, 0.44]) {
      box(group, 0.28, 2.55, 0.82, side * 5.35, endLevel + 1.31, doorZ + offset, red)
      box(group, 0.3, 0.08, 0.59, side * 5.3, endLevel + 1.12, doorZ + offset, metal)
      box(group, 0.02, 0.42, 0.19, side * 5.18, endLevel + 1.95, doorZ + offset, blackGlass())
    }
    label(group, 'EXIT  /  LỐI RA', 1.6, 0.34, side * 5.26, endLevel + 3.12, doorZ, rotation)
    label(group, 'CINEMA 01', 0.85, 0.22, side * 5.28, endLevel + 1.75, doorZ - 1.42, rotation, '#e4c69b', '#30292a')
    box(group, 0.85, 0.035, 1.9, side * 5.02, endLevel + 0.018, doorZ, metal)
  }
  function blackGlass() { return material('#233039', 0.3) }
  box(rear, 11.6, 8.7, 0.2, 0, 4.1, back + 1.12, wall)
  for (let x = -4.5; x <= 4.5; x += 1.5) box(rear, 1.35, 4.1, 0.16, x, endLevel + 2.15, back + 0.98, feltDark)
  box(rear, 1.55, 0.62, 0.19, 0, 6.8, back + 0.86, metal)
  box(rear, 1.35, 0.43, 0.2, 0, 6.8, back + 0.81, dark)
  label(rear, 'CINEMIND', 2.2, 0.42, 0, endLevel + 1.6, back + 0.8, Math.PI, '#d6c0a3', '#16181e')

  // The ceiling is visible when seated, cut away while looking into the room.
  box(ceiling, 11.6, 0.18, back + 8.7, 0, 8.48, (back - 7.6) / 2, dark)
  for (let z = -5.5; z < back; z += 2.8) {
    box(ceiling, 11.1, 0.1, 0.09, 0, 8.32, z, metal)
    for (const x of [-3.8, 3.8]) {
      cylinder(ceiling, 0.18, 0.06, x, 8.28, z, dark)
      cylinder(ceiling, 0.1, 0.065, x, 8.235, z, light)
    }
  }
  for (const x of [-2.8, 0, 2.8]) box(ceiling, 0.065, 0.1, back + 8.5, x, 8.31, (back - 7.6) / 2, metal)
  box(ceiling, 0.1, 0.5, 0.1, 0, 8.05, back - 0.5, metal)
  box(ceiling, 0.75, 0.38, 0.9, 0, 7.62, back - 0.5, metal)
  const lens = cylinder(ceiling, 0.12, 0.14, 0, 7.62, back - 1.02, blueLight); lens.rotation.x = Math.PI / 2

  // Proscenium, pleated dark-red side curtains and a restrained lit screen surround.
  box(root, 10.5, 0.12, 0.18, 0, 6.6, -7.03, bronze)
  box(root, 10.5, 0.12, 0.18, 0, 1.4, -7.03, bronze)
  for (const side of [-1, 1]) {
    box(root, 0.12, 5.3, 0.18, side * 5.18, 4, -7.03, bronze)
    for (let pleat = 0; pleat < 6; pleat++) {
      const fold = cylinder(root, 0.075, 6.4, side * (5.24 + pleat * 0.055), 3.75, -6.96 + (pleat % 2) * 0.055, red)
      fold.scale.z = 0.8
    }
  }
  box(root, 11, 0.33, 0.35, 0, 7.02, -7.05, walnut)
  box(root, 10.6, 0.025, 0.045, 0, 6.82, -6.86, light)
  label(root, 'C I N E M I N D', 2.15, 0.28, 0, 7.42, -7.16, 0, '#cfb294', '#101217')

  return {
    update(camera: THREE.Camera) {
      left.visible = camera.position.x > -5.65
      right.visible = camera.position.x < 5.65
      rear.visible = camera.position.z < back + 1.1
      ceiling.visible = camera.position.y < 8.35 && Math.abs(camera.position.x) < 5.65 && camera.position.z < back + 1.1
    },
    dispose() { geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose()); root.removeFromParent() },
  }
}
