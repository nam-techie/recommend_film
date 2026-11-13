import test from 'node:test'
import assert from 'node:assert/strict'

test('karaoke libraries deny direct client reads and writes, including the owner', async () => {
  const base='http://127.0.0.1:9000/karaokeLibraries',ns='demo-moviewiser-rules-test-default-rtdb'
  const signup=async()=>{
    const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key',{method:'POST',headers:{'content-type':'application/json'},body:'{"returnSecureToken":true}'})
    assert.equal(response.status,200);return response.json()
  }
  const [owner,other]=await Promise.all([signup(),signup()])
  for(const token of ['',owner.idToken,other.idToken]){
    const url=`${base}/${owner.localId}.json?ns=${ns}${token ? '&auth='+encodeURIComponent(token) : ''}`
    assert.equal((await fetch(url)).status,401)
    assert.equal((await fetch(url,{method:'PUT',headers:{'content-type':'application/json'},body:'{"revision":1,"songs":{}}'})).status,401)
  }
})
