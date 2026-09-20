import { useEffect, useRef, useState } from 'react';
import { validateSpec, type CreationSpec } from './spec';
import type { SandboxController } from '../sandbox/engine';
import type { SaveStore } from '../sandbox/persistence';
export function CreatorPanel({store,engine,creations,onCreations,onEnter,onExit}:{store:SaveStore;engine:()=>SandboxController|null;creations:CreationSpec[];onCreations:(v:CreationSpec[])=>void;onEnter:()=>Promise<void>;onExit:()=>Promise<void>}) {
 const [prompt,setPrompt]=useState(''),[selected,setSelected]=useState(''),[stage,setStage]=useState('Ready'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[health,setHealth]=useState('Checking server configuration…');
 const request=useRef(0),abort=useRef<AbortController|null>(null);
 useEffect(()=>{let alive=true;void fetch('/api/parley/health').then(r=>r.json()).then(d=>{if(alive)setHealth(d.hasKey?`Server configured · ${d.model} · live access checked on creation`:'Missing server PARLEY_API_KEY; configure .env and restart.');}).catch(()=>{if(alive)setHealth('Server unavailable. Launch the updated project with scripts/dev.sh.');});return()=>{alive=false;request.current++;abort.current?.abort();};},[]);
 const cancel=()=>{request.current++;abort.current?.abort();setBusy(false);setStage('Cancelled — current creation preserved');};
 const build=async()=>{
  const gameAtStart=engine();
  const token=++request.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setStage('Interpreting request');
  try{
   const previous=creations.find(c=>c.id===selected);
   await new Promise(r=>requestAnimationFrame(r));if(token!==request.current)return;
   setStage('Building creation');
   const res=await fetch('/api/creations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,previous}),signal:controller.signal});const result=await res.json();
   if(token!==request.current)return;if(!result.ok)throw Error(result.error||'Creation failed');
   setStage('Validating');const spec=validateSpec(result.data);if(previous&&spec.id!==previous.id)throw Error('Follow-up changed the creation ID');
   if(!previous&&creations.some(c=>c.id===spec.id))throw Error('That creation ID already exists. Select it to edit, or request a new name.');
   await new Promise(r=>requestAnimationFrame(r));if(token!==request.current)return;
   setStage('Applying');const game=engine();if(!game||game!==gameAtStart)throw Error('Play session changed; request discarded.');
   const wasActive=store.aiSession;
   if(!wasActive){await onEnter();}
   if(token!==request.current){if(!wasActive)await store.exitAISession();return;}
   try {game.applyCreation(spec);}catch(e){if(!wasActive)await store.exitAISession();throw e;}
   onCreations([...creations.filter(c=>c.id!==spec.id),spec]);setSelected(spec.id);setPrompt('');setStage(`Ready · ${spec.name}`);
  }catch(e){if(token===request.current){setStage('Failed — previous creation preserved');setError(e instanceof Error?e.message:String(e));}}
  finally{if(token===request.current)setBusy(false);}
 };
 return <div className="creator-panel">
  <p>{health}</p><p><strong>AI-session progress is temporary.</strong> Coins, inventory, terrain edits and rewards are discarded on exit or reload. Normal saves resume after exit.</p>
  <p>Build layered shapes, attached and orbiting weapons, flying enemies, telegraphed attacks, bounded behavior graphs and custom buildup meters. Terrain generation, inventory weapons and arbitrary scripts are not supported here.</p>
  <label>Creation to edit<select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">New creation</option>{creations.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>{selected?'Follow-up request':'Describe your creation'}<textarea rows={4} maxLength={6000} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Create a flying sword boss with six swords spinning around it that periodically shoots homing swords at the player." /></label>
  <div className="creator-actions"><button disabled={busy||!prompt.trim()} onClick={()=>void build()}>{selected?'Update selected creation':'Create with Parley'}</button>{busy&&<button onClick={cancel}>Cancel</button>}</div>
  <p role="status">{stage}</p>{error&&<p role="alert">{error}</p>}
  <div className="creator-actions"><button disabled={busy||!selected} onClick={()=>{engine()?.removeCreation(selected);onCreations(creations.filter(c=>c.id!==selected));setSelected('');setStage('Removed creation and owned effects');}}>Remove this creation</button><button disabled={busy||!creations.length} onClick={()=>void onExit()}>Reset all AI changes</button><button disabled={busy||!store.aiSession} onClick={()=>void onExit()}>Exit AI session</button></div>
  {creations.filter(c=>!selected||c.id===selected).map(c=><article key={c.id}><h3>{c.name}</h3><p>{c.summary}</p><details><summary>Requirements and executable specification</summary><ul>{c.requirements.map((r,i)=><li key={i}>{r.text} — {r.evidence.join(', ')}{r.limitation&&` · ${r.limitation}`}</li>)}</ul><pre style={{whiteSpace:'pre-wrap',maxHeight:280,overflow:'auto'}}>{JSON.stringify(c,null,2)}</pre></details></article>)}
 </div>;
}
