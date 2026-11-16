// Explicitly loaded only by the local Playwright runner; never imported by app/service code.
import { registerHooks } from 'node:module'
if (process.env.ROOM_TEST_MODE !== '1') throw Error('This fixture requires ROOM_TEST_MODE=1')
process.env.NODE_ENV = 'test'
process.env.REDIS_URL = ''
process.env.WATCH_PARTY_TOKEN_SECRET = 'isolated-room-test-secret'
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({project_id:'room-test',client_email:'test@example.invalid',private_key:'test-only'})
process.env.FIREBASE_DATABASE_URL = 'https://example.invalid'
process.env.LIVEKIT_URL = ''
process.env.LIVEKIT_API_KEY = ''
process.env.LIVEKIT_API_SECRET = ''
const sources = {
  'dotenv': "export default {config(){return {parsed:{}}}}",
  'firebase-admin/app': "export const getApps=()=>[]; export const initializeApp=()=>({}); export const applicationDefault=()=>({}); export const cert=()=>({});",
  'firebase-admin/auth': `export const getAuth=()=>({listUsers:async()=>({users:[]}),verifyIdToken:async uid=>{if(!['host','singer','listener','duet'].includes(uid))throw Object.assign(Error('test token rejected'),{code:'auth/invalid-id-token'});return {uid,name:uid,exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'google.com'}}}});`,
  'firebase-admin/database': `const plans={host:'ultra',singer:'premium',listener:'normal',duet:'ultra'};export const getDatabase=()=>({ref(path){const value=path.startsWith('monetization/entitlements/')?{plan:plans[path.split('/').pop()]||'normal',status:'active',expiresAt:Date.now()+3600000}:null;return {get:async()=>({exists:()=>!!value,val:()=>value}),limitToFirst(){return this},set:async()=>{},update:async()=>{},remove:async()=>{}}}});`,
}
registerHooks({
  resolve(specifier, context, next) { return sources[specifier] ? {url:'room-test:'+specifier,shortCircuit:true} : next(specifier, context) },
  load(url, context, next) { return url.startsWith('room-test:') ? {format:'module',source:sources[url.slice(10)],shortCircuit:true} : next(url,context) },
})
