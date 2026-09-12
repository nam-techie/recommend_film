import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { stat } from 'node:fs/promises'

const source = process.argv[2] || 'public/3d/Meshy_AI_Red_Cinema_Chair_0911084503_image-to-3d-texture.glb'
const target = process.argv[3] || 'public/3d/cinema-chair.optimized.glb'
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const document = await io.read(source)
const triangles = () => document.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() || 0) / 3, 0), 0)
const before = triangles()
await document.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.06, error: 0.004 }), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }))
await io.write(target, document)
console.log(JSON.stringify({ source, target, trianglesBefore: before, trianglesAfter: triangles(), bytes: (await stat(target)).size }))
