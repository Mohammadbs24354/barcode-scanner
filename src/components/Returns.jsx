import {useEffect,useState} from 'react';
import {createReturn,store} from '../services/storage';
import './Returns.css';

const labels={customer_return:'Kundenretoure',supplier_return:'Rückgabe an Lieferant'};
const conditions={resellable:'Wiederverkaufbar',damaged:'Beschädigt',quarantine:'Quarantäne'};
const dateTime=value=>new Date(value).toLocaleString('de-DE');

export default function Returns({onRefresh}){
 const [products,setProducts]=useState([]),[warehouses,setWarehouses]=useState([]),[records,setRecords]=useState([]);
 const [form,setForm]=useState({type:'customer_return',productId:'',quantity:1,warehouseId:'',reason:'',condition:'resellable',reference:'',notes:''});
 const [notice,setNotice]=useState('');
 const refresh=async()=>{const [p,w,r]=await Promise.all([store.all('products'),store.all('warehouses'),store.all('returns')]);setProducts(p.sort((a,b)=>a.name.localeCompare(b.name)));setWarehouses(w);setRecords(r.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setForm(v=>({...v,productId:v.productId||p[0]?.id||'',warehouseId:v.warehouseId||w[0]?.id||''}))};
 useEffect(()=>{let active=true;Promise.all([store.all('products'),store.all('warehouses'),store.all('returns')]).then(([p,w,r])=>{if(!active)return;setProducts(p.sort((a,b)=>a.name.localeCompare(b.name)));setWarehouses(w);setRecords(r.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setForm(v=>({...v,productId:v.productId||p[0]?.id||'',warehouseId:v.warehouseId||w[0]?.id||''}))});return()=>{active=false}},[]);
 const submit=async e=>{e.preventDefault();try{const result=await createReturn(form);await refresh();await onRefresh?.();setNotice(result.stockImpact==='none'?'Retoure erfasst. Der Artikel wurde nicht dem verfügbaren Bestand hinzugefügt.':'Retoure gebucht und Lagerbestand aktualisiert.');setForm(v=>({...v,quantity:1,reason:'',reference:'',notes:''}))}catch(err){const messages={INSUFFICIENT_STOCK:'Nicht genügend verfügbarer Bestand im ausgewählten Lager.',INVALID_RETURN_QUANTITY:'Bitte eine positive ganze Menge eingeben.',INVALID_RETURN_CONDITION:'Bitte einen gültigen Produktzustand auswählen.',INVALID_RETURN:'Bitte alle Pflichtfelder ausfüllen.'};setNotice(messages[err.message]||'Retoure konnte nicht gebucht werden. Bitte Eingaben prüfen.')}};
 return <div className="returns-page">
  <div className="sf-heading"><div><label>WARENRÜCKFLUSS</label><h1>Retourenmanagement</h1><p>Kundenretouren und Rückgaben an Lieferanten erfassen und nachvollziehen.</p></div></div>
  {notice&&<div className="notice" role="status">{notice}</div>}
  <section className="panel returns-card"><h2>Retoure erfassen</h2><form onSubmit={submit}>
   <div className="returns-grid">
    <label>Retourenart *<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="customer_return">Kundenretoure</option><option value="supplier_return">Rückgabe an Lieferant</option></select></label>
    <label>Produkt *<select required value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">Produkt auswählen</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.barcode||p.sku||'ohne Artikelnummer'}</option>)}</select></label>
    <label>Menge *<input required type="number" min="1" step="1" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
    <label>Wareneingang / Lager *<select required value={form.warehouseId} onChange={e=>setForm({...form,warehouseId:e.target.value})}><option value="">Lager auswählen</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    <label>Produktzustand *<select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}>{Object.entries(conditions).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
    <label>Rücksendegrund *<input required maxLength="160" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="z. B. Defekt, falscher Artikel"/></label>
    <label>Referenz / Bestellnummer<input maxLength="100" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} placeholder="Optional"/></label>
    <label className="returns-wide">Notizen<textarea rows="2" maxLength="1000" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   </div>
   <div className="returns-hint">{form.type==='customer_return'?(form.condition==='resellable'?'Wiederverkaufbare Kundenretouren werden dem verfügbaren Lagerbestand hinzugefügt.': 'Beschädigte oder quarantänisierte Kundenretouren werden dokumentiert, aber nicht dem verfügbaren Bestand hinzugefügt.'):'Bei einer Lieferantenrückgabe wird die Menge vom ausgewählten Lagerbestand abgezogen. Der verfügbare Bestand muss ausreichen.'}</div>
   <div className="returns-actions"><button className="primary" disabled={!products.length||!warehouses.length}>Retoure buchen</button></div>
  </form></section>
  <section className="panel returns-card"><h2>Retourenprotokoll <small>{records.length}</small></h2><div className="tablewrap"><table><thead><tr><th>Datum</th><th>Art</th><th>Produkt</th><th>Menge</th><th>Zustand</th><th>Grund</th><th>Lagerwirkung</th><th>Referenz</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{dateTime(r.createdAt)}</td><td>{labels[r.type]||r.type}</td><td><strong>{r.productName}</strong><small>{r.barcode}</small></td><td>{r.quantity}</td><td>{conditions[r.condition]||r.condition}</td><td>{r.reason}</td><td><span className={'pill '+(r.stockImpact==='none'?'low':'ok')}>{r.stockImpact==='in'?'Bestand +':r.stockImpact==='out'?'Bestand −':'Gesperrt / kein Zugang'}</span></td><td>{r.reference||'—'}</td></tr>)}</tbody></table>{!records.length&&<div className="empty">Noch keine Retouren erfasst.</div>}</div></section>
 </div>
}
