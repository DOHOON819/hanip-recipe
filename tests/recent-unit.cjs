const assert=require('node:assert/strict');
(async()=>{
 const {createRecentHistory,RECENT_KEY}=await import('../recent.js');
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 let time=100000;const history=createRecentHistory(storage,()=>time);
 assert.deepEqual(history.list(),[]);
 history.record('one');history.record('two');history.record('one');
 assert.deepEqual(history.list().map(x=>x.id),['one','two']);
 assert.equal(history.list().length,2);
 history.remove('one');assert.deepEqual(history.list().map(x=>x.id),['two']);
 for(let i=0;i<150;i++){time++;history.record('recipe-'+i);}
 assert.equal(history.list().length,100);assert.equal(history.list()[0].id,'recipe-149');
 assert.ok(Object.keys(JSON.parse(data.get(RECENT_KEY))[0]).every(k=>['id','viewedAt'].includes(k)));
 const afterReload=createRecentHistory(storage,()=>time);assert.deepEqual(afterReload.list(),history.list());
 afterReload.clear();assert.deepEqual(createRecentHistory(storage,()=>time).list(),[]);
 data.set(RECENT_KEY,'not valid');assert.deepEqual(createRecentHistory(storage,()=>time).list(),[]);
 data.set(RECENT_KEY,JSON.stringify([{id:'<script>',viewedAt:time},{id:'one',viewedAt:time},{id:'one',viewedAt:time-1},{id:'future',viewedAt:time+100000},{id:'nan',viewedAt:'now'}]));
 assert.deepEqual(createRecentHistory(storage,()=>time).list(),[{id:'one',viewedAt:time}]);
 const blocked=createRecentHistory(null,()=>time);assert.equal(blocked.record('session-only'),false);assert.equal(blocked.list()[0].id,'session-only');blocked.clear();assert.equal(blocked.list().length,0);
 console.log('PASS: 100-item bounded browser-local history, MRU dedup, persistence, privacy fields, removal, clear, corrupt storage and blocked-storage fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
