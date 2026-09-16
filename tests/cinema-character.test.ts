import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { CINEMA_CHARACTERS, isCinemaCharacter, characterForPlan, defaultMemberCharacter } from '../lib/cinema-character'
import { attachCharacterBadge } from '../components/cinema/cinema-character-badge'
import { prepareCharacterGeometry, createCharacterRig, characterSeatOffset } from '../components/cinema/cinema-character-rig'

function assetGeometry(name: string) {
  const bytes = readFileSync(`public/3d/${name}_3d.optimized.glb`)
  const jsonSize = bytes.readUInt32LE(12)
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString())
  const primitive = gltf.meshes[0].primitives[0], accessor = gltf.accessors[primitive.attributes.POSITION]
  const view = gltf.bufferViews[accessor.bufferView], start = 20 + jsonSize + 8 + (view.byteOffset || 0) + (accessor.byteOffset || 0)
  const positions = new Float32Array(accessor.count * 3)
  for (let i = 0; i < positions.length; i++) positions[i] = bytes.readFloatLE(start + i * 4)
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

describe('cinema character pilot', () => {
  it.each(CINEMA_CHARACTERS)('%s has normalized skin weights and preserves the original bind pose', name => {
    const original = assetGeometry(name)
    const geometry = prepareCharacterGeometry(original, new THREE.Matrix4())
    const weights = geometry.getAttribute('skinWeight'), joints = geometry.getAttribute('skinIndex'), position = geometry.getAttribute('position')
    const material = new THREE.MeshBasicMaterial(), rig = createCharacterRig(geometry, material)
    rig.group.updateMatrixWorld(true); rig.mesh.skeleton.update()
    for (let i = 0; i < weights.count; i += 17) {
      expect(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)).toBeCloseTo(1)
      expect(joints.getX(i)).toBeLessThan(15); expect(joints.getY(i)).toBeLessThan(15)
      const vertex = new THREE.Vector3().fromBufferAttribute(position, i)
      expect(rig.mesh.applyBoneTransform(i, vertex.clone()).distanceTo(vertex)).toBeLessThan(.00001)
    }
    rig.pose(1, 0, false, 0, false, name.endsWith('_vip'))
    rig.group.updateMatrixWorld(true); rig.mesh.skeleton.update()
    const thigh = rig.mesh.skeleton.getBoneByName('leftThigh')!, knee = rig.mesh.skeleton.getBoneByName('leftShin')!
    const hipPoint = thigh.getWorldPosition(new THREE.Vector3()), kneePoint = knee.getWorldPosition(new THREE.Vector3())
    expect(kneePoint.z).toBeGreaterThan(hipPoint.z + .25)
    expect(Math.abs(kneePoint.y - hipPoint.y)).toBeLessThan(.04)
    expect(hipPoint.y).toBeGreaterThan(name.endsWith('_vip') ? .90 : .78)
    for (let i = 0; i < position.count; i += 31) {
      const vertex = rig.mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(position, i))
      expect(vertex.toArray().every(Number.isFinite)).toBe(true)
    }
    rig.group.rotation.y = Math.PI
    rig.group.position.z = characterSeatOffset(name.endsWith('_vip'))
    rig.group.updateMatrixWorld(true)
    expect(knee.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(name.endsWith('_vip') ? -.58 : -.59)
    rig.dispose(); geometry.dispose(); original.dispose(); material.dispose()
  })

  it('each audience member has independent bones', () => {
    const original = assetGeometry('male'), geometry = prepareCharacterGeometry(original, new THREE.Matrix4())
    const material = new THREE.MeshBasicMaterial(), a = createCharacterRig(geometry, material), b = createCharacterRig(geometry, material)
    a.pose(1, 0, false, 0, false)
    expect(b.mesh.skeleton.getBoneByName('leftThigh')!.rotation.x).toBe(0)
    a.dispose(); b.dispose(); original.dispose(); geometry.dispose(); material.dispose()
  })

  it('rejects malformed saved character preferences', () => {
    expect(isCinemaCharacter('female_vip')).toBe(true)
    for (const value of [null, {}, 'ultra', '../male', 'MALE', 1]) expect(isCinemaCharacter(value)).toBe(false)
  })
})


describe('room character identity', () => {
  it('Ultra always has VIP models, independently of seating and saved costumes', () => {
    expect(characterForPlan('male', 'ultra')).toBe('male_vip')
    expect(characterForPlan('female', 'ultra')).toBe('female_vip')
    expect(characterForPlan('female_vip', 'premium')).toBe('female')
    expect(characterForPlan('male_vip', undefined)).toBe('male')
    expect(defaultMemberCharacter('same-member', 'ultra')).toBe(`${defaultMemberCharacter('same-member', 'normal')}_vip`)
  })
  it('avatar follows the head through walking/sitting, hides with actor and releases only its material', () => {
    const geometry = prepareCharacterGeometry(assetGeometry('male'), new THREE.Matrix4())
    const rig = createCharacterRig(geometry, new THREE.MeshBasicMaterial())
    const texture = new THREE.Texture()
    const badge = attachCharacterBadge(rig, texture, 'me')
    expect(badge.sprite.parent?.name).toBe('head')
    for (const sit of [0, 1]) {
      rig.pose(sit, 1, !sit, 0, false)
      rig.group.position.set(2, 1, 3); rig.group.updateMatrixWorld(true)
      const head = rig.mesh.skeleton.getBoneByName('head')!.getWorldPosition(new THREE.Vector3())
      const point = badge.sprite.getWorldPosition(new THREE.Vector3())
      expect(point.y - head.y).toBeGreaterThan(.55)
      expect(point.x).toBeCloseTo(head.x)
    }
    rig.group.visible = false
    let visible = true
    badge.sprite.traverseAncestors(parent => { visible = visible && parent.visible })
    expect(visible).toBe(false)
    let disposed = false
    texture.addEventListener('dispose', () => { disposed = true })
    badge.dispose()
    expect(badge.sprite.parent).toBeNull()
    expect(disposed).toBe(false)
    rig.dispose(); geometry.dispose(); texture.dispose()
  })
})
