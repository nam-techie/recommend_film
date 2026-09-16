import * as THREE from 'three'
import type { createCharacterRig } from './cinema-character-rig'

/** The scene owns the shared texture; this attachment owns only its sprite material. */
export function attachCharacterBadge(rig: ReturnType<typeof createCharacterRig>, texture: THREE.Texture, memberId: string) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false, toneMapped: false })
  const sprite = new THREE.Sprite(material)
  sprite.name = `character-avatar:${memberId}`
  sprite.scale.set(.28, .28, 1)
  // The head joint is below the crown: place the badge above it without hiding the face.
  sprite.position.set(0, .58, 0)
  rig.mesh.skeleton.getBoneByName('head')!.add(sprite)
  return {
    sprite,
    update(next: THREE.Texture) { if (material.map !== next) { material.map = next; material.needsUpdate = true } },
    dispose() { sprite.removeFromParent(); material.dispose() },
  }
}
