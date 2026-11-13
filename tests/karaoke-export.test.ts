import { beforeEach, describe, expect, it, vi } from 'vitest'
const state=vi.hoisted(()=>({auth:vi.fn(),get:vi.fn(),save:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/lib/server/firebase-admin',()=>({requireUser:state.auth,AdminAccessError:class extends Error{}}))
vi.mock('@/lib/server/karaoke-library',()=>({getKaraokeLibrary:state.get,mutateKaraokeLibrary:state.save}))
vi.mock('@/lib/server/karaoke-request',async()=>{const {NextResponse}=await import('next/server');return {listRequestBody:(request:Request)=>request.json(),listJson:(value:unknown)=>NextResponse.json(value,{headers:{'Cache-Control':'private, no-store'}})}})
import { POST as EXPORT } from '@/app/api/me/karaoke/export/route'
import { GET, POST } from '@/app/api/me/karaoke/route'
import { MonetizationError } from '@/lib/server/monetization-error'
const ids=['abcdefghijk','lmnopqrstuv']
const request=(body:unknown)=>new Request('http://local/api/me/karaoke',{method:'POST',body:JSON.stringify(body)})
beforeEach(()=>{vi.clearAllMocks();state.auth.mockResolvedValue({uid:'own'});state.get.mockResolvedValue({revision:1,playlists:{},songs:{[ids[0]]:{title:'Ngày đầu tiên'},[ids[1]]:{title:'Mưa trên phố'}}});state.save.mockResolvedValue({revision:2})})
describe('karaoke private routes and Word export',()=>{
  it('uses authenticated UID even when query/body supply a different UID',async()=>{
    await GET(new Request('http://local/api/me/karaoke?uid=other'))
    await POST(request({uid:'other',action:'song'}))
    expect(state.get).toHaveBeenCalledWith('own');expect(state.save.mock.calls[0][0]).toBe('own')
    state.auth.mockRejectedValue(new MonetizationError('AUTH','Login',401))
    expect((await EXPORT(request({videoIds:ids}))).status).toBe(401)
  })
  it('emits an OOXML ZIP in selected order with Vietnamese titles and no identifiers or links',async()=>{
    const response=await EXPORT(request({videoIds:[ids[1],ids[0]],uid:'other'}))
    expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store')
    const bytes=Buffer.from(await response.arrayBuffer()),files:Record<string,string>={};let offset=0
    while(bytes.readUInt32LE(offset)===0x04034b50){const size=bytes.readUInt32LE(offset+18),length=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),name=bytes.subarray(offset+30,offset+30+length).toString(),start=offset+30+length+extra;files[name]=bytes.subarray(start,start+size).toString('utf8');offset=start+size}
    const xml=files['word/document.xml']
    expect(xml.indexOf('Mưa trên phố')).toBeLessThan(xml.indexOf('Ngày đầu tiên'))
    expect(xml).toContain('w:numPr');expect(files['word/numbering.xml']).toContain('decimal')
    for(const id of [...ids,'own','other'])expect(xml).not.toContain(id)
    expect(xml).not.toContain('hyperlink');expect(Object.values(files).join('')).not.toContain('youtube.com')
  })
  it('rejects missing titles, URL titles, foreign IDs and duplicate selection',async()=>{
    expect((await EXPORT(request({videoIds:[ids[0],ids[0]]}))).status).toBe(400)
    expect((await EXPORT(request({videoIds:['zyxwvutsrqp']}))).status).toBe(400)
    for(const title of [ids[0],'','https://youtu.be/'+ids[0]]){state.get.mockResolvedValue({songs:{[ids[0]]:{title}}});expect((await EXPORT(request({videoIds:[ids[0]]}))).status).toBe(400)}
  })
  it('pages at 50 and rejects a cursor whose library revision has changed',async()=>{
    state.get.mockResolvedValue({revision:2,playlists:{},songs:Object.fromEntries(Array.from({length:51},(_,i)=>[String(i).padStart(11,'0'),{title:'Song'}]))})
    const first=await (await GET(new Request('http://local/api/me/karaoke'))).json()
    expect(Object.keys(first.songs)).toHaveLength(50);expect(first.next).toBe('00000000049')
    expect((await GET(new Request('http://local/api/me/karaoke?after=00000000049&revision=1'))).status).toBe(409)
    const last=await (await GET(new Request('http://local/api/me/karaoke?after=00000000049&revision=2'))).json()
    expect(Object.keys(last.songs)).toHaveLength(1);expect(last.next).toBeNull()
  })
})
