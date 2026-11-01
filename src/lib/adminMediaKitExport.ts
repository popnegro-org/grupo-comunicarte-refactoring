import pptxgen from 'pptxgenjs';
export interface ExportSupport {
  canonical_id: string;
  name: string;
  ciudad: string;
  tipo_soporte: string;
  address?: string;
  description?: string;
  characteristics?: string;
  approvedPriceWithTax?: number;
  imageUrl?: string;
  image_url?: string;
  imageUrls?: string[];
  media?: Array<{ url?: string; media_type?: string; active?: boolean }>;
}

export interface ExportLead { name: string; email: string; company?: string; phone?: string; }
const clean=(v?:string)=>(v||'').replace(/\r?\n/g,' ').trim();
const esc=(v?:string)=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const money=(v?:number)=>Number(v)>0?`ARS ${Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'';
const wrap=(v:string,max=54)=>{const out:string[]=[];let line='';for(const w of esc(v).split(/\s+/).filter(Boolean)){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w;}else line=n;}if(line)out.push(line);return out;};
const text=(l:string[],value:string,x:number,y:number,size:number,bold=false)=>l.push('BT',`/${bold?'F2':'F1'} ${size} Tf`,`${x} ${y} Td`,`(${esc(value)}) Tj`,'ET');
const box=(l:string[],x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>{l.push(`${fill} rg`,`${x} ${y} ${w} ${h} re f`);if(stroke)l.push(`${stroke} RG`,`${x} ${y} ${w} ${h} re S`);};
const imageUrl=(s:ExportSupport)=>{const m=(s.media||[]).find(x=>x.active!==false&&x.media_type!=='video'&&x.url);return m?.url||s.imageUrl||s.image_url||s.imageUrls?.find(Boolean)||'';};

type Raster={width:number;height:number;jpeg:Uint8Array;dataUri:string};
async function fetchRaster(url:string,maxWidth=1200):Promise<Raster|null>{
  if(!url||typeof window==='undefined')return null;
  try{const response=await fetch(url,{mode:'cors',credentials:'omit'});if(!response.ok)return null;const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);try{const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=objectUrl;});const scale=Math.min(1,maxWidth/Math.max(1,img.naturalWidth));const width=Math.max(1,Math.round(img.naturalWidth*scale));const height=Math.max(1,Math.round(img.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.drawImage(img,0,0,width,height);const dataUri=canvas.toDataURL('image/jpeg',0.86);const bin=atob(dataUri.split(',')[1]);const jpeg=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)jpeg[i]=bin.charCodeAt(i);return{width,height,jpeg,dataUri};}finally{URL.revokeObjectURL(objectUrl);}}
  catch{return null;}
}
async function resolveSupports(supports:ExportSupport[]):Promise<ExportSupport[]>{
  const missing=supports.some(s=>!imageUrl(s));if(!missing)return supports;
  try{const r=await fetch('/api/supports');const j=await r.json();if(!r.ok||j.status!=='success'||!Array.isArray(j.data))return supports;const byId=new Map<string, ExportSupport>(j.data.map((x:any):[string, ExportSupport]=>[String(x.canonical_id),x as ExportSupport]));return supports.map(s=>{const x=byId.get(String(s.canonical_id));if(!x)return s;return {...x,...s,imageUrls:Array.isArray(x.imageUrls)?x.imageUrls:s.imageUrls,media:Array.isArray(x.media)?x.media:s.media,imageUrl:x.imageUrl||s.imageUrl,image_url:x.image_url||s.image_url};});}catch{return supports;}
}
async function loadAssets(supports:ExportSupport[]){const resolved=await resolveSupports(supports);const logo=await fetchRaster('/brand/brand-dark.webp',900);const supportRasters=await Promise.all(resolved.map(s=>fetchRaster(imageUrl(s),900)));return{resolved,logo,supportRasters};}

type PdfObj={body:string;stream?:Uint8Array};
function buildPdf(objects:PdfObj[]){const enc=new TextEncoder();const chunks:Uint8Array[]=[];const offsets:number[]=[0];let total=0;const push=(s:string|Uint8Array)=>{const b=typeof s==='string'?enc.encode(s):s;chunks.push(b);total+=b.length;};push('%PDF-1.4\n');objects.forEach((obj,i)=>{offsets[i+1]=total;push(`${i+1} 0 obj\n${obj.body}\n`);if(obj.stream){push('stream\n');push(obj.stream);push('\nendstream\n');}push('endobj\n');});const xref=total;push(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);for(let i=1;i<=objects.length;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);const out=new Uint8Array(total);let p=0;chunks.forEach(c=>{out.set(c,p);p+=c.length;});return new Blob([out],{type:'application/pdf'});}

async function makePdf(lead:ExportLead,supports:ExportSupport[],requestId:string){
  const {resolved,logo,supportRasters}=await loadAssets(supports);const objects:PdfObj[]=[];objects.push({body:'<< /Type /Catalog /Pages 2 0 R >>'},{body:'PAGES'},{body:'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'},{body:'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'});
  const logoObj=logo?objects.push({body:`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.jpeg.length} >>`,stream:logo.jpeg})-1:-1;
  const imageObjs=supportRasters.map((r)=>{if(!r)return -1;return objects.push({body:`<< /Type /XObject /Subtype /Image /Width ${r.width} /Height ${r.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${r.jpeg.length} >>`,stream:r.jpeg})-1;});
  const pageRefs:number[]=[];const groups:ExportSupport[][]=[];for(let i=0;i<resolved.length;i+=2)groups.push(resolved.slice(i,i+2));if(!groups.length)groups.push([]);const total=resolved.reduce((a,s)=>a+(Number(s.approvedPriceWithTax)||0),0);
  groups.forEach((group,pi)=>{const lines:string[]=[];box(lines,0,0,595,842,'0.98 0.98 0.96');box(lines,0,792,595,50,'0.025 0.263 0.29');if(logoObj>=0)lines.push('q 150 0 0 30 40 802 cm /Logo Do Q');else text(lines,'GRUPO COMUNICARTE',40,815,16,true);text(lines,'MEDIA KIT',470,814,9,true);text(lines,`Solicitud ${requestId}`,40,770,9);text(lines,`Cliente: ${lead.name}`,40,750,11,true);if(lead.company)text(lines,`Empresa: ${lead.company}`,40,733,9);text(lines,`Soportes: ${resolved.length}`,440,750,9);
    const cardW=250,cardH=330,cardXs=[40,305],cardY=390;group.forEach((s,gi)=>{const x=cardXs[gi];box(lines,x,cardY,cardW,cardH,'1 1 1','0.86 0.88 0.87');box(lines,x,cardY+cardH-7,cardW,7,'0.03 0.75 0.54');const idx=pi*2+gi;const raster=supportRasters[idx];if(raster){const iw=228,ih=130,ratio=Math.min(iw/raster.width,ih/raster.height),dw=raster.width*ratio,dh=raster.height*ratio,ix=x+11+(iw-dw)/2,iy=cardY+cardH-152+(ih-dh)/2;lines.push(`q ${dw} 0 0 ${dh} ${ix} ${iy} cm /Im${idx+1} Do Q`);}else{box(lines,x+11,cardY+cardH-141,228,130,'0.94 0.96 0.95');text(lines,'FOTOGRAFIA NO DISPONIBLE',x+43,cardY+cardH-78,7,true);}text(lines,`${idx+1}. ${s.name}`,x+12,cardY+cardH-174,11,true);text(lines,`${s.ciudad} - ${s.tipo_soporte}`,x+12,cardY+cardH-192,8);if(s.approvedPriceWithTax)text(lines,money(s.approvedPriceWithTax),x+12,cardY+cardH-215,11,true);if(s.address)text(lines,`Direccion: ${s.address}`,x+12,cardY+cardH-234,7);let dy=cardY+74;wrap(`Descripcion: ${s.description||'Sin descripcion'}`,42).slice(0,3).forEach(v=>{text(lines,v,x+12,dy,7);dy-=10;});wrap(`Caracteristicas: ${s.characteristics||'Sin detalle'}`,42).slice(0,2).forEach(v=>{text(lines,v,x+12,dy,7);dy-=10;});});
    if(pi===groups.length-1){box(lines,40,45,515,68,'0.93 0.98 0.96');text(lines,'RESUMEN DE LA SOLICITUD',56,91,8,true);text(lines,`Soportes seleccionados: ${resolved.length}`,56,72,8);text(lines,total>0?`Inversion estimada: ${money(total)}`:'Inversion sujeta a cotizacion',315,72,9,true);}text(lines,`Grupo Comunicarte - Media Kit - Pagina ${pi+1}/${groups.length}`,40,23,7);
    const content=new TextEncoder().encode(lines.join('\n'));const contentObj=objects.push({body:`<< /Length ${content.length} >>`,stream:content})-1;const xobjects=[`/Font << /F1 3 0 R /F2 4 0 R >>`];if(logoObj>=0)xobjects.push(`/Logo ${logoObj+1} 0 R`);imageObjs.forEach((ref,idx)=>{if(ref>=0&&group.includes(resolved[idx]))xobjects.push(`/Im${idx+1} ${ref+1} 0 R`);});const pageObj=objects.push({body:`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << ${xobjects.join(' ')} >> /Contents ${contentObj+1} 0 R >>`})-1;pageRefs.push(pageObj+1);});objects[1]={body:`<< /Type /Pages /Kids [${pageRefs.map(r=>`${r} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`};return buildPdf(objects);
}

async function makePpt(lead:ExportLead,supports:ExportSupport[],requestId:string):Promise<Blob>{
  const {resolved,logo,supportRasters}=await loadAssets(supports);
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Grupo Comunicarte';
  pptx.company = 'Grupo Comunicarte';
  pptx.subject = `Media Kit ${requestId}`;
  pptx.title = `Media Kit ${requestId}`;
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };
  const teal='06434A', cream='FAF9F5', green='07BE8A', ink='172120', muted='53615F', white='FFFFFF';
  const logoData=logo?.dataUri;
  const addLogo=(slide:any,x:number,y:number,w:number)=>{if(logoData)slide.addImage({data:logoData,x,y,w,h:w*logo.height/logo.width});else slide.addText('GRUPO COMUNICARTE',{x,y,w,h:.3,fontFace:'Aptos',fontSize:15,bold:true,color:cream,margin:0});};
  const cover=pptx.addSlide(); cover.background={color:teal}; addLogo(cover,.72,.65,2.25); cover.addText('MEDIA KIT',{x:.72,y:2.35,w:7,h:.65,fontSize:34,bold:true,color:cream,margin:0}); cover.addText(`Solicitud ${requestId}`,{x:.72,y:3.12,w:5,h:.3,fontSize:14,color:'D9E7E4',margin:0}); cover.addText(lead.company?`${lead.name} · ${lead.company}`:lead.name,{x:.72,y:5.9,w:8,h:.35,fontSize:14,color:cream,margin:0});
  resolved.forEach((s,i)=>{const slide=pptx.addSlide();slide.background={color:cream};addLogo(slide,.55,.35,1.65);slide.addText(`Solicitud ${requestId} · ${i+1}/${resolved.length}`,{x:9.1,y:.43,w:3.6,h:.2,fontSize:8,color:muted,align:'right',margin:0});slide.addShape(pptx.ShapeType.roundRect,{x:.55,y:1.05,w:12.23,h:5.75,rectRadius:.08,fill:{color:white},line:{color:'DFE5E3',width:1}});slide.addShape(pptx.ShapeType.rect,{x:.55,y:1.05,w:12.23,h:.08,fill:{color:green},line:{color:green}});slide.addText(s.name,{x:.82,y:1.38,w:8.8,h:.45,fontSize:23,bold:true,color:ink,margin:0});slide.addText(`${s.ciudad} · ${s.tipo_soporte}`,{x:.82,y:1.88,w:7.5,h:.25,fontSize:10,color:muted,margin:0});if(s.approvedPriceWithTax)slide.addText(money(s.approvedPriceWithTax),{x:9.55,y:1.4,w:2.75,h:.4,fontSize:17,bold:true,color:teal,align:'right',margin:0});const raster=supportRasters[i];if(raster)slide.addImage({data:raster.dataUri,x:.82,y:2.3,w:11.65,h:2.65,sizing:{type:'contain',x:.82,y:2.3,w:11.65,h:2.65}});else{slide.addShape(pptx.ShapeType.rect,{x:.82,y:2.3,w:11.65,h:2.65,fill:{color:'EDF2F0'},line:{color:'EDF2F0'}});slide.addText('FOTOGRAFÍA NO DISPONIBLE',{x:4.2,y:3.45,w:4.5,h:.25,fontSize:10,bold:true,color:'60706D',align:'center',margin:0});}slide.addText(`Dirección: ${s.address||'No informada'}`,{x:.82,y:5.2,w:11.6,h:.25,fontSize:9,color:ink,margin:0});slide.addText(`Descripción: ${s.description||'Sin descripción'}`,{x:.82,y:5.58,w:11.6,h:.38,fontSize:9,color:ink,breakLine:false,fit:'shrink',margin:0});slide.addText(`Características: ${s.characteristics||'Sin detalle'}`,{x:.82,y:6.05,w:11.6,h:.38,fontSize:9,color:ink,fit:'shrink',margin:0});});
  const total=resolved.reduce((a,s)=>a+(Number(s.approvedPriceWithTax)||0),0);const summary=pptx.addSlide();summary.background={color:teal};addLogo(summary,.72,.65,2.25);summary.addText('RESUMEN COMERCIAL',{x:.72,y:2.0,w:5,h:.25,fontSize:10,bold:true,color:'B9D0CC',charSpacing:1.2,margin:0});summary.addText(`${resolved.length} soportes seleccionados`,{x:.72,y:2.48,w:10,h:.55,fontSize:28,bold:true,color:cream,margin:0});summary.addText(total>0?`Inversión estimada: ${money(total)}`:'Inversión sujeta a cotización',{x:.72,y:3.28,w:9,h:.35,fontSize:16,color:cream,margin:0});summary.addText('Disponibilidad sujeta a confirmación comercial.',{x:.72,y:6.45,w:9,h:.2,fontSize:8,color:'B9D0CC',margin:0});
  return await pptx.write({outputType:'blob'}) as Blob;
}
export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadMediaKitPdf(lead:ExportLead,supports:ExportSupport[],requestId:string){downloadBlob(await makePdf(lead,supports,requestId),`media-kit-${requestId}.pdf`);}
export async function downloadMediaKitPpt(lead:ExportLead,supports:ExportSupport[],requestId:string){downloadBlob(await makePpt(lead,supports,requestId),`media-kit-${requestId}.pptx`);}
export async function sendMediaKitToLead(lead:ExportLead,supports:ExportSupport[],requestId:string){const pdf=await makePdf(lead,supports,requestId),ppt=await makePpt(lead,supports,requestId);const files=[new File([pdf],`media-kit-${requestId}.pdf`,{type:'application/pdf'}),new File([ppt],`media-kit-${requestId}.pptx`,{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'})];if(navigator.share&&(!navigator.canShare||navigator.canShare({files}))){await navigator.share({title:`Media Kit ${requestId}`,text:`Media Kit aprobado para ${lead.name}.`,files});return'shared';}window.location.href=`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(`Media Kit ${requestId} - Grupo Comunicarte`)}&body=${encodeURIComponent(`Hola ${lead.name},\n\nAdjuntá el Media Kit aprobado (${requestId}).\n\nSaludos,\nGrupo Comunicarte`)}`;return'mailto';}
