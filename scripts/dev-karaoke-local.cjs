// Run the real pilot locally without maintaining a tester allowlist.
const { spawn } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const env = { ...process.env, NODE_ENV: 'development', KARAOKE_PILOT_ENABLED: 'true', KARAOKE_PILOT_ALLOW_ALL_LOCAL: 'true', PORT: '4001', NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL: 'http://localhost:4001', NEXT_PUBLIC_WATCH_PARTY_API_URL: 'http://localhost:4001' }
const children = [
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3000', '-H', '127.0.0.1'], { cwd: root, env, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['socket-server/server.js'], { cwd: root, env, stdio: 'inherit', windowsHide: true }),
]
let stopping = false
const stop = () => { if (stopping) return; stopping = true; children.forEach(child => child.kill()) }
for (const child of children) { child.on('error', error => { console.error(error.message); stop(); process.exitCode = 1 }); child.on('exit', code => { if (!stopping) { stop(); process.exitCode = code || 0 } }) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
console.log('Karaoke local: http://localhost:3000/karaoke — all authenticated local accounts; up to two selected microphones per turn.')
