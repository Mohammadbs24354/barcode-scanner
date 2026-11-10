import {useEffect,useMemo,useState} from 'react';
import {assignProductStorageLocation,createStorageLocation,deleteStorageLocation,store,updateStorageLocation} from '../services/storage';
import './StorageLocations.css';

const blank={warehouseId:'',code:'',name:'',zone:'',aisle:'',rack:'',shelf:'',bin:'',capacity:'',description:''};
export default function StorageLocations({onRefresh}){
 const [warehouses,setWarehouses]=useState([]),[products,setProducts]=useState([]),[locations,setLocations]=useState([]),[form,setForm]=useState(blank),[editing,setEditing]=useState(null),[assignment,setAssignment]=useState({productId:'',warehouseId:'',locationId:''}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{const [w,p,l]=await Promise.all([store.all('warehouses'),store.all('products'),store.all('storageLocations')]);setWarehouses(w);setProducts(p.sort((a,b)=>a.name.localeCompare(b.name)));setLocations(l.sort((a,b)=>a.code.localeCompare(b.code)));setForm(v=>({...v,warehouseId:w.some(x=>x.id===v.warehouseId)?v.warehouseId:w[0]?.id||''}));setAssignment(v=>({...v,productId:p.some(x=>x.id===v.productId)?v.productId:p[0]?.id||'',warehouseId:w.some(x=>x.id===v.warehouseId)?v.warehouseId:w[0]?.id||''}))};
 useEffect(()=>{let live=true;Promise.all([store.all('warehouses'),store.all('products'),store.all('storageLocations')]).then(([w,p,l])=>{if(!live)return;setWarehouses(w);setProducts(p.sort((a,b)=>a.name.localeCompare(b.name)));setLocations(l.sort((a,b)=>a.code.localeCompare(b.code)));setForm(v=>({...v,warehouseId:v.warehouseId||w[0]?.id||''}));setAssignment({productId:p[0]?.id||'',warehouseId:w[0]?.id||'',locationId:''})}).catch(()=>setNotice('Lagerplätze konnten nicht geladen werden.'));return()=>{live=false}},[]);
 const tell=value=>{setNotice(value);setTimeout(()=>setNotice(''),5000)};
 const options=useMemo(()=>locations.filter(l=>l.warehouseId===assignment.warehouseId),[locations,assignment.warehouseId]);
 const submit=async e=>{e.preventDefault();setBusy(true);try{if(editing)await updateStorageLocation(editing,form);else await createStorageLocation(form);await load();await onRefresh?.();setEditing(null);setForm(v=>({...blank,warehouseId:v.warehouseId}));tell(editing?'Lagerplatz aktualisiert.':'Lagerplatz angelegt.')}catch(err){const map={INVALID_STORAGE_LOCATION:'Bitte Lager und Lagerplatz-Code angeben.',INVALID_STORAGE_CAPACITY:'Kapazität muss eine positive ganze Zahl sein.',STORAGE_LOCATION_EXISTS:'Dieser Code existiert bereits in diesem Lager.',WAREHOUSE_NOT_FOUND:'Das ausgewählte Lager wurde nicht gefunden.',STORAGE_LOCATION_WAREHOUSE_IMMUTABLE:'Ein Lagerplatz kann nicht in ein anderes Lager verschoben werden.'};tell(map[err.message]||'Lagerplatz konnte nicht gespeichert werden.')}finally{setBusy(false)}};
 const edit=l=>{setEditing(l.id);setForm({warehouseId:l.warehouseId,code:l.code,name:l.name||'',zone:l.zone||'',aisle:l.aisle||'',rack:l.rack||'',shelf:l.shelf||'',bin:l.bin||'',capacity:l.capacity??'',description:l.description||''});window.scrollTo({top:0,behavior:'smooth'})};
 const remove=async l=>{if(!window.confirm('Lagerplatz '+l.code+' wirklich löschen?'))return;try{await deleteStorageLocation(l.id);await load();await onRefresh?.();tell('Lagerplatz gelöscht.')}catch(err){tell(err.message==='STORAGE_LOCATION_IN_USE'?'Dieser Lagerplatz ist noch Produkten zugeordnet. Bitte zuerst die Produktzuordnung entfernen.':'Lagerplatz konnte nicht gelöscht werden.')}};
 const assign=async e=>{e.preventDefault();setBusy(true);try{await assignProductStorageLocation(assignment.productId,assignment.warehouseId,assignment.locationId);await load();await onRefresh?.();tell('Produkt-Lagerplatz-Zuordnung gespeichert.')}catch{tell('Zuordnung konnte nicht gespeichert werden.')}finally{setBusy(false)}};
 const locName=id=>locations.find(l=>l.id===id)?.code||'Nicht zugeordnet';
 const position=l=>[l.zone&&'Zone '+l.zone,l.aisle&&'Gang '+l.aisle,l.rack&&'Regal '+l.rack,l.shelf&&'Fach '+l.shelf,l.bin&&'Box '+l.bin].filter(Boolean).join(' · ')||'—';
 return <div className="storage-locations">
  <div className="sf-heading"><div><label>LAGERSTRUKTUR</label><h1>Lagerplätze</h1><p>Ordne Produkte konkreten Zonen, Gängen, Regalen und Fächern zu.</p></div></div>
  {notice&&<div className="notice" role="status">{notice}</div>}
  <section className="panel sl-panel"><h2>{editing?'Lagerplatz bearbeiten':'Neuen Lagerplatz anlegen'}</h2><form onSubmit={submit}>
   <div className="sl-grid">
    <label>Lager<select required value={form.warehouseId} onChange={e=>setForm({...form,warehouseId:e.target.value})}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    <label>Platz-Code *<input required maxLength="40" placeholder="z. B. A-01-02" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/></label>
    <label>Bezeichnung<input placeholder="z. B. Kleinteile-Regal" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Zone<input placeholder="A" value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})}/></label>
    <label>Gang<input placeholder="01" value={form.aisle} onChange={e=>setForm({...form,aisle:e.target.value})}/></label>
    <label>Regal<input placeholder="02" value={form.rack} onChange={e=>setForm({...form,rack:e.target.value})}/></label>
    <label>Fach<input placeholder="03" value={form.shelf} onChange={e=>setForm({...form,shelf:e.target.value})}/></label>
    <label>Behälter / Box<input placeholder="B1" value={form.bin} onChange={e=>setForm({...form,bin:e.target.value})}/></label>
    <label>Kapazität (Einheiten)<input type="number" min="1" step="1" placeholder="Optional" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
   </div>
   <label className="sl-wide">Beschreibung<textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
   <div className="sl-actions">{editing&&<button type="button" className="outline" onClick={()=>{setEditing(null);setForm(blank)}}>Abbrechen</button>}<button className="primary" disabled={busy||!warehouses.length}>{editing?'Änderungen speichern':'＋ Lagerplatz anlegen'}</button></div>
  </form></section>
  <section className="panel sl-panel"><div className="sl-title"><div><h2>Produkt einem Lagerplatz zuordnen</h2><p>Die Zuordnung ändert keine Bestandsmenge und erzeugt keine Lagerbewegung.</p></div></div>
   <form className="sl-assign" onSubmit={assign}>
    <label>Produkt<select required value={assignment.productId} onChange={e=>setAssignment({...assignment,productId:e.target.value})}>{products.map(p=><option key={p.id} value={p.id}>{p.name} {p.sku?'· '+p.sku:''}</option>)}</select></label>
    <label>Lager<select required value={assignment.warehouseId} onChange={e=>setAssignment({...assignment,warehouseId:e.target.value,locationId:''})}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
    <label>Lagerplatz<select value={assignment.locationId} onChange={e=>setAssignment({...assignment,locationId:e.target.value})}><option value="">Nicht zugeordnet</option>{options.map(l=><option key={l.id} value={l.id}>{l.code} · {l.name||position(l)}</option>)}</select></label>
    <button className="primary" disabled={busy||!products.length||!warehouses.length}>Zuordnung speichern</button>
   </form>
  </section>
  <section className="panel sl-panel"><div className="sl-title"><div><h2>Alle Lagerplätze <small>{locations.length}</small></h2><p>Platzstruktur und zugeordnete Produkte.</p></div></div>
   <div className="tablewrap"><table><thead><tr><th>Code</th><th>Lager</th><th>Struktur</th><th>Kapazität</th><th>Produkte</th><th>Aktion</th></tr></thead><tbody>{locations.map(l=>{const assigned=products.filter(p=>p.storageLocationByWarehouse?.[l.warehouseId]===l.id);return <tr key={l.id}><td><strong>{l.code}</strong><small>{l.name||'—'}</small></td><td>{warehouses.find(w=>w.id===l.warehouseId)?.name||'—'}</td><td>{position(l)}</td><td>{l.capacity??'—'}</td><td>{assigned.length}{assigned.length>0&&<small>{assigned.slice(0,2).map(p=>p.name).join(', ')}{assigned.length>2?' …':''}</small>}</td><td><div className="rowbuttons"><button title="Bearbeiten" onClick={()=>edit(l)}>✎</button><button title="Löschen" onClick={()=>remove(l)}>×</button></div></td></tr>})}</tbody></table>{!locations.length&&<div className="empty">Noch keine Lagerplätze angelegt.</div>}</div>
  </section>
  <section className="panel sl-panel"><div className="sl-title"><div><h2>Produktübersicht nach Lagerplatz</h2><p>Bestehende Zuordnungen pro Lager und Artikel.</p></div></div>
   <div className="tablewrap"><table><thead><tr><th>Produkt</th><th>Artikelnummer</th><th>Lager</th><th>Lagerplatz</th><th>Physischer Bestand</th></tr></thead><tbody>{products.filter(p=>Object.keys(p.storageLocationByWarehouse||{}).length).map(p=>Object.entries(p.storageLocationByWarehouse).map(([wid,lid])=><tr key={p.id+'-'+wid}><td><strong>{p.name}</strong></td><td>{p.sku||p.barcode||'—'}</td><td>{warehouses.find(w=>w.id===wid)?.name||'—'}</td><td>{locName(lid)}</td><td>{Number(p.stockByWarehouse?.[wid]||0)}</td></tr>))}</tbody></table>{!products.some(p=>Object.keys(p.storageLocationByWarehouse||{}).length)&&<div className="empty">Noch keine Produktzuordnungen vorhanden.</div>}</div>
  </section>
 </div>
}
