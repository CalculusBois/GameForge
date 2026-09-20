import {describe,it,expect,vi} from 'vitest';
import {handleCreation, describeForgeHealth} from './creatorService';
import {exampleSpec} from '../creator/example';
const config={apiKey:'test-key',baseUrl:'https://example.invalid/v1',model:'gpt-6-astra'};
const answer=(value:unknown)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
describe('session creator provider',()=>{
 it('sends follow-up with full prior specification and preserves identity',async()=>{
  let sent:any;const next=structuredClone(exampleSpec);next.visuals[1].orbitSpeed=4;
  const res=await handleCreation({prompt:'Make the shards orbit faster',previous:exampleSpec},config,async(_url,init)=>{sent=JSON.parse(String(init?.body));return answer(next);});
  expect(res.ok).toBe(true);expect(JSON.parse(sent.messages[1].content).previous).toEqual(exampleSpec);
  next.id='duplicate';expect((await handleCreation({prompt:'Edit selected',previous:exampleSpec},config,async()=>answer(next))).ok).toBe(false);
 });
 it('rejects empty requests before provider calls and never leaks upstream credential echoes',async()=>{
  const fetcher=vi.fn();expect((await handleCreation({prompt:''},config,fetcher)).statusCode).toBe(400);expect(fetcher).not.toHaveBeenCalled();
  const res=await handleCreation({prompt:'Add crystal boss'},config,async()=>new Response('test-key secret upstream echo',{status:401}));expect(res.error).not.toContain('test-key');expect(res.ok).toBe(false);
 });
 it('reports the real Forge try-order ending with the local synthesizer',()=>{
  const health=describeForgeHealth();
  expect(health.providers.at(-1)).toBe('local');
  expect(health.order).toMatch(/local synthesizer/);
  expect(health.primaryLabel).toBeTruthy();
  expect(health.labels).toHaveLength(health.providers.length);
 });
 it('caps repair attempts and refuses unsupported mechanics',async()=>{
  const next=structuredClone(exampleSpec);next.requirements[0].supported=false;next.requirements[0].limitation='Network access is unavailable';
  const fetcher=vi.fn(async()=>answer(next));const result=await handleCreation({prompt:'Add networked trading'},config,fetcher);expect(fetcher).toHaveBeenCalledTimes(2);expect(result.ok).toBe(false);expect(result.error).toContain('Network access');
 });
});
