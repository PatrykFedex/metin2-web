/* Metin2 2D — browser beta (Canvas)
 * - 40x20 tiles map, NPCs/shops, inventory/equipment, combat, loot, EXP/leveling, portals
 * - Quests chain to boss; minimap overlay (M); slower movement; localStorage save
 * No external assets, everything drawn in code.
 */

(() => {
  const TILE = 32;
  const VIEW_W = 40, VIEW_H = 20;
  const SCREEN_W = VIEW_W*TILE, SCREEN_H = VIEW_H*TILE + 120;
  const MOVE_COOLDOWN = 160; // ms

  /*** Data ***/
  const MAPS = {
    miasto: [
      "########################################",
      "#TTTT....N...............TTTT..E.......#",
      "#T..T..........................TTTT....#",
      "#T..T.............#####...............N#",
      "#TTTT.....N.......#...#................#",
      "#.................#...#..TTTT..........#",
      "#....TTTT.........#...#..T..T..........#",
      "#....T..T.........#...#..T..T..........#",
      "#....TTTT.........#####..TTTT...........#",
      "#......................................#",
      "#..............Fontanna(~).............#",
      "#....................N.................#",
      "#......................................#",
      "#E.....................................#",
      "########################################",
    ],
    pole: [
      "########################################",
      "#..mmmm....m....m..............N.......#",
      "#.....m..................######........#",
      "#..............m........#....E#........#",
      "#..####..................######....m...#",
      "#..#..#.................................#",
      "#..#..#.........m.......................#",
      "#..#..#..............................m..#",
      "#..####...............m.................#",
      "#.......................................#",
      "#..............las......................#",
      "#......................N................#",
      "#.......................................#",
      "#E...............E......................#",
      "########################################",
    ],
    lochy: [
      "########################################",
      "#...........####.................N.....#",
      "#.m.......m.#..#..............#####....#",
      "#...........#..#...m..........#...#....#",
      "#..####.....#..#..............#E..#....#",
      "#..#..#.....#..#..............#...#....#",
      "#..#..#.....####..............#####....#",
      "#..#..#...............................m#",
      "#..####..............m.................#",
      "#......................................#",
      "#.............ciemne lochy.............#",
      "#...........................N..........#",
      "#......................................#",
      "#E......................................#",
      "########################################",
    ],
    pustynia: [
      "########################################",
      "#.............m.....m....N.............#",
      "#...m......####..............m.........#",
      "#.........#....#.............#####.....#",
      "#...m.....#....#....m........#...#.....#",
      "#.........#E...#.............#...#.....#",
      "#.........#....#.............#...#.....#",
      "#....m....#######.......m....#####.....#",
      "#......................................#",
      "#.............wydmy....................#",
      "#.............oaza(~)..................#",
      "#.........................N...........m#",
      "#......................................#",
      "#E......................................#",
      "########################################",
    ],
  };

  const PORTALS = {
    miasto: [["pole",[2,13]]],
    pole:   [["miasto",[2,13]], ["lochy",[32,4]], ["pustynia",[16,5]]],
    lochy:  [["pole",[2,13]]],
    pustynia: [["pole",[2,13]]],
  };

  const NPCS = {
    miasto: { "8,1":["healer","shop"], "20,4":["armorer","shop"], "38,3":["blacksmith","shop"], "20,11":["guide","info"] },
    pole:   { "30,1":["hunter","info"], "22,11":["herbalist","shop"] },
    lochy:  { "30,1":["shade","info"], "28,11":["dealer","shop"] },
    pustynia: { "15,1":["nomad","info"], "27,11":["trader","shop"] },
  };

  const ITEMS = {
    wood_sword: {id:"wood_sword", name:"Drewniany Miecz", type:"weapon", atk:3, price:40},
    iron_sword: {id:"iron_sword", name:"Żelazny Miecz", type:"weapon", atk:9, price:140},
    scimitar:   {id:"scimitar", name:"Bułat Pustyni", type:"weapon", atk:14, price:300},
    leather:    {id:"leather", name:"Skórzana Zbroja", type:"armor", defense:5, price:120},
    ring:       {id:"ring", name:"Pierścień Zdrowia", type:"accessory", hp:20, price:90},
    hp_small:   {id:"hp_small", name:"Mikstura HP (mała)", type:"potion", hp:40, price:20},
    hp_big:     {id:"hp_big", name:"Mikstura HP (duża)", type:"potion", hp:120, price:70},
    dkey:       {id:"dkey", name:"Klucz do Lochu", type:"key", price:50},
  };

  const SHOPS = {
    blacksmith: ["wood_sword","iron_sword","dkey"],
    armorer: ["leather","ring"],
    healer: ["hp_small","hp_big"],
    herbalist: ["hp_small"],
    dealer: ["hp_big","ring"],
    trader: ["hp_big","scimitar","ring"],
  };

  const MOBS = {
    miasto: [],
    pole: [
      {name:"Wilk", hp:30, atk:8, def:1, exp:20, gold:[5,15], drops:[["hp_small",0.25]]},
      {name:"Mały Metin", hp:90, atk:14, def:4, exp:60, gold:[20,40], drops:[["iron_sword",0.08],["ring",0.12]], kind:"metin"},
      {name:"Dziki Dzik", hp:50, atk:10, def:2, exp:30, gold:[8,18], drops:[["hp_small",0.15]]},
    ],
    lochy: [
      {name:"Ork", hp:130, atk:18, def:6, exp:120, gold:[40,80], drops:[["leather",0.12],["hp_big",0.3]]},
      {name:"Władca Lochu", hp:260, atk:30, def:10, exp:380, gold:[150,260], drops:[["ring",0.18]]},
    ],
    pustynia: [
      {name:"Skorpion", hp:70, atk:14, def:4, exp:70, gold:[12,26], drops:[["hp_small",0.2]]},
      {name:"Bandzior Pustyni", hp:110, atk:20, def:7, exp:130, gold:[30,70], drops:[["scimitar",0.1],["hp_big",0.25]]},
    ],
  };

  /*** State ***/
  const state = {
    name: "Bohater",
    level: 1,
    exp: 0,
    gold: 120,
    base: {atk:5, def:2, hp:100},
    hp: 100,
    loc: "miasto",
    x: 2, y: 13,
    equipment: { weapon:null, armor:null, accessory:null },
    inventory: ["wood_sword","leather","hp_small","hp_small"],
    quests: {},    // id -> data
    moveTimer: 0,
    msg: "Witaj! Użyj WASD/Strzałek, E/Enter interakcja, I ekwipunek, M mapa.",
    bigmap: false,
  };

  /*** Utils ***/
  const levelThreshold = lv => 50*lv + (lv-1)*30;
  const maxhp = () => state.base.hp + (state.equipment.accessory && ITEMS[state.equipment.accessory].hp||0) + (state.equipment.armor && ITEMS[state.equipment.armor].hp||0) + (state.equipment.weapon && ITEMS[state.equipment.weapon].hp||0);
  const atk = () => state.base.atk + (state.equipment.weapon && ITEMS[state.equipment.weapon].atk||0);
  const defn = () => state.base.def + (state.equipment.armor && ITEMS[state.equipment.armor].defense||0) + (state.equipment.accessory && ITEMS[state.equipment.accessory].defense||0);

  function gain(exp, gold){
    state.exp += exp; state.gold += gold;
    let leveled = false;
    while(state.exp >= levelThreshold(state.level)){
      state.exp -= levelThreshold(state.level);
      state.level++; leveled = true;
      state.base.hp += 20; state.base.atk += 3; state.base.def += 2;
      state.hp = Math.min(maxhp(), state.hp+30);
    }
    return leveled;
  }

  function canWalk(map,x,y){
    const m = MAPS[map];
    return y>=0 && y<m.length && x>=0 && x<m[0].length && !["#","~"].includes(m[y][x]);
  }

  function nearbyMob(){
    for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
      const nx=state.x+dx, ny=state.y+dy;
      const row = MAPS[state.loc][ny]; if(!row) continue;
      if(row[nx]==="m") return true;
    }
    return MAPS[state.loc][state.y][state.x] === ".";
  }

  /*** Canvas ***/
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  function drawTile(ch, x, y){
    const px = x*TILE, py = y*TILE;
    const colors = {
      "#":"#3a3d45", ".":"#567a56", "~":"#3a5b8e",
      "T":"#7f6547", "N":"#d7d47b", "E":"#a86cab", "m":"#8b3b3b", " ":"#0f141b"
    };
    ctx.fillStyle = colors[ch] || "#607a6b";
    ctx.fillRect(px,py,TILE,TILE);
    ctx.strokeStyle = "#242a33"; ctx.strokeRect(px,py,TILE,TILE);
    if(ch==="N"){ ctx.fillStyle="#30300a"; ctx.beginPath(); ctx.arc(px+16,py+16,6,0,Math.PI*2); ctx.fill(); }
    if(ch==="E"){ ctx.fillStyle="#e9c7ff"; ctx.fillRect(px+10,py+10,12,12); }
    if(ch==="m"){ drawMetin(px,py); }
  }
  function drawMetin(px,py){
    ctx.fillStyle="#888b95"; ctx.beginPath();
    ctx.ellipse(px+16,py+16,12,14,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#494c55"; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(px+8,py+10); ctx.lineTo(px+18,py+16); ctx.stroke();
  }
  function drawPlayer(){
    const px=state.x*TILE, py=state.y*TILE;
    ctx.fillStyle="#e9ecff"; ctx.strokeStyle="#000"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(px+8,py+6,TILE-16,TILE-12,6); ctx.fill(); ctx.stroke();
    // sword on right
    ctx.fillStyle="#d6d9e6"; ctx.beginPath();
    ctx.moveTo(px+TILE-8, py+12); ctx.lineTo(px+TILE-2, py+14); ctx.lineTo(px+TILE-8, py+22); ctx.lineTo(px+TILE-14, py+20); ctx.closePath(); ctx.fill();
    ctx.stroke();
  }

  function drawMap(){
    const m = MAPS[state.loc];
    for(let y=0;y<m.length;y++){
      const row = m[y];
      for(let x=0;x<row.length;x++){
        drawTile(row[x],x,y);
      }
    }
    drawPlayer();
  }

  /*** HUD & panels ***/
  const statsEl = document.getElementById("stats");
  const msgEl = document.getElementById("msg");
  const questsEl = document.getElementById("quests");
  const dialogEl = document.getElementById("dialog");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogBody = document.getElementById("dialogBody");
  const overlayEl = document.getElementById("overlay");
  const overlayBody = document.getElementById("overlayBody");
  const invEl = document.getElementById("inv");
  const invList = document.getElementById("invList");
  const invDesc = document.getElementById("invDesc");
  const eqWeapon = document.getElementById("eqWeapon");
  const eqArmor = document.getElementById("eqArmor");
  const eqAcc = document.getElementById("eqAcc");
  const bigmapEl = document.getElementById("bigmap");
  const bigmapCanvas = document.getElementById("bigmapCanvas");
  const bctx = bigmapCanvas.getContext("2d");

  function setMsg(t){ state.msg=t; }
  function dialog(title, body){
    dialogTitle.textContent = title; dialogBody.textContent = body;
    dialogEl.style.display = "flex";
  }
  function closeDialog(){ dialogEl.style.display="none"; }
  function showOverlay(html){ overlayBody.innerHTML = html; overlayEl.style.display="flex"; }
  function closeOverlay(){ overlayEl.style.display="none"; }
  function openInv(){ invEl.style.display="flex"; refreshInv(); }
  function closeInv(){ invEl.style.display="none"; }
  function refreshHud(){
    statsEl.textContent = `${state.name} Lv${state.level}  HP ${state.hp}/${maxhp()}  ATK ${atk()} DEF ${defn()}  GOLD ${state.gold}  [${state.loc}]`;
    msgEl.textContent = state.msg;
    questsEl.textContent = questStatusLine();
  }
  function refreshInv(){
    eqWeapon.textContent = "Broń: " + (state.equipment.weapon ? ITEMS[state.equipment.weapon].name : "-");
    eqArmor.textContent = "Zbroja: " + (state.equipment.armor ? ITEMS[state.equipment.armor].name : "-");
    eqAcc.textContent = "Dodatek: " + (state.equipment.accessory ? ITEMS[state.equipment.accessory].name : "-");
    invList.innerHTML = "";
    state.inventory.forEach((iid, idx) => {
      const it = ITEMS[iid];
      const extra = it.type==="weapon" && it.atk ? `ATK+${it.atk}`
                 : it.type==="armor" && it.defense ? `DEF+${it.defense}`
                 : it.type==="accessory" && it.hp ? `HP+${it.hp}`
                 : it.type==="potion" ? `Leczy ${it.hp}` : "";
      const li = document.createElement("li");
      li.innerHTML = `<span>${idx+1}. ${it.name} <span class="tag">[${it.type}] ${extra}</span></span>
                      <span><button class="btn" data-i="${idx}">Użyj/Załóż</button></span>`;
      li.querySelector("button").onclick = () => useItem(idx);
      invList.appendChild(li);
    });
  }
  function useItem(index){
    const iid = state.inventory[index]; if(!iid) return;
    const it = ITEMS[iid];
    if(["weapon","armor","accessory"].includes(it.type)){
      // equip
      const slot = it.type;
      if(state.equipment[slot]) state.inventory.push(state.equipment[slot]);
      state.equipment[slot] = iid;
      state.inventory.splice(index,1);
    }else if(it.type==="potion"){
      state.inventory.splice(index,1);
      const heal = Math.min(it.hp, maxhp()-state.hp);
      state.hp += heal;
      setMsg(`Mikstura +${heal} HP.`);
    }
    refreshInv(); refreshHud();
  }

  document.getElementById("btnUnequip").onclick = () => {
    for(const k of ["weapon","armor","accessory"]){
      if(state.equipment[k]){ state.inventory.push(state.equipment[k]); state.equipment[k]=null; }
    }
    refreshInv(); refreshHud();
  };

  /*** Gameplay ***/
  function interact(){
    const tile = MAPS[state.loc][state.y][state.x];
    const npc = NPCS[state.loc][`${state.x},${state.y}`];
    if(npc){
      const [name, role] = npc;
      if(role==="shop"){ openShop(name); return; }
      if(role==="info"){ handleQuests(name); return; }
    }
    if(tile==="E"){
      const [to,[tx,ty]] = PORTALS[state.loc][0];
      // boss gate check
      if(state.loc==="lochy" && !(state.quests.boss_chain && state.quests.boss_chain.ready)){
        return dialog("Drzwi zamknięte","Poczuj moc Metinów i wróć...");
      }
      state.loc = to; state.x = tx; state.y = ty;
      return dialog("Podróż", `Przechodzisz do: ${to}.`);
    }
    if(nearbyMob()){
      const mob = rollMob(); if(mob) return combat(mob);
    }
    dialog("Info","Brak interakcji. Szukaj NPC (N), portali (E) lub potworów (m).");
  }

  function nearbyMob(){
    for(let dy=-1; dy<=1; dy++){
      for(let dx=-1; dx<=1; dx++){
        const nx=state.x+dx, ny=state.y+dy;
        const row = MAPS[state.loc][ny]; if(!row) continue;
        if(row[nx]==="m") return true;
      }
    }
    return MAPS[state.loc][state.y][state.x] === ".";
  }

  function rollMob(){
    const arr = MOBS[state.loc] || [];
    return arr.length ? arr[Math.floor(Math.random()*arr.length)] : null;
  }

  function openShop(name){
    const inv = SHOPS[name] || [];
    const left = inv.map((iid,i) => {
      const it = ITEMS[iid];
      const stats = [];
      if(it.atk) stats.push(`ATK+${it.atk}`);
      if(it.defense) stats.push(`DEF+${it.defense}`);
      if(it.hp && it.type!=="potion") stats.push(`HP+${it.hp}`);
      if(it.type==="potion") stats.push(`Leczy ${it.hp}`);
      return `${i+1}. ${it.name} (${it.type}) - ${it.price}  ${stats.join(" ")}`;
    }).join("<br>");
    const right = state.inventory.map((iid,i)=> `${i+1}. ${ITEMS[iid].name}`).join("<br>");
    const html = `<h3>Sklep: ${name}</h3>
      <div><b>KUP:</b><br>${left || "(brak)"}</div><hr>
      <div><b>SPRZEDAJ:</b><br>${right || "(pusto)"}</div>
      <p><b>Instrukcje:</b> Kliknij pozycję z listy kupna/sprzedaży.</p>`;
    showOverlay(html);
    // simple clickable lists
    overlayBody.querySelectorAll("div")[0].onclick = (e)=>{
      const m = e.target.textContent.match(/^(\d+)\./); if(!m) return;
      const idx = Number(m[1])-1; const iid = inv[idx]; if(!iid) return;
      const it = ITEMS[iid];
      if(state.gold >= it.price){ state.gold -= it.price; state.inventory.push(iid); refreshHud(); openShop(name); }
    };
    overlayBody.querySelectorAll("div")[1].onclick = (e)=>{
      const m = e.target.textContent.match(/^(\d+)\./); if(!m) return;
      const idx = Number(m[1])-1; const iid = state.inventory[idx]; if(!iid) return;
      const price = Math.max(1, Math.floor((ITEMS[iid].price||0)/2));
      state.gold += price; state.inventory.splice(idx,1); refreshHud(); openShop(name);
    };
  }

  /*** Combat ***/
  function combat(mob){
    let hp = mob.hp;
    let log = [`Walka: ${mob.name}`];
    let swingPhase = 0;
    function render(){
      ctx.fillStyle="#0b0e13"; ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
      // texts
      ctx.fillStyle="#e8eaf0"; ctx.font="18px Consolas, monospace";
      ctx.fillText(`${mob.name}  HP ${hp}/${mob.hp}`, 40, 40);
      ctx.fillText(`${state.name}  HP ${state.hp}/${maxhp()}`, 40, 70);
      ctx.font="14px Consolas, monospace";
      ctx.fillText("Enter=Atak   P=Mikstura   Esc=Ucieczka", 40, 100);
      // draw enemy (metin as rock)
      const ex=220, ey=200;
      if(mob.kind==="metin"){
        ctx.fillStyle="#9499a6"; ctx.beginPath(); ctx.arc(ex,ey,28,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#555b66"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(ex-10,ey-8); ctx.lineTo(ex+12,ey+6); ctx.stroke();
      } else {
        ctx.fillStyle="#a44444"; ctx.fillRect(ex-22,ey-18,44,36);
        ctx.strokeStyle="#2a0f0f"; ctx.strokeRect(ex-22,ey-18,44,36);
      }
      // player sprite + swing arc
      const px=420, py=200;
      ctx.fillStyle="#e9ecff"; ctx.strokeStyle="#000"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(px-24, py-28, 48, 56, 8); ctx.fill(); ctx.stroke();
      if(swingPhase>0){
        const ang = Math.PI*(1 - swingPhase);
        ctx.strokeStyle="#e9ecff"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(px,py,60, ang-0.5, ang+0.5); ctx.stroke();
      }
      // log
      ctx.fillStyle="#cfe3cf";
      let y=300; for(const ln of log.slice(-8)){ ctx.fillText(ln, 40, y); y+=20; }
    }
    function step(){ swingPhase = Math.max(0, swingPhase - 0.06); render(); }
    function key(e){
      if(e.key==="Escape"){
        if(Math.random()<.5){ log.push("Uciekasz!"); cleanup(); return; }
        else log.push("Nie udało się uciec!");
      }
      if(e.key==="Enter"){
        swingPhase = 1;
        const dmg = Math.max(1, atk() - mob.def + (Math.floor(Math.random()*5)-2));
        hp -= dmg; log.push(`Trafiasz za ${dmg}.`);
        if(hp<=0){
          const gold = randBetween(mob.gold[0], mob.gold[1]);
          const exp = mob.exp;
          const drops = mob.drops.filter(([iid,ch])=>Math.random()<ch).map(([iid])=>iid);
          drops.forEach(iid => state.inventory.push(iid));
          const up = gain(exp,gold);
          dialog("Zwycięstwo!", `+${exp} EXP, +${gold} złota.${up?` [Poziom ${state.level}!]`:""} ${drops.length?(" Łupy: "+drops.map(i=>ITEMS[i].name).join(", ")): ""}`);
          notifyKill(mob.name);
          cleanup(); return;
        }
        const mdmg = Math.max(1, mob.atk - defn() + (Math.floor(Math.random()*5)-2));
        state.hp -= mdmg; log.push(`${mob.name} zadaje ${mdmg}.`);
        if(state.hp<=0){
          const lost = Math.min(state.gold, randBetween(5,30));
          state.gold -= lost; state.hp = Math.max(1, Math.floor(maxhp()/2));
          state.loc="miasto"; state.x=2; state.y=13;
          dialog("Porażka","Zginąłeś! Straciłeś "+lost+" złota. Powrót do miasta."); cleanup(); return;
        }
      }
      if(e.key.toLowerCase()==="p"){
        const idx = state.inventory.findIndex(i => ITEMS[i].type==="potion");
        if(idx<0){ log.push("Brak mikstur."); }
        else {
          const iid = state.inventory[idx]; const heal = Math.min(ITEMS[iid].hp, maxhp()-state.hp);
          state.inventory.splice(idx,1); state.hp += heal; log.push(`Mikstura +${heal} HP.`);
        }
      }
    }
    function cleanup(){
      window.removeEventListener("keydown", key);
      window.clearInterval(timer);
      drawAll();
    }
    window.addEventListener("keydown", key);
    const timer = window.setInterval(step, 16);
  }

  /*** Quests ***/
  function handleQuests(npc){
    if(npc==="guide"){
      const q = state.quests.kill_wolves;
      if(!q){
        state.quests.kill_wolves = {name:"Zabij 5 Wilków na Polu", goal:5, progress:0, reward:{gold:120, items:["hp_big"]}, mob:"Wilk", done:false};
        dialog("Przewodnik","Misja! Zabij 5 Wilków na Równinach. Wróć po nagrodę.");
      } else if(!q.done && q.progress>=q.goal){
        state.gold += q.reward.gold; q.reward.items.forEach(i=>state.inventory.push(i));
        q.done=true;
        state.quests.get_iron = {name:"Zdobądź Żelazny Miecz (Mały Metin)", goal:1, progress:0, item:"iron_sword", done:false};
        dialog("Przewodnik","Dobra robota! Teraz zdobądź Żelazny Miecz z Małego Metina.");
      } else {
        dialog("Przewodnik", `Postęp ${q.progress||0}/${q.goal||5} wilków.`);
      }
    } else if(npc==="hunter"){
      const q = state.quests.get_iron;
      if(!q) return dialog("Myśliwy","Najpierw porozmawiaj z Przewodnikiem w mieście.");
      const have = state.inventory.includes("iron_sword") || state.equipment.weapon==="iron_sword";
      if(!q.done && have){
        q.done=true;
        if(state.inventory.includes("iron_sword")){
          state.inventory.splice(state.inventory.indexOf("iron_sword"),1);
        }
        state.quests.boss_chain = {name:"Wejdź do Lochów i pokonaj Władcę", ready:true, done:false};
        dialog("Myśliwy","Świetnie! Teraz możesz zmierzyć się z bossem w Lochach.");
      } else dialog("Myśliwy","Szukaj Małych Metinów na Polu.");
    } else if(npc==="shade"){
      const bc = state.quests.boss_chain;
      if(bc && !bc.done) dialog("Cień","Sala bossa jest otwarta. Idź i zmierz się z Władcą.");
      else dialog("Cień","Tylko najdzielniejsi mogą wejść dalej.");
    } else if(npc==="nomad"){
      dialog("Nomada","Na pustyni czai się Bandzior — uważaj.");
    }
  }

  function notifyKill(name){
    const q = state.quests.kill_wolves;
    if(q && !q.done && name===q.mob){ q.progress = Math.min(q.goal, (q.progress||0)+1); }
    if(name==="Władca Lochu" && state.quests.boss_chain && !state.quests.boss_chain.done){
      state.quests.boss_chain.done=true;
      dialog("Legenda","Pokonałeś Władcę Lochu!");
    }
  }

  function questStatusLine(){
    const parts = [];
    for(const [id,q] of Object.entries(state.quests)){
      if(q.done) continue;
      if(id==="boss_chain" && q.ready) parts.push(q.name);
      else if(q.goal!=null) parts.push(`${q.name} [${q.progress||0}/${q.goal}]`);
    }
    return parts.length ? parts.join(" | ") : "Brak aktywnych zadań.";
  }

  /*** Minimap overlay ***/
  function drawBigmap(){
    const m = MAPS[state.loc];
    const w = m[0].length, h = m.length;
    bctx.fillStyle="#0b0e13"; bctx.fillRect(0,0,bigmapCanvas.width,bigmapCanvas.height);
    const scale = Math.min((bigmapCanvas.width-60)/w, (bigmapCanvas.height-80)/h);
    const ox = 30, oy = 30;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const ch = m[y][x];
        let col = "#2e2f35";
        if(ch==="#") col="#3b3e46"; else if(".m".includes(ch)) col="#4e7450";
        else if(ch==="T") col="#6a5642"; else if(ch==="E") col="#855a9a"; else if(ch==="~") col="#3a5b8e";
        bctx.fillStyle=col;
        bctx.fillRect(Math.floor(ox+x*scale), Math.floor(oy+y*scale), Math.max(1,scale), Math.max(1,scale));
      }
    }
    // player
    bctx.fillStyle="#fff"; bctx.beginPath();
    bctx.arc(Math.floor(ox+state.x*scale), Math.floor(oy+state.y*scale), Math.max(2,scale/2), 0, Math.PI*2);
    bctx.fill();
  }

  /*** Save/Load ***/
  function save(){
    localStorage.setItem("metin2_save", JSON.stringify(state));
    dialog("Zapisano","Gra zapisana w przeglądarce.");
  }
  function load(){
    const s = localStorage.getItem("metin2_save");
    if(!s) return dialog("Wczytaj","Brak zapisu.");
    const obj = JSON.parse(s);
    Object.assign(state, obj);
    dialog("Wczytano","Zapis przywrócony.");
  }

  /*** Input ***/
  let keysDown = {};
  window.addEventListener("keydown", (e)=>{
    keysDown[e.key] = true;
    if(e.key==="i"||e.key==="I"){ openInv(); }
    if(e.key==="m"||e.key==="M"){
      state.bigmap = !state.bigmap;
      if(state.bigmap){ drawBigmap(); bigmapEl.style.display="block"; }
      else { bigmapEl.style.display="none"; }
    }
    if(e.key==="g"||e.key==="G"){ save(); }
    if(e.key==="l"||e.key==="L"){ load(); }
    if(e.key==="e"||e.key==="E"||e.key==="Enter"){ interact(); }
    if(e.key==="Escape"){ closeDialog(); closeOverlay(); closeInv(); if(state.bigmap){ state.bigmap=false; bigmapEl.style.display="none"; } }
  });
  window.addEventListener("keyup", (e)=>{ delete keysDown[e.key]; });

  document.getElementById("dialogClose").onclick = closeDialog;
  document.getElementById("btnSave").onclick = save;
  document.getElementById("btnLoad").onclick = load;
  document.getElementById("btnInv").onclick = openInv;
  document.getElementById("invClose").onclick = closeInv;
  document.getElementById("btnMap").onclick = () => { state.bigmap=!state.bigmap; if(state.bigmap){ drawBigmap(); bigmapEl.style.display="block"; } else bigmapEl.style.display="none"; };
  document.getElementById("btnHelp").onclick = () => dialog("Sterowanie","WASD/Strzałki – ruch, E/Enter – interakcja, I – ekwipunek, M – mapa, G – zapis, L – wczytaj. W sklepie klikaj na listy.");

  /*** Loop ***/
  function step(ts){
    // movement
    state.moveTimer -= 16;
    let dx=0, dy=0;
    if(state.moveTimer<=0){
      if(keysDown["ArrowLeft"]||keysDown["a"]||keysDown["A"]) dx=-1;
      else if(keysDown["ArrowRight"]||keysDown["d"]||keysDown["D"]) dx=+1;
      else if(keysDown["ArrowUp"]||keysDown["w"]||keysDown["W"]) dy=-1;
      else if(keysDown["ArrowDown"]||keysDown["s"]||keysDown["S"]) dy=+1;
      if(dx||dy){
        const nx=state.x+dx, ny=state.y+dy;
        if(canWalk(state.loc,nx,ny)){ state.x=nx; state.y=ny; state.moveTimer = MOVE_COOLDOWN; }
      }
    }
    drawAll();
    window.requestAnimationFrame(step);
  }

  function drawAll(){
    ctx.clearRect(0,0,SCREEN_W,SCREEN_H);
    drawMap();
    refreshHud();
  }

  /*** Helpers ***/
  function randBetween(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  // kick off
  drawAll();
  window.requestAnimationFrame(step);
})();