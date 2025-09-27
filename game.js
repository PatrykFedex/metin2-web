import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, set, onValue, onDisconnect, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const TILE=32, VIEW_W=40, VIEW_H=20;
const canvas=document.getElementById("game"); const ctx=canvas.getContext("2d");
const nameInput=document.getElementById('name'); const roomInput=document.getElementById('room');
const btnConnect=document.getElementById('btnConnect'); const connStatus=document.getElementById('connStatus');
const dialogEl=document.getElementById('dialog'); const dialogTitle=document.getElementById('dialogTitle'); const dialogBody=document.getElementById('dialogBody');
document.getElementById('dialogClose').onclick=()=>dialogEl.style.display='none';
function dialog(t,b){ dialogTitle.textContent=t; dialogBody.innerHTML=b; dialogEl.style.display='flex'; }

let app, db, auth, uid=null, roomId=null; const others=new Map();
const state={name:'Bohater',loc:'miasto',x:2,y:13,hp:100,level:1,gold:100};

function draw(){ ctx.fillStyle='#0f141b'; ctx.fillRect(0,0,1280,800);
  ctx.fillStyle='#567a56'; for(let y=0;y<20;y++) for(let x=0;x<40;x++){ ctx.fillRect(x*TILE,y*TILE,TILE-1,TILE-1); }
  if(roomId){ ctx.fillStyle='#e8eaf0'; ctx.fillText('Pokój: '+roomId, 20, 30); }
  for(const [_,p] of others){ ctx.fillStyle='#83c5be'; ctx.fillRect(p.x*TILE+8, p.y*TILE+8, TILE-16, TILE-16); ctx.fillText(p.name||'Gracz', p.x*TILE+4, p.y*TILE+8); }
  ctx.fillStyle='#e9ecff'; ctx.fillRect(state.x*TILE+8,state.y*TILE+8,TILE-16,TILE-16); ctx.fillText(nameInput.value||'Ty', state.x*TILE+4, state.y*TILE+8);
}
function loop(){ draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

btnConnect.onclick = async () => {
  if(uid){ try{ await remove(ref(db, `rooms/${roomId}/players/${uid}`)); }catch(e){} uid=null; roomId=null; connStatus.textContent='Offline'; btnConnect.textContent='Połącz'; return; }
  if(!nameInput.value || !roomInput.value){ return dialog('Online','Podaj nazwę i pokój.'); }
  try{
    app = initializeApp(firebaseConfig);
    db = getDatabase(app); auth = getAuth(app);
    try{
      const cred = await signInAnonymously(auth);
      uid = cred.user.uid; console.log('Anon login OK');
    }catch(e){
      console.warn('Anon login failed, trying email/password...', e.code);
      if(firebaseConfig.guestEmail && firebaseConfig.guestPassword){
        const cred = await signInWithEmailAndPassword(auth, firebaseConfig.guestEmail, firebaseConfig.guestPassword);
        uid = cred.user.uid; console.log('Email login OK');
      } else {
        dialog('Włącz logowanie', 'Włącz Anonymous w Authentication → Sign-in method <br>ALBO ustaw w pliku firebase-config.js pola guestEmail i guestPassword.');
        return;
      }
    }
    roomId = roomInput.value;
    const pRef = ref(db, `rooms/${roomId}/players/${uid}`);
    await set(pRef, {name: nameInput.value, x: state.x, y: state.y, loc: state.loc, hp: state.hp, ts: Date.now()});
    onDisconnect(pRef).remove();
    onValue(ref(db, `rooms/${roomId}/players`), (snap)=>{ others.clear(); const val=snap.val()||{}; for(const [k,v] of Object.entries(val)){ if(k!==uid) others.set(k,v); } });
    setInterval(()=>{ if(uid) set(pRef,{name:nameInput.value,x:state.x,y:state.y,loc:state.loc,hp:state.hp,ts:Date.now()}); },500);
    connStatus.textContent='Online: pokój '+roomId; btnConnect.textContent='Rozłącz';
  }catch(e){ console.error(e); dialog('Błąd połączenia', String(e)); }
};
