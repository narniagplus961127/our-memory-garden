import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck, usePuck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import './style.css';

// Design-phase experiment only: browser storage simulates a server; no real user data.
const SAVED = 'memory-garden-puck-experiment-saved-v1';
const RECOVERY = 'memory-garden-puck-experiment-unsaved-v1';
const sample = { root: { props: {} }, content: [
  { type: 'Text', props: { id: 'Text-sample', text: 'A little note', kind: 'heading' } },
  { type: 'Text', props: { id: 'Text-body', text: 'A space for the moments we want to keep close.', kind: 'paragraph' } },
  { type: 'Image', props: { id: 'Image-sample', label: 'Your photo goes here' } },
], zones: {} };

const config = {
  components: {
    Text: { label: 'Text', fields: { text: { type: 'textarea', label: 'Content' }, kind: { type: 'select', label: 'Text style', options: [{label:'Heading', value:'heading'}, {label:'Paragraph', value:'paragraph'}] } }, defaultProps: { text:'Write something lovely', kind:'paragraph' }, render: ({text, kind}) => kind === 'heading' ? <h1>{text}</h1> : <p>{text}</p> },
    Image: { label: 'Image placeholder', fields: { label: {type:'text', label:'Placeholder text'} }, defaultProps: {label:'Your photo goes here'}, render: ({label}) => <div style={{minHeight:180,background:'#d6e1cc',display:'grid',placeItems:'center',color:'#53664e'}}>{label}</div> },
    Section: { label:'Section', fields: { content:{type:'slot'} }, defaultProps:{ content:[] }, render: ({content: Content}) => <section style={{padding:24,background:'#f4f0e5',minHeight:80}}><Content /></section> },
    Columns: { label:'Two columns', fields: { left:{type:'slot'}, right:{type:'slot'} }, defaultProps:{left:[],right:[]}, render: ({left: Left,right: Right}) => <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}><div style={{minHeight:80}}><Left /></div><div style={{minHeight:80}}><Right /></div></div> },
  },
  root: { render: ({children}) => <main style={{padding:'32px 5%',background:'#f6f1e7',color:'#304337',fontFamily:'Georgia,serif',minHeight:'80vh'}}>{children}</main> },
};

function read(key) { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
function QuickControls() {
  const { appState, dispatch } = usePuck();
  const content = appState.data.content || [];
  function update(next) { dispatch({type:'setData',data:{...appState.data,content:next}}); }
  function insert(type) {
    const defaults = structuredClone(config.components[type].defaultProps);
    update([...content,{type,props:{...defaults,id:`${type}-${crypto.randomUUID()}`}}]);
  }
  function move(index,delta) {
    const target=index+delta;if(target<0||target>=content.length)return;
    const next=[...content];[next[index],next[target]]=[next[target],next[index]];update(next);
  }
  return <section className="quick"><h2>Tap to add</h2><div className="quick-add">{Object.keys(config.components).map(type=><button key={type} onClick={()=>insert(type)}>{config.components[type].label}</button>)}</div><h2>Move top-level blocks</h2>{content.map((item,i)=><div className="quick-row" key={item.props.id}><span>{config.components[item.type]?.label || item.type}</span><button aria-label={`Move ${item.type} ${i+1} up`} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button aria-label={`Move ${item.type} ${i+1} down`} disabled={i===content.length-1} onClick={()=>move(i,1)}>↓</button></div>)}<p>Nested blocks currently require Puck's drag controls.</p></section>;
}
function App() {
  const initial=useRef(read(RECOVERY) ?? read(SAVED) ?? sample);
  const [status,setStatus]=useState(read(RECOVERY) ? 'Recovered — unsaved' : 'Sample ready');
  const [offline,setOffline]=useState(false); const failure=useRef(false); const pending=useRef(read(RECOVERY)); const timer=useRef(null);
  const [size,setSize]=useState('Desktop');
  const [saveError,setSaveError]=useState('');
  function saveNow() {
    clearTimeout(timer.current);
    if (!pending.current) return;
    if (failure.current) { setStatus('Could not save — retry when online'); return; }
    try { localStorage.setItem(SAVED,JSON.stringify(pending.current)); localStorage.removeItem(RECOVERY); pending.current=null; setSaveError(''); setStatus('Saved locally'); }
    catch {setSaveError('Browser storage unavailable. Keep this tab open.');setStatus('Could not save');}
  }
  function changed(data) {
    pending.current=data;
    try { localStorage.setItem(RECOVERY,JSON.stringify(data)); } catch {setSaveError('Recovery copy could not be stored.');}
    setStatus('Saving…'); clearTimeout(timer.current); timer.current=setTimeout(saveNow,900);
  }
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return <div className="experiment">
    <header className="bar"><div><strong>Our Memory Garden</strong><span className="tag">LOCAL EXPERIMENT · SAMPLE CONTENT</span></div><div className="actions"><span role="status">{status}</span><button onClick={()=>{failure.current=!failure.current;setOffline(failure.current);if(!failure.current&&pending.current)setStatus('Ready to retry');}}>{offline?'Simulated connection: off':'Simulate save failure'}</button><button onClick={saveNow}>Retry save</button></div></header>
    {saveError && <p role="alert">{saveError}</p>}
    <div className="info"><span>Explore Puck using the block panel and canvas. Saving is simulated in this browser only.</span><span>Canvas: <button onClick={()=>setSize('Desktop')} aria-pressed={size==='Desktop'}>Desktop</button> <button onClick={()=>setSize('Mobile')} aria-pressed={size==='Mobile'}>Mobile</button></span></div>
    <Puck config={config} data={initial.current} onChange={changed} overrides={{header:()=>null}} height="calc(100vh - 120px)" viewports={[{width:1440,height:'auto',label:'Desktop'},{width:390,height:'auto',label:'Mobile'}]} iframe={{enabled:true}}>
      <div className="editor-layout"><aside className="blocks"><QuickControls/><h2>Drag blocks</h2><Puck.Components/><h2>Block settings</h2><Puck.Fields/></aside><section className={'canvas '+(size==='Mobile'?'mobile':'')} aria-label="Editing canvas"><Puck.Preview/></section></div>
    </Puck>
    <details className="data"><summary>Experiment data</summary><p>Sample content is kept only in this browser. This does not test Supabase, authentication, private pages or simultaneous edits.</p></details>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
