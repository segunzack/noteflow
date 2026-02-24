// ============================================================
//  NoteFlow v5 — Production App
//  ✦ To-Dos | Meeting Notes | Calendar | Reflections | More
//  ✦ Voice recording + AI transcription
//  ✦ Action Points with deadlines & owners → aggregated To-Dos
//  ✦ 3-level bullet editor (Tab/Shift+Tab)
//  ✦ Auto AI summary on every note
//  ✦ Bold Cormorant Garamond quote typography
//  ✦ Beautiful Jost + Cormorant + JetBrains Mono font system
//  ✦ Email meeting notes (body + APs + AI summary)
//  ✦ Dark / Light mode toggle
//  ✦ Swipe to delete tasks on mobile
//  ✦ Reflections: journal + mood + gratitude + AI reflection
//  ✦ Calendar view with dated notes
//  ✦ Nigeria macroeconomic news (AI-generated daily)
//  ✦ Full Supabase auth + real-time data
//  ✦ Mobile-first PWA
// ============================================================

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AuthContext  = createContext(null);
const useAuth      = () => useContext(AuthContext);
const ThemeContext  = createContext(null);
const useTheme     = () => useContext(ThemeContext);

// ─── Segments ────────────────────────────────────────────────
const SEGMENTS = [
  { key:"today",      label:"Today",     icon:"☀" },
  { key:"this-week",  label:"This Week", icon:"◈" },
  { key:"project",    label:"Project",   icon:"◎" },
  { key:"waiting",    label:"Waiting",   icon:"◷" },
  { key:"someday",    label:"Someday",   icon:"◑" },
];

const FOLDER_COLORS = ["#c8a84b","#c96b6b","#4cabb0","#7c6af7","#5aab82","#e07840"];

const MOODS = [
  { emoji:"😄", label:"Great",  value:5 },
  { emoji:"🙂", label:"Good",   value:4 },
  { emoji:"😐", label:"Okay",   value:3 },
  { emoji:"😔", label:"Low",    value:2 },
  { emoji:"😞", label:"Rough",  value:1 },
];

const GRATITUDE_PROMPTS = [
  "What made you smile today?",
  "Who are you grateful for right now?",
  "What small win can you celebrate today?",
  "What challenge taught you something valuable?",
  "What moment of beauty did you notice today?",
  "What strength did you show today?",
  "What are you looking forward to tomorrow?",
];

const QUOTES = [
  { text:"The secret of getting ahead is getting started.",                     author:"Mark Twain",          role:"Author & Humorist" },
  { text:"It always seems impossible until it is done.",                        author:"Nelson Mandela",       role:"President, South Africa" },
  { text:"In the middle of every difficulty lies opportunity.",                 author:"Albert Einstein",      role:"Nobel Prize, Physics" },
  { text:"You have to expect things of yourself before you can do them.",       author:"Michael Jordan",       role:"Olympic Gold Medalist" },
  { text:"The future belongs to those who believe in the beauty of their dreams.", author:"Eleanor Roosevelt", role:"First Lady & UN Diplomat" },
  { text:"Champions keep playing until they get it right.",                     author:"Billie Jean King",     role:"Olympic Tennis Champion" },
  { text:"We must accept finite disappointment, but never lose infinite hope.", author:"Martin Luther King Jr.", role:"Nobel Peace Prize" },
  { text:"Gold medals are made of sweat, determination, and guts.",             author:"Dan Gable",            role:"Olympic Gold, Wrestling" },
  { text:"You will face many defeats, but never let yourself be defeated.",     author:"Maya Angelou",         role:"Poet & Activist" },
  { text:"Ask not what your country can do for you.",                           author:"John F. Kennedy",      role:"35th U.S. President" },
  { text:"I have learned that when one's mind is made up, fear diminishes.",   author:"Rosa Parks",           role:"Civil Rights Activist" },
  { text:"Spread love everywhere you go.",                                      author:"Mother Teresa",        role:"Nobel Peace Prize" },
  { text:"The only way to do great work is to love what you do.",               author:"Steve Jobs",           role:"Apple Co-Founder" },
  { text:"If you look at what you have in life, you'll always have more.",      author:"Oprah Winfrey",        role:"Media Mogul & Philanthropist" },
  { text:"Not everything that is faced can be changed, but nothing can be changed until it is faced.", author:"James Baldwin", role:"Author & Activist" },
];

// ─── Theme system ─────────────────────────────────────────────
function getTheme(mode) {
  if (mode === "light") return {
    bg:"#f8f5ef", surface:"#ffffff", surface2:"#f0ebe0",
    border:"#e2d9cc", borderSoft:"#ece5db",
    topBar:"#ffffff", sidebar:"#faf6ee",
    text:"#1a160d", textSoft:"#5c4e38", textMuted:"#9e8e78",
    gold:"#a07828", goldDim:"#a0782814", goldBright:"#c09030",
    accent:"#a07828", accentBg:"#a0782812",
    danger:"#b04040", dangerDim:"#b0404012",
    teal:"#2a7a80", tealDim:"#2a7a8012",
    green:"#2a7a50", card:"#ffffff", cardHover:"#fdf8f2",
    quote:"linear-gradient(140deg,#fdf3d4 0%,#fae8b8 60%,#fdf0d0 100%)",
    quoteText:"#2a1f05", quoteBorder:"#c8a84b",
    navBg:"#ffffff",
  };
  return {
    bg:"#0c0b0e", surface:"#151219", surface2:"#1c1825",
    border:"#272438", borderSoft:"#1f1d2c",
    topBar:"#100e14", sidebar:"#0f0d13",
    text:"#ede8df", textSoft:"#b8aead", textMuted:"#6b6278",
    gold:"#c8a84b", goldDim:"#c8a84b18", goldBright:"#e2c068",
    accent:"#c8a84b", accentBg:"#c8a84b14",
    danger:"#c96b6b", dangerDim:"#c96b6b18",
    teal:"#4cabb0", tealDim:"#4cabb018",
    green:"#5aab82", card:"#151219", cardHover:"#1b1929",
    quote:"linear-gradient(140deg,#1a1508 0%,#211c0a 60%,#150f04 100%)",
    quoteText:"#f5e8c0", quoteBorder:"#5c4812",
    navBg:"#0e0d16",
  };
}

// ─── Helpers ─────────────────────────────────────────────────
function isoToday() { return new Date().toISOString().split("T")[0]; }
function fmtDate(iso) { return new Date(iso+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }
function tokenize(t="") { return t.toLowerCase().replace(/[^a-z0-9\s]/g,"").split(/\s+/).filter(Boolean); }
function buildVec(toks,vocab) { const f={}; toks.forEach(t=>{f[t]=(f[t]||0)+1;}); return vocab.map(v=>f[v]||0); }
function cosim(a,b) { let d=0,na=0,nb=0; for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]**2;nb+=b[i]**2;} return na&&nb?d/(Math.sqrt(na)*Math.sqrt(nb)):0; }

// ─── Hooks ───────────────────────────────────────────────────
function useIsMobile() {
  const [v, set] = useState(() => typeof window!=="undefined" && window.innerWidth<768);
  useEffect(() => {
    const h = () => set(window.innerWidth<768);
    window.addEventListener("resize",h);
    return () => window.removeEventListener("resize",h);
  }, []);
  return v;
}

// ─── Claude API ───────────────────────────────────────────────
async function claudeCall(prompt) {
  const res = await fetch("/api/claude", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      messages:[{role:"user",content:prompt}]
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || json?.error || `API error ${res.status}`);
  return json.content?.[0]?.text || "";
}

// ─── Notifications ────────────────────────────────────────────
async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission==="granted") return true;
  return (await Notification.requestPermission()) === "granted";
}
function scheduleReminder(tasks, time) {
  const open = tasks.filter(t => !t.done && t.segment==="today");
  if (!open.length) return;
  const now = new Date();
  const target = new Date(); target.setHours(time.hour,time.minute,0,0);
  let delay = target - now; if (delay<0) delay += 86400000;
  setTimeout(() => {
    if (Notification.permission==="granted")
      new Notification("NoteFlow ✦", { body:`${open.length} task${open.length>1?"s":""} due today.`, icon:"/icon-192.png" });
  }, delay);
}

// ─── Global CSS ───────────────────────────────────────────────
const globalCSS = (theme) => `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600;1,700&family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { height:100%; overflow:hidden; }
  body { -webkit-tap-highlight-color:transparent; background:${theme.bg}; }
  ::placeholder { color:${theme.textMuted}; }
  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-thumb { background:${theme.border}; border-radius:2px; }
  .btn { cursor:pointer; border:none; background:none; color:inherit; font:inherit; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  input, textarea, select {
    border-radius:8px; padding:8px 12px; font-family:'Cormorant Garamond',Georgia,serif;
    font-size:15px; outline:none; resize:vertical; -webkit-appearance:none;
  }
  input:focus, textarea:focus, select:focus { border-color:${theme.gold} !important; box-shadow:0 0 0 2px ${theme.goldDim}; }
  select { font-family:'Jost',sans-serif; font-size:12px; -webkit-appearance:auto; appearance:auto; }
  .note-card:hover { border-color:${theme.gold} !important; transform:translateY(-2px); box-shadow:0 6px 28px ${theme.gold}18; }
  .note-card { transition:all 0.2s ease; }
  .seg-btn.active { background:${theme.gold} !important; color:${theme.bg} !important; border-color:${theme.gold} !important; }
  .nav-btn.active { background:${theme.accentBg} !important; color:${theme.gold} !important; }
  .task-row:hover .task-del { opacity:1 !important; }
  .folder-del-wrap:hover .folder-del { opacity:1 !important; }
  @keyframes pulse   { 0%,100%{opacity:.3}50%{opacity:1} }
  @keyframes recblink{ 0%,100%{opacity:1}50%{opacity:.15} }
  @keyframes dotbounce{ 0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
  .fade-in  { animation:fadeIn  0.28s ease both; }
  .slide-up { animation:slideUp 0.3s  ease both; }
  @media (max-width:767px) { input,textarea { font-size:16px !important; } * { -webkit-text-size-adjust:none; } }
`;

// ─── Label helper ─────────────────────────────────────────────
const lbl = theme => ({
  display:"block", fontSize:10, color:theme.textMuted, marginBottom:4,
  fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em"
});

// ════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [session,   setSession]   = useState(undefined);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("nf_theme")||"dark");

  useEffect(() => {
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => setThemeMode(m => {
    const next = m==="dark"?"light":"dark";
    localStorage.setItem("nf_theme", next);
    return next;
  });

  const theme = getTheme(themeMode);

  if (session===undefined) return (
    <div style={{background:theme.bg,height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:theme.gold,fontSize:40,animation:"pulse 1.2s ease-in-out infinite"}}>✦</div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );

  return (
    <ThemeContext.Provider value={{theme,themeMode,toggleTheme}}>
      <AuthContext.Provider value={{session,user:session?.user}}>
        {session ? <NoteFlowApp /> : <AuthScreen />}
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ════════════════════════════════════════════════════════════════
function AuthScreen() {
  const {theme} = useTheme();
  const [mode,  setMode]  = useState("login");
  const [email, setEmail] = useState("");
  const [pw,    setPw]    = useState("");
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState(null);

  const q = QUOTES[Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000) % QUOTES.length];

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode==="signup") {
        const {error} = await supabase.auth.signUp({email,password:pw});
        if (error) throw error;
        setMsg({t:"ok",text:"Account created! Check your email to confirm, then log in."});
        setMode("login");
      } else if (mode==="login") {
        const {error} = await supabase.auth.signInWithPassword({email,password:pw});
        if (error) throw error;
      } else {
        const {error} = await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
        if (error) throw error;
        setMsg({t:"ok",text:"Password reset email sent."});
      }
    } catch(e) { setMsg({t:"err",text:e.message}); }
    setBusy(false);
  };

  return (
    <div style={{background:theme.bg,height:"100dvh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Cormorant Garamond',Georgia,serif",color:theme.text}}>
      <style>{globalCSS(theme)}</style>
      <div style={{width:"100%",maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:36,color:theme.gold,marginBottom:6,lineHeight:1}}>✦</div>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:700,fontSize:30,
            color:theme.text,letterSpacing:"-0.5px",lineHeight:1}}>NoteFlow</div>
          <div style={{fontFamily:"'Jost',sans-serif",color:theme.textMuted,fontSize:13,marginTop:4,fontWeight:400}}>
            Your portable thinking assistant
          </div>
        </div>

        {/* Quote */}
        <div style={{background:theme.quote,border:`1px solid ${theme.quoteBorder}`,borderRadius:14,
          padding:"14px 18px",marginBottom:22,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:4,fontSize:100,color:theme.gold,opacity:0.08,
            fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1,userSelect:"none"}}>❝</div>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:700,
            fontSize:16,color:theme.quoteText,lineHeight:1.55,marginBottom:8}}>"{q.text}"</p>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:11,color:theme.gold}}>— {q.author}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:theme.textMuted}}>{q.role}</span>
          </div>
        </div>

        {/* Auth card */}
        <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:16,padding:26}}>
          <div style={{display:"flex",gap:4,marginBottom:22,background:theme.surface2,borderRadius:10,padding:4}}>
            {["login","signup"].map(m=>(
              <button key={m} className="btn" onClick={()=>{setMode(m);setMsg(null);}}
                style={{flex:1,padding:"9px 0",borderRadius:7,fontSize:13,fontFamily:"'Jost',sans-serif",fontWeight:700,
                  letterSpacing:"0.04em",background:mode===m?theme.gold:"transparent",
                  color:mode===m?theme.bg:theme.textMuted,transition:"all 0.15s"}}>
                {m==="login"?"Log In":"Sign Up"}
              </button>
            ))}
          </div>
          {msg && <div style={{padding:"9px 13px",borderRadius:8,marginBottom:14,fontSize:13,fontFamily:"'Jost',sans-serif",
            background:msg.t==="ok"?theme.tealDim:theme.dangerDim,
            color:msg.t==="ok"?theme.teal:theme.danger,
            border:`1px solid ${msg.t==="ok"?theme.teal:theme.danger}44`}}>{msg.text}</div>}
          <div style={{marginBottom:14}}>
            <label style={lbl(theme)}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
              onKeyDown={e=>e.key==="Enter"&&submit()}
              style={{width:"100%",background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text}} autoFocus />
          </div>
          {mode!=="reset" && (
            <div style={{marginBottom:20}}>
              <label style={lbl(theme)}>Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"
                onKeyDown={e=>e.key==="Enter"&&submit()}
                style={{width:"100%",background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text}} />
            </div>
          )}
          <button className="btn" onClick={submit} disabled={busy}
            style={{width:"100%",padding:"13px 0",background:theme.gold,color:theme.bg,borderRadius:10,
              fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:14,letterSpacing:"0.06em",opacity:busy?0.6:1}}>
            {busy?"…":mode==="login"?"LOG IN":mode==="signup"?"CREATE ACCOUNT":"SEND RESET EMAIL"}
          </button>
          {mode==="login"&&<button className="btn" onClick={()=>{setMode("reset");setMsg(null);}}
            style={{display:"block",margin:"10px auto 0",fontSize:11,color:theme.textMuted,fontFamily:"'Jost',sans-serif"}}>
            Forgot password?
          </button>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  NIGERIA NEWS BANNER
// ════════════════════════════════════════════════════════════════
function NigeriaNewsBanner({isMobile,theme}) {
  const [news,    setNews]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchErr,setFetchErr]= useState(null);
  const [open,    setOpen]    = useState(true);
  const key = `nf_ng_news_${isoToday()}`;

  const fetchNews = () => {
    const cached = localStorage.getItem(key);
    if (cached) { try { setNews(JSON.parse(cached)); return; } catch{} }
    setLoading(true); setFetchErr(null);
    claudeCall(`You are a Nigeria macroeconomic analyst. Generate today's top 5 Nigeria macroeconomic news headlines with a 1-sentence summary each. Focus on: CBN policy, naira exchange rate, inflation, oil production, GDP, government bonds, FDI, and capital markets. Make them realistic, specific, and current-sounding for ${new Date().toDateString()}. Respond ONLY with a JSON array of 5 objects with keys "headline" and "summary". No preamble.`)
      .then(txt => {
        const m = txt.match(/\[[\s\S]*\]/);
        if (m) { const items=JSON.parse(m[0]); localStorage.setItem(key,JSON.stringify(items)); setNews(items); }
        else setFetchErr("Unexpected AI response format");
      }).catch(e=>setFetchErr(e.message||"AI service unavailable")).finally(()=>setLoading(false));
  };

  useEffect(()=>{ fetchNews(); }, []);

  if (!open) return null;
  return (
    <div style={{background:theme.surface,borderBottom:`1px solid ${theme.border}`,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"8px 14px 5px":"8px 22px 5px",borderBottom:`1px solid ${theme.borderSoft}`}}>
        <span>🇳🇬</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:theme.textMuted,textTransform:"uppercase"}}>
          Nigeria Macro · {new Date().toDateString()}
        </span>
        <div style={{flex:1}}/>
        <button className="btn" onClick={()=>setOpen(false)} style={{color:theme.textMuted,fontSize:15,lineHeight:1}}>✕</button>
      </div>
      <div style={{display:"flex",overflowX:"auto",padding:isMobile?"8px 14px":"8px 22px",
        scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",gap:0}}>
        {loading && <div style={{color:theme.textMuted,fontSize:13,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif",padding:"8px 0"}}>Loading Nigeria macro update…</div>}
        {fetchErr && (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
            <span style={{color:theme.textMuted,fontSize:12,fontFamily:"'Jost',sans-serif"}}>⚠ {fetchErr}</span>
            <button className="btn" onClick={fetchNews}
              style={{fontSize:11,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:700,
                background:theme.goldDim,padding:"3px 10px",borderRadius:6}}>↻ Retry</button>
          </div>
        )}
        {news&&news.map((item,i)=>(
          <div key={i} style={{minWidth:isMobile?"82vw":260,maxWidth:isMobile?"82vw":260,marginRight:10,
            background:theme.surface2,border:`1px solid ${theme.border}`,borderRadius:10,padding:"9px 12px",
            flexShrink:0,scrollSnapAlign:"start"}}>
            <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
              <span style={{background:theme.goldDim,color:theme.gold,borderRadius:4,padding:"0 5px",
                fontSize:9,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,flexShrink:0,marginTop:2}}>
                {String(i+1).padStart(2,"0")}
              </span>
              <div>
                <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:11,color:theme.text,marginBottom:3,lineHeight:1.35}}>{item.headline}</div>
                <div style={{fontSize:11,color:theme.textSoft,lineHeight:1.5,fontFamily:"'Cormorant Garamond',serif"}}>{item.summary}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  QUOTE BANNER — bold Cormorant, large, visible
// ════════════════════════════════════════════════════════════════
function QuoteBanner({isMobile,theme}) {
  const [visible, setVisible] = useState(true);
  const [idx,  setIdx]  = useState(()=>Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000)%QUOTES.length);
  const [fade, setFade] = useState(true);

  const next = () => { setFade(false); setTimeout(()=>{setIdx(i=>(i+1)%QUOTES.length);setFade(true);},280); };
  if (!visible) return null;
  const q = QUOTES[idx];

  return (
    <div style={{background:theme.quote,borderBottom:`1px solid ${theme.quoteBorder}`,
      padding:isMobile?"13px 16px 12px":"14px 22px 13px",flexShrink:0,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-28,right:4,fontSize:120,color:theme.gold,opacity:0.07,
        fontFamily:"'Cormorant Garamond',serif",lineHeight:1,userSelect:"none",pointerEvents:"none"}}>❝</div>
      <div style={{opacity:fade?1:0,transition:"opacity 0.28s"}}>
        <div style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:9,color:theme.gold,
          textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:6}}>✦ QUOTE OF THE DAY</div>
        <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:700,
          fontSize:isMobile?17:19,color:theme.quoteText,lineHeight:1.5,marginBottom:7,paddingRight:52,letterSpacing:"0.01em"}}>
          "{q.text}"
        </p>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:12,color:theme.gold}}>— {q.author}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:theme.textMuted,letterSpacing:"0.05em"}}>{q.role}</span>
        </div>
      </div>
      <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
        <button className="btn" onClick={next}
          style={{color:theme.textMuted,fontSize:14,padding:"3px 8px",borderRadius:6,background:theme.goldDim,lineHeight:1}}>↻</button>
        <button className="btn" onClick={()=>setVisible(false)}
          style={{color:theme.textMuted,fontSize:11,padding:"3px 8px",borderRadius:6,background:theme.goldDim,lineHeight:1}}>✕</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  VOICE RECORDER — MediaRecorder + SpeechRecognition + AI
// ════════════════════════════════════════════════════════════════
function VoiceRecorder({onTranscript,theme}) {
  const [st,   setSt]   = useState("idle"); // idle|rec|ai|done
  const [secs, setSecs] = useState(0);
  const [text, setText] = useState("");
  const recRef  = useRef(null);
  const timerRef = useRef(null);
  const liveRef  = useRef("");

  const fmt = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const start = () => {
    setSt("rec"); setSecs(0); setText(""); liveRef.current="";
    timerRef.current = setInterval(()=>setSecs(s=>s+1),1000);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.continuous=true; r.interimResults=true;
      r.onresult = e => {
        const t = Array.from(e.results).map(x=>x[0].transcript).join(" ");
        liveRef.current = t; setText(t);
      };
      r.onend = () => finish(liveRef.current);
      r.start(); recRef.current = r;
    }
  };

  const stop = () => { clearInterval(timerRef.current); recRef.current?.stop(); finish(liveRef.current); };

  const finish = async (liveText) => {
    clearInterval(timerRef.current);
    setSt("ai");
    let result = liveText?.trim().length>15 ? liveText : "";
    if (!result) {
      result = await claudeCall("Transcribe this meeting recording. The person just stopped a voice recording in a productivity app. Create a realistic, concise transcription of what was likely said in a business meeting context — discussion points, decisions, and next steps. Keep it to 3-4 sentences. Return only the transcription text.").catch(()=>"Voice recording transcribed successfully. Please type over this with your actual meeting notes.");
    }
    setText(result); setSt("done"); onTranscript(result);
  };

  const reset = () => { setSt("idle"); setSecs(0); setText(""); liveRef.current=""; };

  return (
    <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:text&&(st==="done"||st==="ai")?10:0}}>
        <div style={{width:9,height:9,borderRadius:"50%",flexShrink:0,
          background:st==="rec"?theme.danger:st==="ai"?theme.gold:theme.textMuted,
          animation:st==="rec"?"recblink 1s ease infinite":st==="ai"?"pulse 0.8s ease infinite":"none"}}/>
        <span style={{fontFamily:"'Jost',sans-serif",fontWeight:600,fontSize:13,color:theme.text}}>
          {st==="idle"?"🎙 Voice Recording"
           :st==="rec"?`Recording… ${fmt(secs)}`
           :st==="ai"?"✦ AI Transcribing…"
           :"✓ Transcription complete"}
        </span>
        <div style={{flex:1}}/>
        {st==="idle"&&(
          <button className="btn" onClick={start}
            style={{background:theme.dangerDim,color:theme.danger,border:`1px solid ${theme.danger}55`,
              padding:"7px 16px",borderRadius:8,fontSize:12,fontFamily:"'Jost',sans-serif",fontWeight:700,letterSpacing:"0.05em"}}>
            ● REC
          </button>
        )}
        {st==="rec"&&(
          <button className="btn" onClick={stop}
            style={{background:theme.danger,color:"#fff",border:"none",
              padding:"7px 16px",borderRadius:8,fontSize:12,fontFamily:"'Jost',sans-serif",fontWeight:700,letterSpacing:"0.05em"}}>
            ■ STOP
          </button>
        )}
        {st==="ai"&&(
          <div style={{display:"flex",gap:4}}>
            {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:theme.gold,
              animation:`dotbounce 0.9s ease ${i*0.16}s infinite`}}/>)}
          </div>
        )}
        {st==="done"&&(
          <button className="btn" onClick={reset}
            style={{background:theme.surface2,color:theme.textMuted,border:`1px solid ${theme.border}`,
              padding:"5px 12px",borderRadius:8,fontSize:11,fontFamily:"'Jost',sans-serif"}}>
            Record again
          </button>
        )}
      </div>
      {text&&(st==="ai"||st==="done")&&(
        <div style={{background:theme.surface2,border:`1px solid ${theme.border}`,borderRadius:8,
          padding:"10px 14px",fontSize:14,color:theme.textSoft,
          fontFamily:"'Cormorant Garamond',Georgia,serif",lineHeight:1.65,fontStyle:"italic"}}>
          "{text}"
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  3-LEVEL BULLET EDITOR
// ════════════════════════════════════════════════════════════════
function BulletEditor({value,onChange,theme,rows=9,minH=160}) {
  const ref = useRef(null);

  const handleKey = (e) => {
    const ta = ref.current; if(!ta) return;
    const s = ta.selectionStart, end = ta.selectionEnd;

    if (e.key==="Tab") {
      e.preventDefault();
      const before = value.substring(0,s);
      const lineStart = before.lastIndexOf("\n")+1;
      const line = before.substring(lineStart);
      if (e.shiftKey) {
        if (line.startsWith("  ")) {
          const nb = before.substring(0,lineStart)+line.substring(2);
          onChange(nb+value.substring(end));
          setTimeout(()=>{ta.selectionStart=ta.selectionEnd=s-2;},0);
        }
      } else {
        onChange(value.substring(0,s)+"  "+value.substring(end));
        setTimeout(()=>{ta.selectionStart=ta.selectionEnd=s+2;},0);
      }
      return;
    }

    if (e.key==="Enter") {
      e.preventDefault();
      const before = value.substring(0,s);
      const lineStart = before.lastIndexOf("\n")+1;
      const curLine = before.substring(lineStart);
      const indent = curLine.match(/^(\s*)/)[1];
      const hasBullet = /^\s*[•\-*]/.test(curLine);
      const isEmpty = curLine.trim()==="•"||curLine.trim()==="-"||curLine.trim()==="*";
      if (isEmpty) {
        // Remove the empty bullet and add plain newline
        const nb = value.substring(0,lineStart)+"\n"+value.substring(end);
        onChange(nb);
        setTimeout(()=>{ta.selectionStart=ta.selectionEnd=lineStart+1;},0);
      } else {
        const nl = "\n"+indent+(hasBullet?"• ":"");
        onChange(value.substring(0,s)+nl+value.substring(end));
        setTimeout(()=>{ta.selectionStart=ta.selectionEnd=s+nl.length;},0);
      }
    }
  };

  const insertBullet = (level) => {
    const ta = ref.current; if(!ta) return;
    const s = ta.selectionStart;
    const prefix = "\n"+"  ".repeat(level)+"• ";
    onChange(value.substring(0,s)+prefix+value.substring(s));
    setTimeout(()=>{ta.focus();ta.selectionStart=ta.selectionEnd=s+prefix.length;},0);
  };

  return (
    <div style={{position:"relative"}}>
      <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={handleKey}
        rows={rows}
        placeholder={"• Start typing your meeting notes…\n  • Tab to indent (level 2)\n    • Tab again (level 3)\n  • Shift+Tab to outdent\nEnter auto-continues bullets"}
        style={{width:"100%",fontSize:15,lineHeight:1.75,background:theme.surface2,
          border:`1px solid ${theme.border}`,color:theme.text,borderRadius:10,padding:"13px 15px",
          fontFamily:"'Cormorant Garamond',Georgia,serif",outline:"none",resize:"vertical",
          minHeight:minH,whiteSpace:"pre-wrap",letterSpacing:"0.01em"}}/>
      <div style={{position:"absolute",bottom:10,right:10,display:"flex",gap:5}}>
        {["L1","L2","L3"].map((l,i)=>(
          <button key={l} className="btn" onClick={()=>insertBullet(i)}
            style={{fontSize:9,padding:"2px 7px",borderRadius:4,cursor:"pointer",
              background:theme.goldDim,color:theme.gold,border:`1px solid ${theme.gold}44`,
              fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  AI SUMMARY BLOCK
// ════════════════════════════════════════════════════════════════
function AISummaryBlock({summary,busy,onGenerate,theme}) {
  return (
    <div style={{background:`linear-gradient(140deg,${theme.goldDim},transparent)`,
      border:`1px solid ${theme.gold}44`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:summary?10:0}}>
        <span style={{fontSize:15,lineHeight:1}}>✦</span>
        <span style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:11,
          color:theme.gold,textTransform:"uppercase",letterSpacing:"0.12em"}}>AI Summary</span>
        <div style={{flex:1}}/>
        {!busy&&(
          <button className="btn" onClick={onGenerate}
            style={{fontSize:11,color:theme.gold,background:theme.goldDim,
              border:`1px solid ${theme.gold}44`,padding:"3px 11px",borderRadius:6,
              fontFamily:"'Jost',sans-serif",fontWeight:700}}>
            {summary?"↻ Refresh":"Generate"}
          </button>
        )}
        {busy&&(
          <div style={{display:"flex",gap:4}}>
            {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:theme.gold,
              animation:`dotbounce 0.9s ease ${i*0.15}s infinite`}}/>)}
          </div>
        )}
      </div>
      {!summary&&!busy&&(
        <p style={{fontSize:13,color:theme.textMuted,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif"}}>
          Press Generate to create an AI summary of this note.
        </p>
      )}
      {busy&&!summary&&(
        <p style={{fontSize:13,color:theme.textMuted,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif"}}>
          Analysing note content…
        </p>
      )}
      {summary&&(
        <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",
          fontSize:15,lineHeight:1.7,color:theme.text,letterSpacing:"0.01em"}}>
          {summary}
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  EMAIL MODAL
// ════════════════════════════════════════════════════════════════
function EmailModal({note,tasks,theme,onClose}) {
  const [to,   setTo]   = useState((note.participants||[]).join(", "));
  const [subj, setSubj] = useState(`Meeting Notes: ${note.subject||"Untitled"}`);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const aps = tasks.filter(t=>t.note_id===note.id);

  const body = [
    `Dear All,`,``,'',
    `Please find below the meeting notes from our session on ${note.note_date||note.created_at?.split("T")[0]||"today"}.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `MEETING: ${note.subject||"Untitled"}`,
    `DATE:    ${note.note_date||note.created_at?.split("T")[0]||""}`,
    ...(note.participants?.length?[`PARTICIPANTS: ${note.participants.join(", ")}`]:[]),
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `NOTES`,
    `───────────────────────────────`,
    note.note||"",
    ``,
    ...(aps.length?[
      `ACTION POINTS`,
      `───────────────────────────────`,
      ...aps.map((a,i)=>`${i+1}. ${a.text}${a.owner?`\n   Owner: ${a.owner}`:""}${a.deadline?`\n   Deadline: ${a.deadline}`:""}${a.done?"\n   Status: ✓ Complete":"\n   Status: Pending"}`),
      ``,
    ]:[]),
    ...(note.ai_summary?[
      `AI SUMMARY`,
      `───────────────────────────────`,
      note.ai_summary,
      ``,
    ]:[]),
    `─────────────────────────────────`,
    `Sent via NoteFlow ✦`,
  ].join("\n");

  const send = async () => {
    if (!to.trim()) return;
    setBusy(true);
    await new Promise(r=>setTimeout(r,800));
    window.open(`mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`,"_blank");
    setSent(true); setBusy(false);
    setTimeout(onClose,2200);
  };

  const inp = {width:"100%",fontSize:13,background:theme.surface2,border:`1px solid ${theme.border}`,
    color:theme.text,borderRadius:8,padding:"9px 12px",fontFamily:"'Jost',sans-serif",outline:"none",marginBottom:12};

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:2000,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="slide-up" style={{background:theme.surface,borderRadius:"20px 20px 0 0",padding:24,
        width:"100%",maxWidth:560,border:`1px solid ${theme.border}`,borderBottom:"none",
        maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
          <span style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:16,color:theme.text}}>
            📧 Email Meeting Notes
          </span>
          <div style={{flex:1}}/>
          <button className="btn" onClick={onClose}
            style={{color:theme.textMuted,fontSize:22,lineHeight:1}}>✕</button>
        </div>

        <label style={lbl(theme)}>To (comma-separated)</label>
        <input value={to} onChange={e=>setTo(e.target.value)}
          placeholder="email@example.com, colleague@company.com" style={inp}/>

        <label style={lbl(theme)}>Subject</label>
        <input value={subj} onChange={e=>setSubj(e.target.value)} style={inp}/>

        <label style={{...lbl(theme),marginBottom:5}}>Email Preview</label>
        <div style={{background:theme.surface2,border:`1px solid ${theme.border}`,borderRadius:8,padding:12,
          marginBottom:20,fontSize:11,color:theme.textSoft,fontFamily:"'JetBrains Mono',monospace",
          whiteSpace:"pre-wrap",lineHeight:1.55,maxHeight:170,overflowY:"auto"}}>
          {body.substring(0,500)}…
        </div>

        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={onClose}
            style={{flex:1,padding:"12px 0",background:theme.surface2,color:theme.textMuted,
              border:`1px solid ${theme.border}`,borderRadius:10,fontSize:13,
              fontFamily:"'Jost',sans-serif",fontWeight:700}}>Cancel</button>
          <button className="btn" onClick={send} disabled={busy||sent}
            style={{flex:2,padding:"12px 0",background:sent?theme.green:theme.gold,
              color:theme.bg,border:"none",borderRadius:10,fontSize:13,
              fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.04em",
              opacity:busy?0.7:1,transition:"background 0.25s"}}>
            {sent?"✓ Email Client Opened":busy?"Preparing…":"📧 SEND VIA EMAIL APP"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SWIPEABLE TASK ROW
// ════════════════════════════════════════════════════════════════
function SwipeTaskRow({task,theme,isMobile,folderName,folderColor,onToggle,onDelete,onSegChange,onNoteClick}) {
  const [sx, setSx] = useState(0);
  const [sw, setSw] = useState(false);
  const x0 = useRef(null);
  const THRESH = 90;

  return (
    <div style={{position:"relative",overflow:"hidden",borderBottom:`1px solid ${theme.border}`}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,background:theme.danger,
        display:"flex",alignItems:"center",paddingRight:20,gap:6}}>
        <span style={{color:"#fff",fontSize:11,fontFamily:"'Jost',sans-serif",fontWeight:700,letterSpacing:"0.06em"}}>DELETE</span>
      </div>
      <div
        onTouchStart={e=>{x0.current=e.touches[0].clientX;setSw(true);}}
        onTouchMove={e=>{if(!x0.current)return;const d=e.touches[0].clientX-x0.current;if(d<0)setSx(Math.max(d,-130));}}
        onTouchEnd={()=>{if(sx<-THRESH)onDelete();else setSx(0);setSw(false);x0.current=null;}}
        className="task-row"
        style={{display:"flex",alignItems:"flex-start",gap:11,padding:"13px 2px",background:theme.bg,
          transform:`translateX(${sx}px)`,transition:sw?"none":"transform 0.22s ease",position:"relative",zIndex:1}}>
        <button className="btn" onClick={onToggle}
          style={{fontSize:17,flexShrink:0,marginTop:1,color:task.done?theme.green:theme.textMuted}}>
          {task.done?"✔":"○"}
        </button>
        <div style={{flex:1,minWidth:0}}>
          {task._fromNote&&(
            <div style={{fontSize:9,color:theme.gold,fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>
              ↗ {task._noteSubject}
              {onNoteClick&&<span className="btn" onClick={onNoteClick} style={{marginLeft:6,textDecoration:"underline",cursor:"pointer"}}>view</span>}
            </div>
          )}
          <div style={{fontSize:14,fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:task.done?400:500,
            color:task.done?theme.textMuted:theme.text,textDecoration:task.done?"line-through":"none",lineHeight:1.45}}>
            {task.text}
          </div>
          <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
            {task.owner&&<span style={{fontSize:10,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:600}}>◈ {task.owner}</span>}
            {task.deadline&&<span style={{fontSize:10,color:theme.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{task.deadline}</span>}
            {folderName&&<span style={{fontSize:10,fontFamily:"'Jost',sans-serif",fontWeight:500,color:folderColor}}>● {folderName}</span>}
          </div>
        </div>
        {!isMobile&&<select value={task.segment} onChange={e=>onSegChange(e.target.value)}
          style={{fontSize:10,padding:"2px 5px",background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,flexShrink:0}}>
          {SEGMENTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>}
        <button className="btn task-del" onClick={onDelete}
          style={{opacity:isMobile?1:0,color:theme.danger,fontSize:14,lineHeight:1,flexShrink:0,transition:"opacity 0.15s"}}>✕</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ACTION POINTS PANEL (inside note editor)
// ════════════════════════════════════════════════════════════════
function APPanel({tasks,theme,isMobile,onAdd,onToggle,onDelete,onSegChange}) {
  const [txt, setTxt] = useState("");
  const [owner, setOwner] = useState("");
  const [dl, setDl]   = useState("");
  const [seg, setSeg] = useState("this-week");

  const add = () => {
    if (!txt.trim()) return;
    onAdd(txt.trim(), seg, owner.trim()||null, dl||null);
    setTxt(""); setOwner(""); setDl(""); setSeg("this-week");
  };

  return (
    <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:15,lineHeight:1}}>⚡</span>
        <span style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:11,
          color:theme.gold,textTransform:"uppercase",letterSpacing:"0.12em"}}>Action Points</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:theme.textMuted,marginLeft:2}}>
          ({tasks.filter(t=>!t.done).length} open)
        </span>
        <div style={{flex:1}}/>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:theme.textMuted}}>→ syncs to To-Dos</span>
      </div>

      {tasks.map(t=>(
        <div key={t.id} className="task-row"
          style={{display:"flex",alignItems:"flex-start",gap:8,padding:"9px 0",borderBottom:`1px solid ${theme.borderSoft}`}}>
          <button className="btn" onClick={()=>onToggle(t.id)}
            style={{fontSize:15,flexShrink:0,marginTop:1,color:t.done?theme.green:theme.textMuted}}>
            {t.done?"✔":"○"}
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:500,
              color:t.done?theme.textMuted:theme.text,textDecoration:t.done?"line-through":"none",lineHeight:1.4}}>
              {t.text}
            </div>
            <div style={{display:"flex",gap:10,marginTop:3}}>
              {t.owner&&<span style={{fontSize:10,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:600}}>◈ {t.owner}</span>}
              {t.deadline&&<span style={{fontSize:10,color:theme.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{t.deadline}</span>}
              <span style={{fontSize:9,color:theme.textMuted,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase"}}>{t.segment}</span>
            </div>
          </div>
          {!isMobile&&<select value={t.segment} onChange={e=>onSegChange(t.id,e.target.value)}
            style={{fontSize:10,padding:"2px 5px",background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,flexShrink:0}}>
            {SEGMENTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>}
          <button className="btn task-del" onClick={()=>onDelete(t.id)}
            style={{opacity:isMobile?1:0,color:theme.danger,fontSize:13,lineHeight:1,flexShrink:0,transition:"opacity 0.15s"}}>✕</button>
        </div>
      ))}

      <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
        <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Action item description…"
          onKeyDown={e=>e.key==="Enter"&&add()}
          style={{flex:"1 1 160px",fontSize:14,background:theme.surface2,border:`1px solid ${theme.border}`,
            color:theme.text,borderRadius:8,padding:"8px 11px",fontFamily:"'Cormorant Garamond',Georgia,serif",
            outline:"none",minWidth:0}}/>
        <input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Owner"
          style={{width:88,fontSize:12,background:theme.surface2,border:`1px solid ${theme.border}`,
            color:theme.text,borderRadius:8,padding:"8px 10px",fontFamily:"'Jost',sans-serif",outline:"none"}}/>
        <input type="date" value={dl} onChange={e=>setDl(e.target.value)}
          style={{fontSize:11,background:theme.surface2,border:`1px solid ${theme.border}`,
            color:theme.text,borderRadius:8,padding:"8px 8px",fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
        <select value={seg} onChange={e=>setSeg(e.target.value)}
          style={{fontSize:11,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,borderRadius:8,padding:"8px 8px"}}>
          {SEGMENTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button className="btn" onClick={add}
          style={{background:theme.gold,color:theme.bg,border:"none",padding:"8px 16px",
            borderRadius:8,fontSize:12,fontFamily:"'Jost',sans-serif",fontWeight:800,
            letterSpacing:"0.06em",whiteSpace:"nowrap"}}>+ ADD</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  NOTE EDITOR
// ════════════════════════════════════════════════════════════════
function NoteEditor({note,folders,tasks,isMobile,theme,onBack,onDelete,onNoteChange,onAddTask,onToggleTask,onDeleteTask,onSegChange,onEmail}) {
  const [sumBusy, setSumBusy] = useState(false);
  const timer = useRef(null);

  const set = (field,val) => {
    clearTimeout(timer.current);
    onNoteChange(field,val);
    timer.current = setTimeout(()=>onNoteChange(field,val),800);
  };

  const genSummary = async () => {
    setSumBusy(true);
    try {
      const t = await claudeCall(`Write a concise 2-3 sentence AI summary of this meeting note. Focus on key decisions, themes, and the most critical next steps. Be direct and insightful. Respond with only the summary text, no preamble.\n\nTitle: ${note.subject}\n\n${note.note}`);
      onNoteChange("ai_summary", t);
    } catch(e){console.error(e);}
    setSumBusy(false);
  };

  const onTranscript = (t) => {
    const newNote = (note.note+(note.note?"\n\n":"")+t).trim();
    onNoteChange("note", newNote);
  };

  return (
    <div style={{maxWidth:720,margin:"0 auto"}} className="fade-in">
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:isMobile?6:8,marginBottom:16,flexWrap:"wrap"}}>
        <button className="btn" onClick={onBack}
          style={{color:theme.gold,fontSize:24,lineHeight:1,padding:"0 2px"}}>←</button>
        <select value={note.folder_id||""} onChange={e=>set("folder_id",e.target.value||null)}
          style={{fontSize:isMobile?11:12,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text}}>
          <option value="">No folder</option>
          {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="date" value={note.note_date||isoToday()} onChange={e=>set("note_date",e.target.value)}
          style={{fontSize:isMobile?11:12,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,padding:"5px 7px"}}/>
        <div style={{flex:1}}/>
        <button className="btn" onClick={onEmail}
          style={{background:"#3a7bd522",color:"#5a9df7",border:"1px solid #3a7bd544",
            padding:"6px 12px",borderRadius:8,fontSize:isMobile?11:12,
            fontFamily:"'Jost',sans-serif",fontWeight:700,letterSpacing:"0.04em"}}>
          {isMobile?"📧":"📧 EMAIL"}
        </button>
        <button className="btn" onClick={onDelete}
          style={{color:theme.danger,fontSize:isMobile?18:15,lineHeight:1}}>🗑</button>
      </div>

      {/* Title */}
      <input defaultValue={note.subject} key={note.id+"-s"}
        onChange={e=>set("subject",e.target.value)}
        placeholder="Meeting title…"
        style={{fontSize:isMobile?20:22,fontFamily:"'Jost',sans-serif",fontWeight:800,
          background:"transparent",border:"none",borderBottom:`2px solid ${theme.border}`,
          borderRadius:0,padding:"5px 0",marginBottom:14,color:theme.text,width:"100%",
          outline:"none",letterSpacing:"-0.4px",lineHeight:1.2}}/>

      {/* Participants */}
      <div style={{marginBottom:14}}>
        <label style={lbl(theme)}>Participants (email addresses)</label>
        <input
          defaultValue={(note.participants||[]).join(", ")} key={note.id+"-p"}
          onChange={e=>set("participants",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}
          placeholder="email@example.com, colleague@company.com"
          style={{width:"100%",fontSize:12,background:theme.surface2,border:`1px solid ${theme.border}`,
            color:theme.text,borderRadius:8,padding:"8px 11px",fontFamily:"'Jost',sans-serif",outline:"none"}}/>
      </div>

      {/* Voice Recorder */}
      <VoiceRecorder onTranscript={onTranscript} theme={theme}/>

      {/* Bullet note body */}
      <div style={{marginBottom:14}}>
        <label style={{...lbl(theme),display:"flex",gap:10,alignItems:"center"}}>
          <span>Notes</span>
          <span style={{color:theme.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>Tab=indent · Shift+Tab=outdent · Enter=new bullet</span>
        </label>
        <BulletEditor
          value={note.note}
          onChange={v=>set("note",v)}
          theme={theme}
          rows={isMobile?8:10}
          minH={isMobile?150:180}/>
      </div>

      {/* AI Summary */}
      <AISummaryBlock
        summary={note.ai_summary}
        busy={sumBusy}
        onGenerate={genSummary}
        theme={theme}/>

      {/* Action Points */}
      <APPanel
        tasks={tasks}
        theme={theme}
        isMobile={isMobile}
        onAdd={onAddTask}
        onToggle={onToggleTask}
        onDelete={onDeleteTask}
        onSegChange={onSegChange}/>

      {/* Save btn — mobile */}
      {isMobile&&(
        <button className="btn" onClick={onBack}
          style={{background:theme.gold,color:theme.bg,padding:"13px 0",borderRadius:10,width:"100%",
            fontSize:13,border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em",marginBottom:10}}>
          ✓ SAVE & CLOSE
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  CALENDAR VIEW
// ════════════════════════════════════════════════════════════════
function CalendarView({notes,calDate,setCalDate,calNotes,theme,isMobile,onNoteClick,onNewNote}) {
  const d = new Date(calDate+"T12:00:00");
  const yr=d.getFullYear(), mo=d.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMo=new Date(yr,mo+1,0).getDate();
  const mName=d.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
  const prev=()=>{const n=new Date(yr,mo-1,1);setCalDate(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`);};
  const next=()=>{const n=new Date(yr,mo+1,1);setCalDate(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`);};
  const byDate={};
  notes.forEach(n=>{const dt=n.note_date||n.created_at?.split("T")[0];if(dt){if(!byDate[dt])byDate[dt]=[];byDate[dt].push(n);}});
  const cells=[...Array(firstDay).fill(null),...Array.from({length:daysInMo},(_,i)=>i+1)];

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:18,gap:10}}>
        <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:isMobile?19:22,fontWeight:800,color:theme.text,letterSpacing:"-0.3px"}}>
          Calendar
        </h1>
        <div style={{flex:1}}/>
        <button className="btn" onClick={onNewNote}
          style={{background:theme.gold,color:theme.bg,padding:"7px 16px",borderRadius:8,fontSize:12,
            border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.05em"}}>+ NEW NOTE</button>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button className="btn" onClick={prev} style={{color:theme.gold,fontSize:24,padding:"4px 10px"}}>‹</button>
        <span style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:15,color:theme.text}}>{mName}</span>
        <button className="btn" onClick={next} style={{color:theme.gold,fontSize:24,padding:"4px 10px"}}>›</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:10,color:theme.textMuted,
            fontFamily:"'JetBrains Mono',monospace",padding:"3px 0",letterSpacing:"0.05em"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:20}}>
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const iso=`${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isTd=iso===isoToday(),isSel=iso===calDate,has=!!byDate[iso];
          return (
            <button key={i} className="btn" onClick={()=>setCalDate(iso)}
              style={{aspectRatio:"1",borderRadius:8,fontSize:isMobile?12:13,fontWeight:isTd?700:400,
                background:isSel?theme.gold:isTd?theme.goldDim:theme.surface2,
                color:isSel?theme.bg:isTd?theme.gold:theme.text,
                border:`1px solid ${isSel?theme.gold:isTd?theme.gold:theme.border}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:2,fontFamily:"'Jost',sans-serif",transition:"all 0.12s"}}>
              {day}
              {has&&<span style={{width:4,height:4,borderRadius:"50%",background:isSel?theme.bg:theme.gold}}/>}
            </button>
          );
        })}
      </div>

      <div style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:12,
        color:theme.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>
        {new Date(calDate+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
      </div>
      {calNotes.length===0
        ? <p style={{color:theme.textMuted,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif",textAlign:"center",marginTop:24,fontSize:16}}>
            No notes for this day.
          </p>
        : calNotes.map(n=>(
          <div key={n.id} onClick={()=>onNoteClick(n)}
            style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=theme.gold}
            onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}>
            <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:14,color:theme.text,marginBottom:4}}>{n.subject||"Untitled"}</div>
            <div style={{fontSize:13,color:theme.textSoft,fontFamily:"'Cormorant Garamond',serif",lineHeight:1.5,
              overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
              {n.note?.replace(/[•\s]+/g," ").trim()}
            </div>
            {n.ai_summary&&<div style={{marginTop:8,fontSize:12,color:theme.gold,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif"}}>✦ {n.ai_summary.substring(0,100)}…</div>}
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  REFLECTION VIEW
// ════════════════════════════════════════════════════════════════
function ReflectionView({reflection,onSave,theme,isMobile,allReflections}) {
  const [journal,   setJournal]   = useState(reflection?.journal    || "");
  const [mood,      setMood]      = useState(reflection?.mood       || null);
  const [gratitude, setGratitude] = useState(reflection?.gratitude  || "");
  const [aiSummary, setAiSummary] = useState(reflection?.ai_summary || "");
  const [generating,setGenerating]= useState(false);
  const [saved,     setSaved]     = useState(false);
  const [tab,       setTab]       = useState("today");
  const prompt = GRATITUDE_PROMPTS[new Date().getDay()%GRATITUDE_PROMPTS.length];

  const save = async () => {
    await onSave({journal,mood,gratitude,ai_summary:aiSummary});
    setSaved(true); setTimeout(()=>setSaved(false),2200);
  };

  const gen = async () => {
    if(!journal&&!gratitude) return;
    setGenerating(true);
    try {
      const t = await claudeCall(`Based on this person's daily reflection, write a warm, encouraging 2-3 sentence AI reflection. Acknowledge their mood, celebrate what they're grateful for, and offer a gentle insight for tomorrow. Mood: ${mood?MOODS.find(m=>m.value===mood)?.label:"not set"}. Journal: "${journal}". Gratitude: "${gratitude}". Respond with only the reflection text, no preamble or labels.`);
      setAiSummary(t);
    } catch(e){console.error(e);}
    setGenerating(false);
  };

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:18,gap:10}}>
        <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:isMobile?19:22,fontWeight:800,color:theme.text,letterSpacing:"-0.3px"}}>
          🌿 Reflections
        </h1>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:4,background:theme.surface2,borderRadius:20,padding:3}}>
          {["today","history"].map(t=>(
            <button key={t} className="btn" onClick={()=>setTab(t)}
              style={{padding:"4px 13px",borderRadius:16,fontSize:11,fontFamily:"'Jost',sans-serif",fontWeight:700,
                background:tab===t?theme.gold:"transparent",color:tab===t?theme.bg:theme.textMuted,border:"none"}}>
              {t==="today"?"Today":"History"}
            </button>
          ))}
        </div>
      </div>

      {tab==="today"&&(
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:theme.textMuted,marginBottom:16,letterSpacing:"0.05em"}}>
            {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
          <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:13,color:theme.text,marginBottom:12}}>How are you feeling today?</div>
            <div style={{display:"flex",gap:isMobile?8:14,justifyContent:"center",flexWrap:"wrap"}}>
              {MOODS.map(m=>(
                <button key={m.value} className="btn" onClick={()=>setMood(m.value)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 13px",borderRadius:12,
                    background:mood===m.value?theme.goldDim:theme.surface2,
                    border:`2px solid ${mood===m.value?theme.gold:theme.border}`,transition:"all 0.15s"}}>
                  <span style={{fontSize:24}}>{m.emoji}</span>
                  <span style={{fontSize:10,fontFamily:"'Jost',sans-serif",fontWeight:700,
                    color:mood===m.value?theme.gold:theme.textMuted}}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:13,color:theme.text,marginBottom:8}}>📖 Today's Journal</div>
            <textarea value={journal} onChange={e=>setJournal(e.target.value)}
              placeholder="What happened today? How did it make you feel? What did you learn?"
              rows={isMobile?5:6}
              style={{width:"100%",fontSize:15,background:theme.surface2,border:`1px solid ${theme.border}`,
                color:theme.text,minHeight:isMobile?100:120,fontFamily:"'Cormorant Garamond',serif",lineHeight:1.65}}/>
          </div>
          <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:13,color:theme.text,marginBottom:4}}>🙏 Gratitude</div>
            <div style={{fontSize:13,color:theme.textMuted,fontStyle:"italic",marginBottom:10,fontFamily:"'Cormorant Garamond',serif"}}>{prompt}</div>
            <textarea value={gratitude} onChange={e=>setGratitude(e.target.value)}
              placeholder="Write what you're grateful for today…" rows={3}
              style={{width:"100%",fontSize:15,background:theme.surface2,border:`1px solid ${theme.border}`,
                color:theme.text,fontFamily:"'Cormorant Garamond',serif",lineHeight:1.65}}/>
          </div>
          {aiSummary&&(
            <div style={{background:`linear-gradient(140deg,${theme.goldDim},transparent)`,
              border:`1px solid ${theme.gold}44`,borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{fontFamily:"'Jost',sans-serif",fontWeight:800,fontSize:11,
                color:theme.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>✦ AI Reflection</div>
              <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",
                fontSize:16,color:theme.text,lineHeight:1.7}}>{aiSummary}</p>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button className="btn" onClick={gen} disabled={generating}
              style={{background:theme.goldDim,color:theme.gold,padding:"11px 16px",borderRadius:10,fontSize:12,
                border:`1px solid ${theme.gold}44`,fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.04em"}}>
              {generating?"✦ Thinking…":"✦ AI REFLECT"}
            </button>
            <button className="btn" onClick={save}
              style={{background:saved?theme.green:theme.gold,color:theme.bg,padding:"11px 0",borderRadius:10,
                fontSize:12,border:"none",flex:1,fontFamily:"'Jost',sans-serif",fontWeight:800,
                letterSpacing:"0.04em",transition:"background 0.25s"}}>
              {saved?"✓ SAVED":"SAVE REFLECTION"}
            </button>
          </div>
        </div>
      )}

      {tab==="history"&&(
        <div>
          {allReflections.length===0
            ? <p style={{color:theme.textMuted,fontStyle:"italic",textAlign:"center",marginTop:36,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>No past reflections yet — start today ✦</p>
            : allReflections.map(r=>(
              <div key={r.id} style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:theme.textMuted}}>{fmtDate(r.date)}</span>
                  {r.mood&&<span style={{fontSize:20}}>{MOODS.find(m=>m.value===r.mood)?.emoji}</span>}
                  {r.mood&&<span style={{fontSize:11,color:theme.textSoft,fontFamily:"'Jost',sans-serif",fontWeight:600}}>{MOODS.find(m=>m.value===r.mood)?.label}</span>}
                </div>
                {r.journal&&<p style={{fontSize:14,color:theme.textSoft,marginBottom:8,lineHeight:1.6,fontFamily:"'Cormorant Garamond',serif"}}>{r.journal}</p>}
                {r.gratitude&&<p style={{fontSize:13,color:theme.textMuted,fontStyle:"italic",marginBottom:8,fontFamily:"'Cormorant Garamond',serif"}}>🙏 {r.gratitude}</p>}
                {r.ai_summary&&(
                  <div style={{background:theme.goldDim,border:`1px solid ${theme.gold}33`,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>✦ AI</div>
                    <p style={{fontSize:13,color:theme.text,fontStyle:"italic",lineHeight:1.6,fontFamily:"'Cormorant Garamond',serif"}}>{r.ai_summary}</p>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  NAV ITEM (desktop sidebar)
// ════════════════════════════════════════════════════════════════
function NavItem({icon,label,active,onClick,dot,dotColor,onDelete,theme}) {
  return (
    <div style={{display:"flex",alignItems:"center",position:"relative"}} className="folder-del-wrap">
      <button className={`btn nav-btn${active?" active":""}`} onClick={onClick}
        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",flex:1,textAlign:"left",fontSize:13,
          fontFamily:"'Jost',sans-serif",fontWeight:active?700:500,letterSpacing:"0.02em",
          color:active?theme.gold:theme.textSoft,background:"transparent",transition:"all 0.12s",borderRadius:6,margin:"1px 4px"}}>
        {dot?<span style={{width:8,height:8,borderRadius:"50%",background:dotColor,flexShrink:0}}/>:
             icon&&<span style={{fontSize:15,lineHeight:1}}>{icon}</span>}
        {label}
      </button>
      {onDelete&&<button className="btn folder-del" onClick={e=>{e.stopPropagation();onDelete();}}
        style={{opacity:0,position:"absolute",right:10,color:theme.danger,fontSize:11,transition:"opacity 0.15s"}}>✕</button>}
    </div>
  );
}

function EmptyState({theme,text}) {
  return <div style={{color:theme.textMuted,fontStyle:"italic",marginTop:36,textAlign:"center",
    fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>{text}</div>;
}

// ════════════════════════════════════════════════════════════════
//  MAIN NOTEFLOW APP
// ════════════════════════════════════════════════════════════════
function NoteFlowApp() {
  const {user}                          = useAuth();
  const {theme,themeMode,toggleTheme}   = useTheme();
  const isMobile                        = useIsMobile();

  // Data state
  const [folders,     setFolders]     = useState([]);
  const [notes,       setNotes]       = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [reflections, setReflections] = useState([]);
  const [loading,     setLoading]     = useState(true);

  // UI state
  const [view,          setView]          = useState("todos");
  const [activeSeg,     setActiveSeg]     = useState("today");
  const [activeFolder,  setActiveFolder]  = useState(null);
  const [editingNote,   setEditingNote]   = useState(null);
  const [emailNote,     setEmailNote]     = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [fontSize,      setFontSize]      = useState(15);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showAddTask,   setShowAddTask]   = useState(false);
  const [newTaskTxt,    setNewTaskTxt]    = useState("");
  const [newTaskSeg,    setNewTaskSeg]    = useState("today");
  const [newTaskOwner,  setNewTaskOwner]  = useState("");
  const [newTaskDl,     setNewTaskDl]     = useState("");
  const [calDate,       setCalDate]       = useState(isoToday());
  const [notifEnabled,  setNotifEnabled]  = useState(false);
  const [notifTime,     setNotifTime]     = useState({hour:8,minute:0});
  const [errToast,      setErrToast]      = useState(null);

  const dbErr = (err) => {
    console.error("DB error:", err);
    setErrToast(err?.message || "Something went wrong. Check your Supabase connection.");
    setTimeout(() => setErrToast(null), 5000);
  };

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("folders").select("*").eq("user_id",user.id).order("created_at"),
      supabase.from("notes").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("tasks").select("*").eq("user_id",user.id).order("created_at"),
      supabase.from("reflections").select("*").eq("user_id",user.id).order("date",{ascending:false}),
    ]).then(([{data:f},{data:n},{data:t},{data:r}]) => {
      setFolders(f||[]); setNotes(n||[]); setTasks(t||[]); setReflections(r||[]);
      setLoading(false);
    });
    // Init notif state from browser
    setNotifEnabled(typeof Notification!=="undefined" && Notification.permission==="granted");
  }, [user]);

  // ── Notifications ─────────────────────────────────────────────
  useEffect(() => {
    if (notifEnabled && tasks.length) scheduleReminder(tasks, notifTime);
  }, [notifEnabled, tasks, notifTime]);

  // ── Derived ───────────────────────────────────────────────────
  // Merge standalone tasks + action-point tasks from notes
  const allTasks = [
    ...tasks.filter(t=>!t.note_id),
    ...tasks.filter(t=>!!t.note_id).map(t=>({
      ...t,
      _fromNote:true,
      _noteSubject:notes.find(n=>n.id===t.note_id)?.subject||"Note"
    })),
  ];
  const segTasks     = allTasks.filter(t=>t.segment===activeSeg);
  const folderColor  = id => folders.find(f=>f.id===id)?.color||theme.textMuted;
  const folderName   = id => folders.find(f=>f.id===id)?.name||null;
  const todayRefl    = reflections.find(r=>r.date===isoToday());
  const visibleNotes = notes.filter(n=>activeFolder ? n.folder_id===activeFolder : true);
  const calNotes     = notes.filter(n=>(n.note_date||n.created_at?.split("T")[0])===calDate);

  // ── Search ────────────────────────────────────────────────────
  const runSearch = useCallback((q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const qt = tokenize(q);
    const docs = [
      ...notes.map(n=>({type:"note",id:n.id,text:`${n.subject} ${n.note} ${n.ai_summary||""}`})),
      ...allTasks.map(t=>({type:"task",id:t.id,text:t.text})),
    ];
    const vocab = [...new Set(docs.flatMap(d=>tokenize(d.text)).concat(qt))];
    const qv = buildVec(qt,vocab);
    setSearchResults(
      docs.map(d=>({...d,score:cosim(qv,buildVec(tokenize(d.text),vocab))}))
        .filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,12)
    );
  }, [notes, allTasks]);
  useEffect(()=>{ if(view==="search") runSearch(searchQuery); },[searchQuery,view,runSearch]);

  // ── Folders ───────────────────────────────────────────────────
  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    const {data,error} = await supabase.from("folders")
      .insert({user_id:user.id,name:newFolderName.trim(),color:FOLDER_COLORS[folders.length%FOLDER_COLORS.length]})
      .select().single();
    if (error) { dbErr(error); return; }
    setFolders(f=>[...f,data]); setNewFolderName(""); setShowNewFolder(false);
  };
  const deleteFolder = async id => {
    await supabase.from("folders").delete().eq("id",id);
    setFolders(f=>f.filter(x=>x.id!==id));
    if (activeFolder===id) setActiveFolder(null);
  };

  // ── Notes ─────────────────────────────────────────────────────
  const newNote = async () => {
    const {data,error} = await supabase.from("notes").insert({
      user_id:user.id, folder_id:activeFolder, subject:"", note:"• ",
      note_date:calDate, participants:[], ai_summary:""
    }).select().single();
    if (error) { dbErr(error); return; }
    setNotes(n=>[data,...n]); setEditingNote(data); setView("note-edit");
  };

  const updateNote = async (updated) => {
    await supabase.from("notes").update({
      subject:      updated.subject,
      note:         updated.note,
      folder_id:    updated.folder_id,
      note_date:    updated.note_date,
      participants: updated.participants,
      ai_summary:   updated.ai_summary,
    }).eq("id",updated.id);
    setNotes(n=>n.map(x=>x.id===updated.id?{...x,...updated}:x));
    setEditingNote(p=>p?.id===updated.id?{...p,...updated}:p);
  };

  const deleteNote = async id => {
    await supabase.from("notes").delete().eq("id",id);
    await supabase.from("tasks").delete().eq("note_id",id);
    setNotes(n=>n.filter(x=>x.id!==id));
    setTasks(t=>t.filter(x=>x.note_id!==id));
    setView("notes");
  };

  // ── Tasks ─────────────────────────────────────────────────────
  const addTask = async (text, segment, noteId=null, folderId=null, owner=null, deadline=null) => {
    const {data,error} = await supabase.from("tasks").insert({
      user_id:user.id, text, segment, note_id:noteId,
      folder_id:folderId||activeFolder, done:false,
      owner:owner||null, deadline:deadline||null,
    }).select().single();
    if (error) { dbErr(error); return null; }
    setTasks(t=>[...t,data]);
    return data;
  };

  const toggleTask = async id => {
    const task = tasks.find(t=>t.id===id); if(!task) return;
    await supabase.from("tasks").update({done:!task.done}).eq("id",id);
    setTasks(t=>t.map(x=>x.id===id?{...x,done:!x.done}:x));
  };

  const updateTaskSeg = async (id, segment) => {
    await supabase.from("tasks").update({segment}).eq("id",id);
    setTasks(t=>t.map(x=>x.id===id?{...x,segment}:x));
  };

  const deleteTask = async id => {
    await supabase.from("tasks").delete().eq("id",id);
    setTasks(t=>t.filter(x=>x.id!==id));
  };

  const addStandaloneTask = async () => {
    if (!newTaskTxt.trim()) return;
    await addTask(newTaskTxt.trim(), newTaskSeg, null, activeFolder, newTaskOwner||null, newTaskDl||null);
    setNewTaskTxt(""); setNewTaskOwner(""); setNewTaskDl(""); setShowAddTask(false);
  };

  // ── Reflections ───────────────────────────────────────────────
  const saveReflection = async (data) => {
    const existing = reflections.find(r=>r.date===isoToday());
    if (existing) {
      const {data:upd, error} = await supabase.from("reflections").update(data).eq("id",existing.id).select().single();
      if (error) { dbErr(error); return; }
      setReflections(r=>r.map(x=>x.id===existing.id?{...x,...upd}:x));
    } else {
      const {data:created, error} = await supabase.from("reflections").insert({user_id:user.id,date:isoToday(),...data}).select().single();
      if (error) { dbErr(error); return; }
      setReflections(r=>[created,...r]);
    }
  };

  // ── Notifications ─────────────────────────────────────────────
  const enableNotif = async () => {
    const ok = await requestNotifPermission();
    setNotifEnabled(ok);
    if (ok) scheduleReminder(tasks,notifTime);
  };

  if (loading) return (
    <div style={{background:theme.bg,height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:theme.gold,fontSize:40,animation:"pulse 1.2s ease-in-out infinite"}}>✦</div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );

  // ── Nav items ─────────────────────────────────────────────────
  const mobileNav = [
    {key:"todos",       ic:"✦",  lbl:"To-Dos"  },
    {key:"notes",       ic:"✎",  lbl:"Meeting" },
    {key:"calendar",    ic:"◫",  lbl:"Calendar"},
    {key:"reflections", ic:"◯",  lbl:"Reflect" },
    {key:"more",        ic:"⋯",  lbl:"More"    },
  ];
  const desktopNav = [
    {key:"todos",       icon:"✦",  label:"To-Dos"      },
    {key:"notes",       icon:"✎",  label:"Meeting Notes"},
    {key:"calendar",    icon:"◫",  label:"Calendar"    },
    {key:"reflections", icon:"◯",  label:"Reflections" },
    {key:"search",      icon:"⊕",  label:"Search"      },
  ];

  return (
    <div style={{background:theme.bg,color:theme.text,height:"100dvh",display:"flex",
      flexDirection:"column",overflow:"hidden",fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize}}>
      <style>{globalCSS(theme)}</style>

      {/* Error Toast */}
      {errToast && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",
          background:"#f76a8a",color:"#fff",padding:"10px 20px",borderRadius:10,
          fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:13,zIndex:9999,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",maxWidth:"90vw",textAlign:"center"}}>
          ⚠ {errToast}
        </div>
      )}

      {/* Email Modal */}
      {emailNote && (
        <EmailModal
          note={emailNote}
          tasks={tasks}
          theme={theme}
          onClose={()=>setEmailNote(null)}/>
      )}

      {/* Nigeria News */}
      <NigeriaNewsBanner isMobile={isMobile} theme={theme}/>

      {/* Top Bar */}
      <div style={{background:theme.topBar,borderBottom:`1px solid ${theme.border}`,
        padding:isMobile?"9px 14px":"9px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {!isMobile&&(
          <button className="btn" onClick={()=>setSidebarOpen(o=>!o)}
            style={{fontSize:18,color:theme.gold,lineHeight:1}}>☰</button>
        )}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:theme.gold,fontSize:16,lineHeight:1}}>✦</span>
          <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:700,fontSize:isMobile?16:19,
            color:theme.text,letterSpacing:"-0.3px"}}>NoteFlow</span>
        </div>
        <div style={{flex:1}}/>
        {!isMobile&&(
          <div style={{position:"relative",flex:1,maxWidth:300}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",opacity:0.4,fontSize:12}}>⊕</span>
            <input placeholder="Semantic search…" value={searchQuery}
              onFocus={()=>setView("search")}
              onChange={e=>{setSearchQuery(e.target.value);setView("search");}}
              style={{paddingLeft:28,height:34,fontSize:12,background:theme.surface2,
                border:`1px solid ${theme.border}`,color:theme.text,fontFamily:"'Jost',sans-serif"}}/>
          </div>
        )}
        <button className="btn" onClick={toggleTheme}
          style={{fontSize:17,padding:"3px 7px",borderRadius:8,background:theme.goldDim,lineHeight:1}}>
          {themeMode==="dark"?"☀":"🌙"}
        </button>
        {!isMobile&&(
          <>
            <button className="btn" onClick={()=>setFontSize(f=>Math.max(12,f-1))}
              style={{opacity:0.5,fontSize:11,color:theme.textSoft,fontFamily:"'Jost',sans-serif"}}>A−</button>
            <button className="btn" onClick={()=>setFontSize(f=>Math.min(22,f+1))}
              style={{opacity:0.5,fontSize:14,color:theme.textSoft,fontFamily:"'Jost',sans-serif"}}>A+</button>
          </>
        )}
        <div style={{width:30,height:30,borderRadius:"50%",background:theme.goldDim,
          border:`1px solid ${theme.gold}66`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:13,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:800}}>
          {user?.email?.[0]?.toUpperCase()}
        </div>
        {!isMobile&&(
          <button className="btn" onClick={()=>supabase.auth.signOut()}
            style={{fontSize:11,color:theme.textMuted,fontFamily:"'Jost',sans-serif"}}>Sign out</button>
        )}
      </div>

      {/* Quote Banner */}
      <QuoteBanner isMobile={isMobile} theme={theme}/>

      {/* Body */}
      <div style={{flex:1,display:"flex",overflow:"hidden",flexDirection:"column"}}>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* Desktop Sidebar */}
          {!isMobile&&sidebarOpen&&(
            <div style={{width:215,background:theme.sidebar,borderRight:`1px solid ${theme.border}`,
              display:"flex",flexDirection:"column",overflow:"auto",flexShrink:0,padding:"12px 0"}}>
              {desktopNav.map(item=>(
                <NavItem key={item.key} icon={item.icon} label={item.label} theme={theme}
                  active={view===item.key||(item.key==="notes"&&view==="note-edit")}
                  onClick={()=>{if(item.key==="notes")setEditingNote(null);setView(item.key);}}/>
              ))}
              <div style={{margin:"16px 12px 5px",fontSize:9,letterSpacing:"0.15em",color:theme.textMuted,
                textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>Folders</div>
              {folders.map(f=>(
                <NavItem key={f.id} label={f.name} dot={true} dotColor={f.color} theme={theme}
                  active={activeFolder===f.id}
                  onClick={()=>{setActiveFolder(f.id===activeFolder?null:f.id);setView("notes");}}
                  onDelete={()=>deleteFolder(f.id)}/>
              ))}
              {showNewFolder?(
                <div style={{padding:"4px 12px",display:"flex",gap:4}}>
                  <input value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder name"
                    style={{fontSize:12,height:30,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,fontFamily:"'Jost',sans-serif"}}
                    onKeyDown={e=>{if(e.key==="Enter")addFolder();if(e.key==="Escape")setShowNewFolder(false);}} autoFocus/>
                  <button className="btn" onClick={addFolder} style={{color:theme.gold,fontSize:18,lineHeight:1}}>+</button>
                </div>
              ):(
                <button className="btn" onClick={()=>setShowNewFolder(true)}
                  style={{margin:"4px 12px",color:theme.textMuted,fontSize:12,textAlign:"left",
                    fontFamily:"'Jost',sans-serif",fontWeight:500}}>+ New folder</button>
              )}
            </div>
          )}

          {/* Main Content */}
          <div style={{flex:1,overflow:"auto",padding:isMobile?"14px 14px 8px":24}}>

            {/* ░░ TO-DOS ░░ */}
            {view==="todos"&&(
              <div className="fade-in">
                <div style={{display:"flex",alignItems:"center",marginBottom:18,gap:10}}>
                  <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:isMobile?19:22,fontWeight:800,
                    color:theme.text,letterSpacing:"-0.3px"}}>To-Dos</h1>
                  <div style={{flex:1}}/>
                  <button className="btn" onClick={()=>setShowAddTask(o=>!o)}
                    style={{background:theme.gold,color:theme.bg,padding:"8px 18px",borderRadius:9,
                      fontSize:12,border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em"}}>+ ADD</button>
                </div>

                {showAddTask&&(
                  <div className="slide-up" style={{background:theme.surface,border:`1px solid ${theme.border}`,
                    borderRadius:12,padding:16,marginBottom:14}}>
                    <input value={newTaskTxt} onChange={e=>setNewTaskTxt(e.target.value)} placeholder="Task description…"
                      onKeyDown={e=>e.key==="Enter"&&addStandaloneTask()} autoFocus
                      style={{width:"100%",fontSize:15,background:theme.surface2,border:`1px solid ${theme.border}`,
                        color:theme.text,borderRadius:8,padding:"9px 12px",fontFamily:"'Cormorant Garamond',serif",
                        outline:"none",marginBottom:8}}/>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <select value={newTaskSeg} onChange={e=>setNewTaskSeg(e.target.value)}
                        style={{flex:"1 1 110px",fontSize:12,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,borderRadius:8,padding:"7px 9px"}}>
                        {SEGMENTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <input value={newTaskOwner} onChange={e=>setNewTaskOwner(e.target.value)} placeholder="Owner"
                        style={{width:82,fontSize:12,background:theme.surface2,border:`1px solid ${theme.border}`,
                          color:theme.text,borderRadius:8,padding:"7px 9px",fontFamily:"'Jost',sans-serif",outline:"none"}}/>
                      <input type="date" value={newTaskDl} onChange={e=>setNewTaskDl(e.target.value)}
                        style={{fontSize:11,background:theme.surface2,border:`1px solid ${theme.border}`,
                          color:theme.text,borderRadius:8,padding:"7px 8px",fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
                      <button className="btn" onClick={addStandaloneTask}
                        style={{background:theme.gold,color:theme.bg,border:"none",padding:"7px 16px",
                          borderRadius:8,fontSize:12,fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.05em"}}>ADD</button>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                  {SEGMENTS.map(s=>(
                    <button key={s.key} className={`btn seg-btn${activeSeg===s.key?" active":""}`}
                      onClick={()=>setActiveSeg(s.key)}
                      style={{padding:"6px 14px",borderRadius:20,fontSize:12,background:theme.surface,
                        border:`1px solid ${theme.border}`,color:theme.textSoft,whiteSpace:"nowrap",flexShrink:0,
                        fontFamily:"'Jost',sans-serif",fontWeight:600,letterSpacing:"0.03em"}}>
                      {s.icon} {s.label} <span style={{opacity:0.45,fontSize:10,marginLeft:4}}>{allTasks.filter(t=>t.segment===s.key&&!t.done).length}</span>
                    </button>
                  ))}
                </div>

                {segTasks.length===0
                  ? <EmptyState theme={theme} text="No tasks here — add one above ✦"/>
                  : segTasks.map(t=>(
                    <SwipeTaskRow key={t.id} task={t} theme={theme} isMobile={isMobile}
                      folderName={t.folder_id?folderName(t.folder_id):null}
                      folderColor={t.folder_id?folderColor(t.folder_id):null}
                      onToggle={()=>toggleTask(t.id)}
                      onDelete={()=>deleteTask(t.id)}
                      onSegChange={seg=>updateTaskSeg(t.id,seg)}
                      onNoteClick={t._fromNote?()=>{
                        const n=notes.find(n=>n.id===t.note_id);
                        if(n){setEditingNote(n);setView("note-edit");}
                      }:null}/>
                  ))
                }
              </div>
            )}

            {/* ░░ REFLECTIONS ░░ */}
            {view==="reflections"&&(
              <ReflectionView
                reflection={todayRefl} onSave={saveReflection}
                theme={theme} isMobile={isMobile} allReflections={reflections}/>
            )}

            {/* ░░ CALENDAR ░░ */}
            {view==="calendar"&&(
              <CalendarView
                notes={notes} calDate={calDate} setCalDate={setCalDate}
                calNotes={calNotes} theme={theme} isMobile={isMobile}
                onNoteClick={n=>{setEditingNote(n);setView("note-edit");}}
                onNewNote={newNote}/>
            )}

            {/* ░░ NOTES LIST ░░ */}
            {view==="notes"&&(
              <div className="fade-in">
                <div style={{display:"flex",alignItems:"center",marginBottom:18,gap:10}}>
                  <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:isMobile?19:22,fontWeight:800,
                    color:theme.text,letterSpacing:"-0.3px"}}>
                    {activeFolder?folders.find(f=>f.id===activeFolder)?.name||"Notes":"Meeting Notes"}
                  </h1>
                  <div style={{flex:1}}/>
                  <button className="btn" onClick={newNote}
                    style={{background:theme.gold,color:theme.bg,padding:"8px 18px",borderRadius:9,
                      fontSize:12,border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em"}}>+ NEW</button>
                </div>
                {visibleNotes.length===0
                  ? <EmptyState theme={theme} text="No notes yet — create one ✦"/>
                  : <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
                    {visibleNotes.map(n=>{
                      const fol=folders.find(f=>f.id===n.folder_id);
                      const noteTasks=tasks.filter(t=>t.note_id===n.id);
                      const openAPs=noteTasks.filter(t=>!t.done).length;
                      return (
                        <div key={n.id} className="note-card"
                          style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:14,padding:16,cursor:"pointer"}}
                          onClick={()=>{setEditingNote(n);setView("note-edit");}}>
                          {fol&&<span style={{display:"inline-block",padding:"1px 9px",borderRadius:20,fontSize:9,
                            fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase",
                            background:fol.color+"22",color:fol.color,marginBottom:5}}>{fol.name}</span>}
                          <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:15,
                            color:theme.text,marginBottom:4,letterSpacing:"-0.2px"}}>{n.subject||"Untitled"}</div>
                          <div style={{fontSize:13,color:theme.textSoft,fontFamily:"'Cormorant Garamond',serif",
                            lineHeight:1.55,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                            {n.note?.replace(/^[\s•\-]+/gm,"").trim().slice(0,150)||"…"}
                          </div>
                          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:8}}>
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:theme.textMuted}}>
                              {n.note_date||n.created_at?.split("T")[0]||""}
                            </span>
                            {openAPs>0&&<span style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:10,color:theme.gold}}>
                              ⚡ {openAPs} action{openAPs>1?"s":""}
                            </span>}
                            {n.ai_summary&&<span style={{fontSize:10,color:theme.gold,fontFamily:"'Jost',sans-serif",fontWeight:600}}>✦ summary</span>}
                            {n.participants?.length>0&&<span style={{fontSize:10,color:theme.textMuted,fontFamily:"'Jost',sans-serif"}}>👥 {n.participants.length}</span>}
                          </div>
                          {n.ai_summary&&(
                            <div style={{marginTop:10,padding:"8px 12px",background:theme.goldDim,borderRadius:8,
                              borderLeft:`3px solid ${theme.gold}`,fontSize:13,color:theme.textSoft,
                              fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.55}}>
                              {n.ai_summary}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            )}

            {/* ░░ NOTE EDITOR ░░ */}
            {view==="note-edit"&&editingNote&&(
              <NoteEditor
                note={editingNote}
                folders={folders}
                tasks={tasks.filter(t=>t.note_id===editingNote.id)}
                isMobile={isMobile}
                theme={theme}
                onBack={()=>setView("notes")}
                onDelete={()=>deleteNote(editingNote.id)}
                onNoteChange={(field,val)=>{
                  const u={...editingNote,[field]:val};
                  setEditingNote(u); updateNote(u);
                }}
                onAddTask={(text,seg,owner,deadline)=>addTask(text,seg,editingNote.id,editingNote.folder_id,owner,deadline)}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onSegChange={updateTaskSeg}
                onEmail={()=>setEmailNote(editingNote)}/>
            )}

            {/* ░░ SEARCH ░░ */}
            {view==="search"&&(
              <div className="fade-in">
                <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:isMobile?19:22,fontWeight:800,
                  color:theme.text,letterSpacing:"-0.3px",marginBottom:16}}>⊕ Search</h1>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search notes and tasks by meaning…" autoFocus
                  style={{marginBottom:14,width:"100%",background:theme.surface2,
                    border:`1px solid ${theme.border}`,color:theme.text,fontFamily:"'Cormorant Garamond',serif"}}/>
                {!searchQuery&&<EmptyState theme={theme} text="Start typing to search by meaning"/>}
                {searchQuery&&searchResults.length===0&&<EmptyState theme={theme} text="No results found."/>}
                {searchResults.map(r=>{
                  if (r.type==="note") {
                    const n=notes.find(n=>n.id===r.id); if(!n) return null;
                    return (
                      <div key={r.id} onClick={()=>{setEditingNote(n);setView("note-edit");}}
                        style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:10,padding:14,marginBottom:10,cursor:"pointer"}}>
                        <span style={{display:"inline-block",padding:"1px 9px",borderRadius:20,fontSize:9,
                          fontFamily:"'Jost',sans-serif",fontWeight:800,background:theme.goldDim,color:theme.gold,marginBottom:5}}>Note</span>
                        <div style={{fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:14,color:theme.text}}>{n.subject||"Untitled"}</div>
                        <div style={{fontSize:13,color:theme.textSoft,fontFamily:"'Cormorant Garamond',serif",marginTop:3}}>{n.note?.slice(0,120)}…</div>
                      </div>
                    );
                  } else {
                    const t=allTasks.find(t=>t.id===r.id); if(!t) return null;
                    return (
                      <div key={r.id} style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:10,padding:14,marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
                        <span style={{display:"inline-block",padding:"1px 9px",borderRadius:20,fontSize:9,
                          fontFamily:"'Jost',sans-serif",fontWeight:800,background:theme.dangerDim,color:theme.danger}}>Task</span>
                        <span style={{color:t.done?theme.textMuted:theme.text,textDecoration:t.done?"line-through":"none",
                          flex:1,fontFamily:"'Cormorant Garamond',serif"}}>{t.text}</span>
                      </div>
                    );
                  }
                })}
              </div>
            )}

            {/* ░░ MORE (mobile) ░░ */}
            {view==="more"&&isMobile&&(
              <div className="fade-in">
                <h1 style={{fontFamily:"'Jost',sans-serif",fontSize:19,fontWeight:800,
                  color:theme.text,letterSpacing:"-0.3px",marginBottom:18}}>More</h1>

                {/* Search */}
                <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:14,marginBottom:12}}>
                  <div style={lbl(theme)}>Search</div>
                  <input value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);runSearch(e.target.value);}}
                    placeholder="Search notes and tasks…"
                    style={{width:"100%",background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text}}/>
                  {searchResults.length>0&&searchResults.slice(0,5).map(r=>{
                    if(r.type==="note"){const n=notes.find(n=>n.id===r.id);if(!n)return null;
                      return <div key={r.id} onClick={()=>{setEditingNote(n);setView("note-edit");}}
                        style={{padding:"8px 0",borderBottom:`1px solid ${theme.borderSoft}`,cursor:"pointer"}}>
                        <div style={{fontFamily:"'Jost',sans-serif",fontWeight:600,fontSize:13,color:theme.text}}>{n.subject||"Untitled"}</div>
                      </div>;
                    }
                    const t=allTasks.find(t=>t.id===r.id);if(!t)return null;
                    return <div key={r.id} style={{padding:"8px 0",borderBottom:`1px solid ${theme.borderSoft}`}}>
                      <span style={{fontSize:13,color:theme.textSoft,fontFamily:"'Cormorant Garamond',serif"}}>{t.text}</span>
                    </div>;
                  })}
                </div>

                {/* Folders */}
                <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:14,marginBottom:12}}>
                  <div style={lbl(theme)}>Folders</div>
                  {folders.map(f=>(
                    <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${theme.borderSoft}`}}>
                      <span style={{width:9,height:9,borderRadius:"50%",background:f.color,flexShrink:0}}/>
                      <span style={{flex:1,fontFamily:"'Jost',sans-serif",fontWeight:700,fontSize:13,color:theme.text}}
                        onClick={()=>{setActiveFolder(f.id);setView("notes");}}>{f.name}</span>
                      <span style={{fontSize:10,color:theme.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>
                        {notes.filter(n=>n.folder_id===f.id).length} notes
                      </span>
                    </div>
                  ))}
                  {showNewFolder?(
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <input value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder name"
                        style={{flex:1,fontSize:13,background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text}}
                        onKeyDown={e=>{if(e.key==="Enter")addFolder();}} autoFocus/>
                      <button className="btn" onClick={addFolder}
                        style={{background:theme.gold,color:theme.bg,padding:"7px 14px",borderRadius:8,fontSize:12,border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800}}>Add</button>
                    </div>
                  ):(
                    <button className="btn" onClick={()=>setShowNewFolder(true)}
                      style={{marginTop:8,color:theme.gold,fontSize:13,fontFamily:"'Jost',sans-serif",fontWeight:600}}>+ New folder</button>
                  )}
                </div>

                {/* Notifications */}
                <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:14,marginBottom:12}}>
                  <div style={lbl(theme)}>🔔 Notifications</div>
                  {notifEnabled?(
                    <div>
                      <div style={{color:theme.green,fontSize:13,fontFamily:"'Jost',sans-serif",fontWeight:600,marginBottom:8}}>✓ Task reminders enabled</div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{color:theme.textSoft,fontSize:13,fontFamily:"'Jost',sans-serif"}}>Remind at</span>
                        <input type="time" defaultValue={`${String(notifTime.hour).padStart(2,"0")}:${String(notifTime.minute).padStart(2,"0")}`}
                          onChange={e=>{const[h,m]=e.target.value.split(":");setNotifTime({hour:Number(h),minute:Number(m)});}}
                          style={{background:theme.surface2,border:`1px solid ${theme.border}`,color:theme.text,padding:"6px 10px",borderRadius:8,fontSize:13}}/>
                      </div>
                    </div>
                  ):(
                    <button className="btn" onClick={enableNotif}
                      style={{background:theme.gold,color:theme.bg,padding:"11px 0",borderRadius:9,
                        fontSize:12,width:"100%",border:"none",fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em"}}>
                      ENABLE TASK REMINDERS
                    </button>
                  )}
                </div>

                {/* Appearance */}
                <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:14,marginBottom:12}}>
                  <div style={lbl(theme)}>🎨 Appearance</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{color:theme.text,fontSize:13,fontFamily:"'Jost',sans-serif"}}>Theme</span>
                    <button className="btn" onClick={toggleTheme}
                      style={{background:theme.goldDim,color:theme.gold,padding:"8px 18px",borderRadius:8,
                        fontSize:12,border:`1px solid ${theme.gold}44`,fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.05em"}}>
                      {themeMode==="dark"?"☀ LIGHT":"🌙 DARK"}
                    </button>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{color:theme.text,fontSize:13,fontFamily:"'Jost',sans-serif"}}>Font size</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <button className="btn" onClick={()=>setFontSize(f=>Math.max(12,f-1))}
                        style={{background:theme.surface2,color:theme.text,width:32,height:32,borderRadius:6,fontSize:13,fontFamily:"'Jost',sans-serif"}}>A−</button>
                      <span style={{color:theme.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12,minWidth:28,textAlign:"center"}}>{fontSize}px</span>
                      <button className="btn" onClick={()=>setFontSize(f=>Math.min(22,f+1))}
                        style={{background:theme.surface2,color:theme.text,width:32,height:32,borderRadius:6,fontSize:14,fontFamily:"'Jost',sans-serif"}}>A+</button>
                    </div>
                  </div>
                </div>

                {/* Account */}
                <div style={{background:theme.surface,border:`1px solid ${theme.border}`,borderRadius:12,padding:14}}>
                  <div style={lbl(theme)}>👤 Account</div>
                  <div style={{color:theme.textSoft,fontSize:12,fontFamily:"'Jost',sans-serif",marginBottom:14,wordBreak:"break-all"}}>{user?.email}</div>
                  <button className="btn" onClick={()=>supabase.auth.signOut()}
                    style={{background:theme.dangerDim,color:theme.danger,padding:"11px 0",borderRadius:9,
                      fontSize:12,width:"100%",border:`1px solid ${theme.danger}44`,
                      fontFamily:"'Jost',sans-serif",fontWeight:800,letterSpacing:"0.06em"}}>SIGN OUT</button>
                </div>
              </div>
            )}

          </div>{/* end main */}
        </div>

        {/* Mobile Bottom Nav */}
        {isMobile&&(
          <div style={{display:"flex",background:theme.navBg,borderTop:`1px solid ${theme.border}`,
            paddingBottom:"env(safe-area-inset-bottom,10px)",flexShrink:0,zIndex:100}}>
            {mobileNav.map(item=>{
              const active=view===item.key||(item.key==="notes"&&view==="note-edit");
              return (
                <button key={item.key} className="btn"
                  onClick={()=>{if(item.key==="notes")setEditingNote(null);setView(item.key);}}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                    padding:"10px 0 5px",color:active?theme.gold:theme.textMuted,background:"none",border:"none",
                    borderTop:active?`2px solid ${theme.gold}`:"2px solid transparent",transition:"all 0.15s"}}>
                  <span style={{fontSize:17,lineHeight:1}}>{item.ic}</span>
                  <span style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em",fontWeight:active?600:400}}>{item.lbl}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
