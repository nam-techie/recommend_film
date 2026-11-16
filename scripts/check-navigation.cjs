// Verify the production Navbar across the breakpoints that hid Karaoke in PR #24.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.qa/navigation'),out=path.join(root,'.qa/results/navigation')
async function main(){
 await fs.mkdir(dir,{recursive:true});await fs.mkdir(out,{recursive:true})
 await fs.writeFile(path.join(dir,'index.html'),'<!doctype html><html lang="vi" class="dark" style="--font-sans:Arial,sans-serif;--font-display:Arial,sans-serif"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>')
 await fs.writeFile(path.join(dir,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import '@/app/globals.css';import Navbar from '@/components/Navbar';createRoot(document.getElementById('root')!).render(<><Navbar genres={[{slug:'hanh-dong',name:'Hành động'}]} countries={[{slug:'viet-nam',name:'Việt Nam'}]}/><main style={{padding:32}}><button>Vùng ngoài menu</button></main></>);`)
 await fs.writeFile(path.join(dir,'auth.ts'),`const auth={user:null,loading:false,logout:async()=>{}};export const useAuth=()=>auth;`)
 await fs.writeFile(path.join(dir,'link.tsx'),`import React from'react';export default function Link({children,...props}:any){return <a {...props}>{children}</a>}`)
 await fs.writeFile(path.join(dir,'navigation.ts'),`const params=new URLSearchParams();export const usePathname=()=>'/karaoke';export const useSearchParams=()=>params;`)
 await fs.writeFile(path.join(dir,'dynamic.ts'),`export default ()=>()=>null;`)
 await fs.writeFile(path.join(dir,'doubles.tsx'),`import React from'react';export const AuthDialog=({children}:any)=>children;export const GithubRepoControl=()=> <button style={{minWidth:120,height:44}}>GitHub 94</button>;export const SearchAutocomplete=()=> <input aria-label="Tìm phim" style={{width:'100%',minWidth:0}}/>;`)
 const aliases=[['@/components/auth/AuthProvider','auth.ts'],['@/components/auth/AuthDialog','doubles.tsx'],['@/components/GithubRepoControl','doubles.tsx'],['@/components/search/SearchAutocomplete','doubles.tsx'],['next/link','link.tsx'],['next/navigation','navigation.ts'],['next/dynamic','dynamic.ts']].map(([find,file])=>({find,replacement:path.join(dir,file)}))
 const {createServer}=await import('vite')
 const server=await createServer({root:dir,configFile:false,resolve:{alias:[...aliases,{find:'@',replacement:root}]},css:{postcss:root},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:4319,strictPort:true,fs:{allow:[root]}}})
 await server.listen()
 const {chromium}=require('../.qa/deps/node_modules/playwright'),browser=await chromium.launch({channel:'chrome',headless:false})
 const errors=[],results=[]
 try{
  for(const width of [390,1024,1280,1366,1536,1920]){
   const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message))
   await page.goto('http://127.0.0.1:4319')
   if(width>=1280){
    const vip=page.getByRole('button',{name:'VIP',exact:true});await vip.click()
    await page.getByRole('link',{name:'Karaoke',exact:false}).waitFor()
    assert.equal(await page.getByRole('link',{name:'Karaoke',exact:false}).getAttribute('href'),'/karaoke')
    assert.equal(await page.getByRole('link',{name:'Phòng chiếu',exact:false}).getAttribute('href'),'/watch-party')
    const bounds=await page.locator('#vip-navigation').boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width)
    if(width===1366)await page.screenshot({path:path.join(out,'desktop-vip.png')})
    await page.keyboard.press('Escape');assert.equal(await vip.getAttribute('aria-expanded'),'false');assert.equal(await vip.evaluate(el=>el===document.activeElement),true)
    await vip.click();await page.getByRole('button',{name:'Vùng ngoài menu'}).click();assert.equal(await vip.getAttribute('aria-expanded'),'false')
   }else{
    await page.getByRole('button',{name:'Mở menu'}).click()
    await page.locator('nav[aria-label="Menu di động"] summary').click()
    const menu=page.getByRole('navigation',{name:'Menu di động'})
    assert.equal(await menu.getByRole('link',{name:'Karaoke',exact:false}).getAttribute('href'),'/karaoke')
    assert.equal(await menu.getByRole('link',{name:'Phòng chiếu',exact:false}).getAttribute('href'),'/watch-party')
    if(width===390)await page.screenshot({path:path.join(out,'mobile-vip.png')})
    await page.keyboard.press('Escape');assert.equal(await menu.count(),0)
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no overflow at '+width)
   if(width<1536){await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await page.getByRole('textbox',{name:'Tìm phim'}).filter({visible:true}).waitFor()}
   results.push({width,dropdown:true,overflow:false});await page.close()
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors,screenshots:out},null,2))
 }finally{await browser.close();await server.close()}
}
main().catch(e=>{console.error(e);process.exit(1)})
