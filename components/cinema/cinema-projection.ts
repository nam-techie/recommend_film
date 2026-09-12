import * as THREE from 'three'

export function projectCinemaVideo(video: HTMLVideoElement, screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>, poster: THREE.Texture, render: () => void) {
  const texture = new THREE.VideoTexture(video)
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false
  let disposed = false, videoFrame = 0, animationFrame = 0
  const draw = () => {
    if (disposed || video.readyState < 2 || document.visibilityState === 'hidden') return
    const ratio = video.videoWidth / Math.max(1, video.videoHeight), screenRatio = 9.85 / 4.82
    screen.scale.set(ratio < screenRatio ? ratio / screenRatio : 1, ratio > screenRatio ? screenRatio / ratio : 1, 1)
    if (screen.material.map !== texture) { screen.material.map = texture; screen.material.needsUpdate = true }
    render()
  }
  const cancel = () => {
    if (videoFrame && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrame)
    cancelAnimationFrame(animationFrame); videoFrame = 0; animationFrame = 0
  }
  const schedule = () => {
    if (disposed || video.paused || video.ended || document.visibilityState === 'hidden') return
    if (video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback(() => { videoFrame = 0; draw(); schedule() })
    else animationFrame = requestAnimationFrame(() => { animationFrame = 0; draw(); schedule() })
  }
  const start = () => { cancel(); draw(); schedule() }
  const stop = () => { cancel(); draw() }
  const visibility = () => { if (document.visibilityState === 'hidden') cancel(); else start() }
  video.addEventListener('loadeddata', start); video.addEventListener('playing', start)
  video.addEventListener('seeked', draw); video.addEventListener('pause', stop); video.addEventListener('ended', stop)
  document.addEventListener('visibilitychange', visibility)
  start()
  return () => {
    disposed = true; cancel()
    video.removeEventListener('loadeddata', start); video.removeEventListener('playing', start)
    video.removeEventListener('seeked', draw); video.removeEventListener('pause', stop); video.removeEventListener('ended', stop)
    document.removeEventListener('visibilitychange', visibility)
    screen.material.map = poster; screen.material.needsUpdate = true; screen.scale.set(1, 1, 1)
    texture.dispose()
  }
}
