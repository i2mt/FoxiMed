'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const handlers={},stores=new Map();let network=0,offline=false;
const source=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
const context=vm.createContext({
  URL,Request,Response,Promise,console,
  self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim(){}},skipWaiting(){}},
  caches:{async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
    async match(req){const value=store.get(typeof req==='string'?req:req.url);return value?.clone()},
    async put(req,response){store.set(typeof req==='string'?req:req.url,response.clone())},
    async add(url){store.set(url,new Response('shell'))}
  }},async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)},async match(){return undefined}},
  async fetch(req){network++;if(offline)throw new Error('offline');return new Response('book payload',{status:200})}
});
vm.runInContext(source,context);
async function fetchEvent(url){let response;const tasks=[];handlers.fetch({request:new Request(url),respondWith(p){response=p},waitUntil(p){tasks.push(p)}});const result=await response;await Promise.all(tasks);return result;}
(async()=>{
  const cached=vm.runInContext('urlsToCache',context);
  assert(cached.includes('./drug-reference-index.js?v=3'));
  assert(!cached.some(url=>/drug-reference-book-\d/.test(url)));
  assert(!cached.some(url=>url.includes('sherpa-koochik/')), 'generated voice assets must be cached on demand');
  const url='https://example.test/FoxiMed/drug-reference-book-01.js?v=4';
  assert.equal(await (await fetchEvent(url)).text(),'book payload');assert.equal(network,1);
  offline=true;assert.equal(await (await fetchEvent(url)).text(),'book payload');assert.equal(network,1);
  // Revision-specific keys must never serve bytes from an old extraction.
  offline=false;await fetchEvent(url.replace('v=4','v=5'));assert.equal(network,2);
  const voice='https://example.test/FoxiMed/sherpa-koochik/sherpa-onnx-asr.js';
  await fetchEvent(voice);const afterVoice=network;offline=true;assert.equal(await (await fetchEvent(voice)).text(),'book payload');assert.equal(network,afterVoice);
  console.log('drug reference cache checks: PASS (lazy install; cached detail works offline; revision isolation)');
})().catch(error=>{console.error(error);process.exit(1)});
