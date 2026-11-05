/* A standalone collection card, drawn from a frozen showcase snapshot. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShowcaseExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 1600;
  const HEIGHT = 1320;
  const accents = {carbon:'#ff793f',aurora:'#b08bfa',ice:'#79c9f0',gold:'#e6c378'};

  function rounded(ctx,x,y,w,h,r,fill,stroke) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
  }
  function fit(ctx,text,x,y,maxWidth,size,color,weight=500) {
    let current=size;
    const value=String(text ?? '');
    while(current>14){ctx.font=`${weight} ${current}px "Barlow",Arial,sans-serif`;if(ctx.measureText(value).width<=maxWidth)break;current--;}
    let label=value;
    while(label.length&&ctx.measureText(label).width>maxWidth)label=label.slice(0,-1);
    if(label!==value)label=label.slice(0,-1)+'…';
    ctx.fillStyle=color;ctx.fillText(label,x,y);
  }
  function draw(canvas,model,images=new Map(),helpers={}) {
    canvas.width=WIDTH;canvas.height=HEIGHT;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Ta przeglądarka nie obsługuje zapisu obrazka.');
    const money=helpers.money || (cents=>'$'+(cents/100).toFixed(2));
    const name=helpers.itemName || (item=>item.displayName||item.name);
    const rarity=helpers.rarities||{};
    const accent=accents[model.theme]||accents.carbon;
    ctx.fillStyle='#0b0e15';ctx.fillRect(0,0,WIDTH,HEIGHT);
    const glow=ctx.createRadialGradient(1300,80,0,1300,80,980);
    glow.addColorStop(0,accent+'18');glow.addColorStop(1,'#0b0e1500');
    ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.strokeStyle='#ffffff04';ctx.lineWidth=1;
    for(let x=0;x<WIDTH;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
    for(let y=0;y<HEIGHT;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
    rounded(ctx,72,58,35,35,8,accent);
    fit(ctx,'S',82,83,20,24,'#10141b',800);
    fit(ctx,'SKINLAB / MOJA GABLOTA',123,84,1000,24,'#c2cad7',700);
    fit(ctx,model.title||'Moja kolekcja',72,166,1456,65,'#f3f4f7',700);
    fit(ctx,`${model.filled || 0} / ${(model.slots || []).length} miejsc · Wartość zestawu`,75,217,1100,23,'#8995a8');
    ctx.font='600 34px "Barlow",Arial,sans-serif';ctx.fillStyle=accent;
    const total=money(model.totalValue||0);
    ctx.fillText(total,WIDTH-72-ctx.measureText(total).width,217);
    const slots=(model.slots||[]).slice(0,9);
    const cardW=472,cardH=288,gap=20,top=260;
    for(let i=0;i<slots.length;i++){
      const slot=slots[i],item=slot.item;
      const x=72+(i%3)*(cardW+gap),y=top+Math.floor(i/3)*(cardH+gap);
      const color=item?(rarity[item.rarity]?.color||accent):'#343f51';
      rounded(ctx,x,y,cardW,cardH,12,'#151b26','#2b3443');
      fit(ctx,String(slot.label||slot.id).toUpperCase(),x+20,y+30,cardW-40,16,'#8592a6',600);
      if(item){
        const img=images instanceof Map?images.get(item.id):images[item.id];
        if(img){
          const iw=img.naturalWidth||img.width||256,ih=img.naturalHeight||img.height||192;
          const scale=Math.min((cardW-70)/iw,135/ih);
          ctx.drawImage(img,x+(cardW-iw*scale)/2,y+44+(135-ih*scale)/2,iw*scale,ih*scale);
        }else{
          fit(ctx,item.weapon.replace('★ ',''),x+24,y+118,cardW-48,36,'#55657f',700);
        }
        fit(ctx,(item.stattrak?'StatTrak™ ':item.souvenir?'Souvenir ':'')+item.weapon,x+20,y+199,cardW-40,17,'#8d9aae');
        fit(ctx,name(item),x+20,y+232,cardW-40,26,'#edf0f6',600);
        const wear=item.noWear?'Bez zużycia':`${item.wearCode} · ${Number(item.float).toFixed(6)}${Number.isInteger(item.paintSeed)?` · #${item.paintSeed}`:''}`;
        fit(ctx,wear,x+20,y+264,cardW-165,17,'#8390a4');
        const price=money(item.value);ctx.font='600 22px "Barlow",Arial,sans-serif';ctx.fillStyle='#b6d8c6';
        ctx.fillText(price,x+cardW-20-ctx.measureText(price).width,y+264);
      }else{
        ctx.strokeStyle='#344154';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x+cardW/2-15,y+130);ctx.lineTo(x+cardW/2+15,y+130);ctx.moveTo(x+cardW/2,y+115);ctx.lineTo(x+cardW/2,y+145);ctx.stroke();
        fit(ctx,'Miejsce na kolejny drop',x+105,y+211,cardW-130,22,'#53627a');
      }
      rounded(ctx,x+15,y+cardH-3,cardW-30,3,1,color);
    }
    fit(ctx,'Twoja kolekcja. Twoja historia.',72,1247,1100,25,'#7d899b');
    fit(ctx,'Fanowski symulator CS2 · Wirtualne przedmioty',72,1281,1200,17,'#536075');
    return canvas;
  }

  function loadImage(path) {
    return new Promise(resolve=>{
      const img=new Image();let finished=false;
      const settle=value=>{if(finished)return;finished=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(value);};
      const timer=setTimeout(()=>settle(null),8000);
      img.onload=()=>settle(img);img.onerror=()=>settle(null);
      img.src=path;
    });
  }
  async function download(helpers,showcase) {
    const model=JSON.parse(JSON.stringify(showcase));
    const slots=model.slots||[];
    if(!slots.some(slot=>slot.item))throw new Error('Wybierz przynajmniej jeden skin do swojej gabloty.');
    const images=new Map();
    const loaded=await Promise.all(slots.filter(slot=>slot.item).map(async slot=>{
      const image=await loadImage(helpers.skinImage(slot.item));
      if(image)images.set(slot.item.id,image);
      return Boolean(image);
    }));
    const canvas=document.createElement('canvas');
    draw(canvas,model,images,helpers);
    let blob;
    try {
      blob=await new Promise((resolve,reject)=>{
        try{canvas.toBlob(value=>value?resolve(value):reject(new Error('Nie udało się utworzyć obrazka.')),'image/png');}
        catch(error){reject(error);}
      });
    }catch(error){
      if(error?.name==='SecurityError')throw new Error('Zapis obrazka z grafikami wymaga uruchomienia gry przez lokalny serwer. Instrukcję znajdziesz w README.');
      throw error;
    }
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download='SKINLAB-gablota.png';anchor.hidden=true;
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return {ok:true,missingImages:loaded.filter(value=>!value).length,width:WIDTH,height:HEIGHT};
  }
  return Object.freeze({draw,download,WIDTH,HEIGHT});
});
