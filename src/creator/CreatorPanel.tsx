import { useEffect, useRef, useState } from 'react';
import { validateSpec, type CreationSpec } from './spec';
import type { SandboxController } from '../sandbox/engine';
import type { SaveStore } from '../sandbox/persistence';

const PROVIDER_LABELS: Record<string, string> = {
 groq: 'Groq',
 openai: 'OpenAI ChatGPT',
 pollinations: 'Pollinations',
 parley: 'MIT Parley',
 local: 'local synthesizer',
 configured: 'configured API',
};
function labelOf(name: string) { return PROVIDER_LABELS[name] || name; }
function estimateForgeMs(labels: string[]) {
 const first = labels[0] || '';
 if (/OpenAI/i.test(first)) return 11000;
 if (/Groq/i.test(first)) return 7000;
 if (/Pollinations/i.test(first)) return 13000;
 if (/Parley/i.test(first)) return 20000;
 return 2800;
}

export function CreatorPanel({store,engine,creations,onCreations}:{store:SaveStore;engine:()=>SandboxController|null;creations:CreationSpec[];onCreations:(v:CreationSpec[])=>void}) {
 const [prompt,setPrompt]=useState(''),[selected,setSelected]=useState(''),[stage,setStage]=useState('Ready'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[health,setHealth]=useState('Checking Forge…');
 const [progress,setProgress]=useState(0),[etaMs,setEtaMs]=useState(0),[chain,setChain]=useState<string[]>(['local synthesizer']);
 const request=useRef(0),abort=useRef<AbortController|null>(null),started=useRef(0),phase=useRef<'idle'|'wait'|'apply'>('idle');
 const records=store.world.creations??[];
 useEffect(()=>{let alive=true;void fetch('/api/parley/health').then(r=>r.json()).then(d=>{if(!alive)return;const labels=(d.labels as string[]|undefined)||(d.order as string|undefined)?.split(' → ')||['local synthesizer'];const order=labels.join(' → ');const primary=d.primaryLabel||labels[0]||'local synthesizer';setChain(labels);setHealth(`Forge try-order: ${order}. First call is ${primary}. Bosses save on this world.`);}).catch(()=>{if(alive){setChain(['local synthesizer']);setHealth('Forge server unavailable. Restart with scripts/dev.sh — the local synthesizer runs on that server.');}});return()=>{alive=false;request.current++;abort.current?.abort();};},[]);
 useEffect(()=>{
  if(!busy){setProgress(0);setEtaMs(0);return;}
  const estimate=estimateForgeMs(chain);
  started.current=Date.now();
  const id=window.setInterval(()=>{
   const elapsed=Date.now()-started.current;
   setProgress(Math.min(phase.current==='apply'?96:88, (elapsed/estimate)*100));
   setEtaMs(Math.max(0, estimate-elapsed));
   if(phase.current!=='wait'||!chain.length)return;
   const slice=Math.max(1800, estimate/Math.max(1,chain.length));
   const idx=Math.min(chain.length-1, Math.floor(elapsed/slice));
   const current=chain[idx]!;
   const next=chain[idx+1];
   setStage(next
    ? `Waiting on ${current} (${elapsed/1000|0}s). If it fails, next is ${next}.`
    : `Waiting on ${current} (${elapsed/1000|0}s) — last in the try-order.`);
  },120);
  return()=>window.clearInterval(id);
 },[busy,chain]);
 const cancel=()=>{request.current++;abort.current?.abort();phase.current='idle';setBusy(false);setStage('Cancelled — current creation preserved');};
 const build=async()=>{
  const gameAtStart=engine();
  const token=++request.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setProgress(4);phase.current='wait';
  setStage(`Sending prompt to ${chain[0] || 'the Forge'} first. Try-order: ${chain.join(' → ')}.`);
  try{
   const previous=creations.find(c=>c.id===selected);
   await new Promise(r=>requestAnimationFrame(r));if(token!==request.current)return;
   const res=await fetch('/api/creations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,previous}),signal:controller.signal});const result=await res.json();
   if(token!==request.current)return;if(!result.ok)throw Error(result.error||'Creation failed');
   phase.current='apply';setProgress(90);
   const from=labelOf(result.provider || 'forge');
   setStage(`Received JSON from ${from} · validating the spec`);
   const spec=validateSpec(result.data);if(previous&&spec.id!==previous.id)throw Error('Follow-up changed the creation ID');
   if(!previous&&creations.some(c=>c.id===spec.id))throw Error('That creation ID already exists. Select it to edit, or request a new name.');
   await new Promise(r=>requestAnimationFrame(r));if(token!==request.current)return;
   setStage(`Painting ${spec.name} from its shape layers (${from})`);const game=engine();if(!game||game!==gameAtStart)throw Error('Play session changed; request discarded.');
   game.applyCreation(spec);
   setProgress(100);setEtaMs(0);onCreations([...creations.filter(c=>c.id!==spec.id),spec]);setSelected(spec.id);setPrompt('');setStage(`Ready · ${spec.name} saved on this world via ${from}`);
  }catch(e){if(token===request.current){setStage('Failed — previous creation preserved');setError(e instanceof Error?e.message:String(e));}}
  finally{if(token===request.current){phase.current='idle';setBusy(false);}}
 };
 const etaSec=Math.ceil(etaMs/1000);
 const selectedRecord=records.find(c=>c.spec.id===selected);
 return <div className="creator-panel">
  <p>{health}</p>
  <p><strong>Forged bosses save on this world.</strong> Reload, death, and leaving the expedition keep them. Defeat pays coins once; use Respawn to bring a defeated boss back.</p>
  <p>World generation is a separate MIT Parley settings tool. This Forge only creates bosses. Status below names the provider currently being tried, then the one that actually returned the spec.</p>
  <label>Creation to edit<select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">New creation</option>{creations.map(c=><option key={c.id} value={c.id}>{c.name}{records.find(r=>r.spec.id===c.id)?.defeated?' (defeated)':''}</option>)}</select></label>
  <label>{selected?'Follow-up request':'Describe your creation'}<textarea rows={4} maxLength={6000} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Create a boss that throws bricks." /></label>
  <div className="creator-actions"><button disabled={busy||!prompt.trim()} onClick={()=>void build()}>{selected?'Update selected creation':'Create with AI'}</button>{busy&&<button onClick={cancel}>Cancel</button>}</div>
  {busy&&<div className="forge-progress" role="status">
   <div className="forge-progress-meta"><strong>{stage}</strong><span>{etaSec>0?`ETA ~${etaSec}s`:'Finishing…'}</span></div>
   <progress max={100} value={progress}/>
  </div>}
  {!busy&&<p role="status">{stage}</p>}{error&&<p role="alert">{error}</p>}
  <div className="creator-actions">
   <button disabled={busy||!selected} onClick={()=>{engine()?.removeCreation(selected);onCreations(creations.filter(c=>c.id!==selected));setSelected('');setStage('Removed creation from this world');}}>Remove this creation</button>
   <button disabled={busy||!selectedRecord?.defeated} onClick={()=>{const rec=selectedRecord;if(!rec)return;engine()?.applyCreation(rec.spec,{x:rec.x,y:rec.y});setStage(`Respawned ${rec.spec.name} in this world`);}}>Respawn defeated boss</button>
   <button disabled={busy||!creations.length} onClick={()=>{engine()?.resetCreations();onCreations([]);setSelected('');setStage('Removed all forged bosses from this world');}}>Remove all forged bosses</button>
  </div>
  {creations.filter(c=>!selected||c.id===selected).map(c=><article key={c.id}><h3>{c.name}</h3><p>{c.summary}</p><details><summary>Requirements and executable specification</summary><ul>{c.requirements.map((r,i)=><li key={i}>{r.text} — {r.evidence.join(', ')}{r.limitation&&` · ${r.limitation}`}</li>)}</ul><pre style={{whiteSpace:'pre-wrap',maxHeight:280,overflow:'auto'}}>{JSON.stringify(c,null,2)}</pre></details></article>)}
 </div>;
}
