import * as THREE from 'three'

const HEIGHT = 1.6
// The supplied chairs have deep cushions; knees must extend beyond their front edge.
export const characterSeatOffset = (vip: boolean) => vip ? -.36 : -.28
const smooth = (value: number, start: number, end: number) => THREE.MathUtils.smoothstep(value, start, end)
const jointPositions = [
  [0, .46, 0], [0, .61, 0], [0, .735, 0],
  [-.073, .45, 0], [-.083, .235, .008], [-.087, .065, .025],
  [.073, .45, 0], [.083, .235, .008], [.087, .065, .025],
  [-.135, .675, 0], [-.207, .565, 0], [-.263, .445, .012],
  [.135, .675, 0], [.207, .565, 0], [.263, .445, .012],
] as const
const parents = [-1, 0, 1, 0, 3, 4, 0, 6, 7, 1, 9, 10, 1, 12, 13]
const jointNames = ['hips', 'chest', 'head', 'leftThigh', 'leftShin', 'leftFoot', 'rightThigh', 'rightShin', 'rightFoot', 'leftArm', 'leftForearm', 'leftHand', 'rightArm', 'rightForearm', 'rightHand']

/** Anatomical approximation for these four A-pose meshes only, not a general auto-rigger. */
export function prepareCharacterGeometry(source: THREE.BufferGeometry, worldMatrix: THREE.Matrix4) {
  const geometry = source.clone().applyMatrix4(worldMatrix)
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!, center = box.getCenter(new THREE.Vector3())
  const height = box.max.y - box.min.y
  geometry.translate(-center.x, -box.min.y, -center.z)
  geometry.scale(HEIGHT / height, HEIGHT / height, HEIGHT / height)
  const position = geometry.getAttribute('position')
  const indices = new Uint16Array(position.count * 4), weights = new Float32Array(position.count * 4)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / HEIGHT, y = position.getY(i) / HEIGHT
    const z = position.getZ(i) / HEIGHT, ax = Math.abs(x)
    let first = 0, second = 0, mix = 0
    // Long hair at the back follows the head, not the shoulders.
    if (y > .71 || (y > .57 && z < -.075 && ax < .16)) {
      first = 1; second = 2; mix = smooth(y, .70, .75)
      if (z < -.075) mix = 1
    } else if (ax > .14 + Math.max(0, .65 - y) * .23 && y > .36 && y < .70) {
      const arm = x < 0 ? 9 : 12
      if (y < .49) { first = arm + 2; second = arm + 1; mix = smooth(y, .44, .49) }
      else { first = arm + 1; second = arm; mix = smooth(y, .53, .61) }
    } else if (y < .48) {
      const thigh = x < 0 ? 3 : 6
      if (y < .105) { first = thigh + 2; second = thigh + 1; mix = smooth(y, .06, .105) }
      else if (y < .29) { first = thigh + 1; second = thigh; mix = smooth(y, .20, .28) }
      else { first = thigh; second = 0; mix = smooth(y, .405, .475) }
    } else { first = 0; second = 1; mix = smooth(y, .49, .65) }
    indices[i * 4] = first; indices[i * 4 + 1] = second
    weights[i * 4] = 1 - mix; weights[i * 4 + 1] = mix
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  return geometry
}

export function createCharacterRig(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
  const bones = jointPositions.map((position, i) => {
    const bone = new THREE.Bone(); bone.name = jointNames[i]
    bone.position.set(position[0], position[1], position[2]).multiplyScalar(HEIGHT)
    if (parents[i] >= 0) bone.position.sub(new THREE.Vector3(...jointPositions[parents[i]]).multiplyScalar(HEIGHT))
    return bone
  })
  bones.forEach((bone, i) => { if (parents[i] >= 0) bones[parents[i]].add(bone) })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  const skeleton = new THREE.Skeleton(bones)
  mesh.add(bones[0]); mesh.bind(skeleton)
  // Geometry bounds are the standing pose; animated limbs can extend outside them.
  mesh.frustumCulled = false
  const group = new THREE.Group(); group.add(mesh)
  return {
    group, mesh,
    pose(sit: number, stride: number, walking: boolean, time: number, idle = true, vip = false) {
      bones.forEach(bone => bone.rotation.set(0, 0, 0))
      bones[0].position.y = HEIGHT * .46 + sit * (vip ? .244 : .084)
      bones[0].position.y += walking ? Math.abs(Math.sin(stride)) * .022 : 0
      bones[1].rotation.x = sit * -.06
      bones[2].rotation.y = idle && !walking ? Math.sin(time * .45) * .055 : 0
      for (const [thigh, phase] of [[3, 0], [6, Math.PI]]) {
        const swing = walking ? Math.sin(stride + phase) : 0
        bones[thigh].rotation.x = -sit * Math.PI / 2 + swing * .38 * (1 - sit)
        bones[thigh + 1].rotation.x = sit * Math.PI / 2 + Math.max(0, -swing) * .48 * (1 - sit)
      }
      for (const [arm, side] of [[9, -1], [12, 1]]) {
        bones[arm].rotation.z = -side * .36
        bones[arm].rotation.x = -sit * .32 + (walking ? Math.sin(stride) * side * .24 : 0)
        bones[arm + 1].rotation.x = -sit * .85
      }
    },
    dispose() { skeleton.dispose() },
  }
}
