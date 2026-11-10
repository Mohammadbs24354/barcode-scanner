import { useMemo, useState } from 'react';
import './PrintTools.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = n => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n||0));
const code39 = {
 '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw',
 '5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
 '-':'nwnnnnwnw','.':'wnnnnwnnw',' ':'nwnnwnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn',
 '+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn'
};
function barcodeSvg(value) {
 const text = `*${String(value||'').toUpperCase().replace(/[^0-9A-Z .$/+%-]/g,'')}*`;
 let x=4, bars='';
 for (const char of text) {
  const pattern=code39[char]||code39['-'];
  for(let i=0;i<pattern.length;i++) {
   const width=pattern[i]==='w'?3:1;
   if(i%2===0) bars+=`<rect x="${x}" y="2" width="${width}" height="42" fill="#111"/>`;
   x+=width;
  }
  x+=1;
 }
 return `<svg viewBox="0 0 ${x+4} 48" role="img" aria-label="Barcode ${esc(value)}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}
function openPrint(title, body, extra='') {
 const win=window.open('','_blank','width=900,height=700');
 if(!win) { window.alert('Bitte Pop-ups für StockFlow erlauben, um zu drucken.'); return; }
 win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
 *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#172033;margin:24px}h1{font-size:22px;margin:0 0 8px}h2{font-size:16px}p{color:#475467}.muted{color:#667085;font-size:11px}
 table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:left;padding:8px;border-bottom:1px solid #ddd;font-size:12px}th{background:#f2f4f7}
 .labels{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}.label{border:1px solid #bbb;padding:7mm;min-height:38mm;break-inside:avoid}.label b{display:block;margin-bottom:5px}.label svg{width:100%;height:48px}.label small{display:block;text-align:center;letter-spacing:2px}
 .meta{display:flex;gap:28px;margin:16px 0}.total{text-align:right;font-weight:bold;margin-top:20px}
 @page{size:auto;margin:12mm}@media print{body{margin:0}.no-print{display:none!important}}
 ${extra}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
 win.document.close();
}
function excelXml(sheets) {
 const cell = value => {
  const type=typeof value==='number'&&Number.isFinite(value)?'Number':'String';
  return `<Cell><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
 };
 const rows = sheet => [sheet.headers,...sheet.rows].map(row=>`<Row>${row.map(cell).join('')}</Row>`).join('');
 return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets.map(s=>`<Worksheet ss:Name="${esc(s.name)}"><Table>${rows(s)}</Table></Worksheet>`).join('')}</Workbook>`;
}
function download(name, content, type) {
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function PrintTools({products=[],moves=[],orders=[],suppliers=[],warehouses=[]}) {
 const [selected,setSelected]=useState([]);
 const [orderId,setOrderId]=useState('');
 const chosen=useMemo(()=>products.filter(p=>selected.includes(p.id)),[products,selected]);
 const toggle=id=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const printLabels=()=>{
  if(!chosen.length)return;
  const cards=chosen.flatMap(p=>Array.from({length:Math.min(20,Math.max(1,Number(p.labelCopies)||1))},()=>`<article class="label"><b>${esc(p.name)}</b>${barcodeSvg(p.barcode||p.sku||p.id)}<small>${esc(p.barcode||p.sku||'')}</small><p class="muted">${esc(p.sku||'')} · ${esc(p.category||'')}</p></article>`)).join('');
  openPrint('StockFlow – Barcode-Etiketten',`<h1>Barcode-Etiketten</h1><p class="muted">Code 39 · Für selbstklebende Etiketten oder A4-Bögen</p><div class="labels">${cards}</div>`);
 };
 const printOrder=()=>{
  const o=orders.find(x=>x.id===orderId);if(!o)return;
  const supplier=suppliers.find(s=>s.id===o.supplierId),warehouse=warehouses.find(w=>w.id===o.warehouseId);
  const rows=o.lines.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.productName)}</td><td>${esc(l.barcode)}</td><td>${Number(l.quantity)}</td><td>${money(l.unitCost)}</td><td>${money(Number(l.quantity)*Number(l.unitCost))}</td></tr>`).join('');
  const total=o.lines.reduce((sum,l)=>sum+Number(l.quantity)*Number(l.unitCost),0);
  openPrint(`Bestellung ${o.number}`,`<h1>Bestellung ${esc(o.number)}</h1><div class="meta"><div><b>Lieferant</b><br>${esc(supplier?.name||'Unbekannt')}<br>${esc(supplier?.address||'')}<br>${esc(supplier?.email||'')}</div><div><b>Lieferadresse</b><br>${esc(warehouse?.name||'')}</div><div><b>Datum</b><br>${new Date(o.createdAt).toLocaleDateString('de-DE')}</div></div><table><thead><tr><th>#</th><th>Artikel</th><th>Barcode</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Gesamtbetrag: ${money(total)}</p><p>${esc(o.note||'')}</p><p class="muted">Erstellt mit StockFlow · Lokale Browser-Anwendung</p>`);
 };
 const printReport=()=>{
  const rows=products.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.barcode)}</td><td>${esc(p.category)}</td><td>${Number(p.stock||0)}</td><td>${Number(p.minStock||0)}</td><td>${money(Number(p.stock||0)*Number(p.cost||0))}</td></tr>`).join('');
  const total=products.reduce((sum,p)=>sum+Number(p.stock||0)*Number(p.cost||0),0);
  openPrint('StockFlow – Inventarbericht',`<h1>Inventarbericht</h1><p>Erstellt am ${new Date().toLocaleString('de-DE')}</p><p>${products.length} Artikel · ${moves.length} Bewegungen · Lagerwert ${money(total)}</p><table><thead><tr><th>Produkt</th><th>Barcode</th><th>Kategorie</th><th>Bestand</th><th>Mindestbestand</th><th>Lagerwert</th></tr></thead><tbody>${rows}</tbody></table>`);
 };
 const exportExcel=()=>{
  const sheets=[
   {name:'Produkte',headers:['Name','Barcode','SKU','Kategorie','Bestand','Mindestbestand','Einkaufspreis','Verkaufspreis','Lagerwert'],rows:products.map(p=>[p.name,p.barcode||'',p.sku||'',p.category||'',Number(p.stock||0),Number(p.minStock||0),Number(p.cost||0),Number(p.price||0),Number(p.stock||0)*Number(p.cost||0)])},
   {name:'Bewegungen',headers:['Datum','Produkt','Typ','Menge','Vorher','Nachher','Notiz'],rows:moves.map(m=>[m.createdAt,m.productName,m.type,Number(m.quantity),Number(m.before),Number(m.after),m.note||''])},
   {name:'Bestellungen',headers:['Nummer','Lieferant','Datum','Status','Artikel','Gesamt'],rows:orders.map(o=>[o.number,suppliers.find(s=>s.id===o.supplierId)?.name||'',o.createdAt,o.status,o.lines.length,o.lines.reduce((s,l)=>s+Number(l.quantity)*Number(l.unitCost),0)])}
  ];
  download('stockflow-export.xls',excelXml(sheets),'application/vnd.ms-excel;charset=utf-8');
 };
 return <section className="panel print-tools"><div className="print-tools-head"><div><h2>Drucken & Berichte</h2><p>Etiketten, Bestellungen und Inventarberichte erstellen.</p></div><button className="outline" onClick={exportExcel}>↓ Excel Export (.xls)</button></div>
  <div className="print-grid"><div><h3>Barcode-Etiketten</h3><p>Produkte auswählen und Etiketten drucken.</p><div className="print-product-list">{products.slice(0,100).map(p=><label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/><span>{p.name}<small>{p.barcode||p.sku||'Kein Barcode'}</small></span></label>)}</div><button className="primary" disabled={!chosen.length} onClick={printLabels}>Etiketten drucken ({chosen.length})</button></div>
   <div><h3>Bestellung als PDF</h3><p>Bestellung auswählen und über den Druckdialog als PDF speichern.</p><select value={orderId} onChange={e=>setOrderId(e.target.value)}><option value="">Bestellung auswählen</option>{orders.map(o=><option key={o.id} value={o.id}>{o.number}</option>)}</select><button className="primary" disabled={!orderId} onClick={printOrder}>Bestellung drucken / PDF</button><hr/><h3>Inventarbericht als PDF</h3><p>Aktuellen Produktbestand und Lagerwert exportieren.</p><button className="outline" onClick={printReport}>Inventarbericht drucken / PDF</button></div>
  </div>
 </section>;
}
