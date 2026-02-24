// ============================================================
//  NoteFlow — Full App with Supabase Auth + Data
//  ✦ Mobile responsive (iOS + Android)
//  ✦ Daily motivational quotes banner
//  ✦ Bottom nav for mobile
// ============================================================

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── 🔧 CONFIG — replace these two values ────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── Segments ────────────────────────────────────────────────
const SEGMENTS = [
  { key: "today",     label: "Today",     icon: "☀️" },
  { key: "this-week", label: "This Week", icon: "📅" },
  { key: "project",   label: "Project",   icon: "🎯" },
  { key: "waiting",   label: "Waiting",   icon: "⏳" },
  { key: "someday",   label: "Someday",   icon: "🌙" },
];

const FOLDER_COLORS = ["#7c6af7","#f7936a","#4fc4cf","#f7c948","#a8d96c","#f76a8a"];

// ─── Motivational quotes ──────────────────────────────────────
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", role: "Author & Humorist" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", role: "Philosopher" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", role: "Olympic Ice Hockey Legend" },
  { text: "Whether you think you can or you think you can't — you're right.", author: "Henry Ford", role: "Industrialist" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", role: "Apple Co-Founder" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", role: "Nobel Prize Winner, Physics" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", role: "Former President, South Africa" },
  { text: "Ask not what your country can do for you — ask what you can do for your country.", author: "John F. Kennedy", role: "35th U.S. President" },
  { text: "We must accept finite disappointment, but never lose infinite hope.", author: "Martin Luther King Jr.", role: "Nobel Peace Prize Winner" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela", role: "Former President, South Africa" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon", role: "Musician & Activist" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa", role: "Nobel Peace Prize Winner" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt", role: "32nd U.S. President" },
  { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson", role: "Author" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", role: "Former First Lady, UN Diplomat" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", role: "Olympic Tennis Champion" },
  { text: "You have to expect things of yourself before you can do them.", author: "Michael Jordan", role: "Olympic Gold Medalist, Basketball" },
  { text: "Gold medals aren't really made of gold. They're made of sweat, determination, and a hard-to-find alloy called guts.", author: "Dan Gable", role: "Olympic Gold Medalist, Wrestling" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss", role: "Author" },
  { text: "Do not go where the path may lead; go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson", role: "Philosopher & Poet" },
  { text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou", role: "Poet & Civil Rights Activist" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln", role: "16th U.S. President" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth", role: "Baseball Legend" },
  { text: "Money and success don't change people; they merely amplify what is already there.", author: "Will Smith", role: "Actor & Producer" },
  { text: "Not everything that is faced can be changed, but nothing can be changed until it is faced.", author: "James Baldwin", role: "Author & Activist" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey", role: "Media Mogul & Philanthropist" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington", role: "Educator & Presidential Advisor" },
  { text: "I have learned over the years that when one's mind is made up, this diminishes fear.", author: "Rosa Parks", role: "Civil Rights Activist" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey", role: "Author" },
  { text: "When I stand before God at the end of my life, I would hope that I would not have a single bit of talent left.", author: "Erma Bombeck", role: "Author & Humorist" },
];

// Pick today's quote deterministically by day of year
function getTodaysQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Semantic search ──────────────────────────────────────────
function tokenize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}
function buildVector(tokens, vocab) {
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  return vocab.map(v => freq[v] || 0);
}
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// ─── Voice hook ───────────────────────────────────────────────
function useSpeechRecognition(onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ");
      onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  }, [onResult]);
  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

// ─── Mobile detection ─────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return <Splash />;
  return (
    <AuthContext.Provider value={{ session, user: session?.user }}>
      {session ? <NoteFlowApp /> : <AuthScreen />}
    </AuthContext.Provider>
  );
}

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={S.root}>
      <style>{globalCSS}</style>
      <div style={{ margin: "auto", color: "#7c6af7", fontSize: 40, animation: "pulse 1.2s ease-in-out infinite" }}>✦</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MOTIVATIONAL QUOTE BANNER
// ═══════════════════════════════════════════════════════════════
function QuoteBanner({ isMobile }) {
  const [visible, setVisible] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return dayOfYear % QUOTES.length;
  });
  const [fade, setFade] = useState(true);

  const nextQuote = () => {
    setFade(false);
    setTimeout(() => { setQuoteIdx(i => (i + 1) % QUOTES.length); setFade(true); }, 300);
  };

  if (!visible) return null;

  const q = QUOTES[quoteIdx];

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e1a35 0%, #2a1f4a 50%, #1a1e35 100%)",
      borderBottom: "1px solid #3d3560",
      padding: isMobile ? "14px 16px" : "16px 24px",
      position: "relative",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Decorative background glow */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "#7c6af711", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -30, left: 60, width: 80, height: 80, borderRadius: "50%", background: "#f7936a08", pointerEvents: "none" }} />

      <div style={{ opacity: fade ? 1 : 0, transition: "opacity 0.3s ease", position: "relative" }}>
        {/* Quote mark */}
        <div style={{ fontFamily: "'Playfair Display', 'Lora', serif", fontSize: isMobile ? 36 : 48, color: "#7c6af733", lineHeight: 0.8, marginBottom: 4, userSelect: "none" }}>"</div>

        {/* Quote text */}
        <p style={{
          fontFamily: "'Playfair Display', 'Lora', serif",
          fontSize: isMobile ? 13 : 15,
          fontStyle: "italic",
          color: "#d4cff0",
          lineHeight: 1.6,
          marginBottom: 8,
          paddingRight: isMobile ? 24 : 40,
        }}>
          {q.text}
        </p>

        {/* Author */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isMobile ? 10 : 11, color: "#7c6af7", fontWeight: 600 }}>
            — {q.author}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isMobile ? 9 : 10, color: "#665f80" }}>
            {q.role}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
        <button className="btn" onClick={nextQuote} title="Next quote"
          style={{ color: "#665f80", fontSize: 14, padding: "4px 6px", borderRadius: 6, background: "#ffffff08" }}>↻</button>
        <button className="btn" onClick={() => setVisible(false)} title="Dismiss"
          style={{ color: "#665f80", fontSize: 12, padding: "4px 6px", borderRadius: 6, background: "#ffffff08" }}>✕</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async () => {
    setLoading(true); setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: "ok", text: "Account created! Check your email to confirm, then log in." });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage({ type: "ok", text: "Password reset email sent — check your inbox." });
      }
    } catch (e) { setMessage({ type: "err", text: e.message }); }
    setLoading(false);
  };

  const todayQ = getTodaysQuote();

  return (
    <div style={S.root}>
      <style>{globalCSS}</style>
      <div style={{ margin: "auto", width: "100%", maxWidth: 420, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✦</div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 30, fontWeight: 600, color: "#c9b8ff", letterSpacing: "-1px" }}>NoteFlow</div>
          <div style={{ color: "#665f80", fontSize: 13, marginTop: 4 }}>Your portable thinking assistant</div>
        </div>

        {/* Quote on auth screen */}
        <div style={{ background: "linear-gradient(135deg, #1e1a35, #2a1f4a)", border: "1px solid #3d3560", borderRadius: 12, padding: "14px 16px", marginBottom: 24, textAlign: "center" }}>
          <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "#c9b8ff", marginBottom: 6, lineHeight: 1.5 }}>"{todayQ.text}"</p>
          <span style={{ fontSize: 11, color: "#7c6af7", fontFamily: "'JetBrains Mono', monospace" }}>— {todayQ.author}</span>
        </div>

        {/* Auth card */}
        <div style={{ background: "#1a1828", border: "1px solid #2d2a45", borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#100e1c", borderRadius: 10, padding: 4 }}>
            {["login","signup"].map(m => (
              <button key={m} className="btn" onClick={() => { setMode(m); setMessage(null); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 13, fontWeight: 600,
                  background: mode === m ? "#7c6af7" : "transparent", color: mode === m ? "#fff" : "#665f80", transition: "all 0.15s" }}>
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          {message && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: message.type === "ok" ? "#4fc4cf22" : "#f76a8a22",
              color: message.type === "ok" ? "#4fc4cf" : "#f76a8a",
              border: `1px solid ${message.type === "ok" ? "#4fc4cf44" : "#f76a8a44"}` }}>
              {message.text}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && submit()}
              style={{ width: "100%" }} autoFocus />
          </div>

          {mode !== "reset" && (
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()}
                style={{ width: "100%" }} />
            </div>
          )}

          <button className="btn" onClick={submit} disabled={loading}
            style={{ width: "100%", padding: "12px 0", background: "#7c6af7", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 15, opacity: loading ? 0.6 : 1 }}>
            {loading ? "…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset email"}
          </button>

          {mode === "login" && (
            <button className="btn" onClick={() => { setMode("reset"); setMessage(null); }}
              style={{ display: "block", margin: "12px auto 0", fontSize: 12, color: "#665f80" }}>
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
function NoteFlowApp() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [folders, setFolders] = useState([]);
  const [notes, setNotes]     = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView]                     = useState("todos");
  const [activeSegment, setActiveSegment]   = useState("today");
  const [activeFolder, setActiveFolder]     = useState(null);
  const [editingNote, setEditingNote]       = useState(null);
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState([]);
  const [fontSize, setFontSize]             = useState(15);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [newFolderName, setNewFolderName]   = useState("");
  const [showNewFolder, setShowNewFolder]   = useState(false);
  const [showAddTask, setShowAddTask]       = useState(false);
  const [newTaskText, setNewTaskText]       = useState("");
  const [newTaskSegment, setNewTaskSegment] = useState("today");

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: f }, { data: n }, { data: t }] = await Promise.all([
        supabase.from("folders").select("*").order("created_at"),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at"),
      ]);
      setFolders(f || []); setNotes(n || []); setTasks(t || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Derived tasks
  const allTasks = [
    ...tasks.filter(t => !t.note_id),
    ...tasks.filter(t => !!t.note_id).map(t => {
      const note = notes.find(n => n.id === t.note_id);
      return { ...t, _fromNote: true, _noteSubject: note?.subject || "Note" };
    }),
  ];

  // Semantic search
  const runSearch = useCallback((q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const qTokens = tokenize(q);
    const docs = [
      ...notes.map(n => ({ type: "note", id: n.id, text: `${n.subject} ${n.note}` })),
      ...allTasks.map(t => ({ type: "task", id: t.id, text: t.text })),
    ];
    const vocab = [...new Set(docs.flatMap(d => tokenize(d.text)).concat(qTokens))];
    const qVec = buildVector(qTokens, vocab);
    const scored = docs.map(d => ({ ...d, score: cosineSim(qVec, buildVector(tokenize(d.text), vocab)) }))
      .filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
    setSearchResults(scored);
  }, [notes, allTasks]);

  useEffect(() => { if (view === "search") runSearch(searchQuery); }, [searchQuery, view, runSearch]);

  // Folder CRUD
  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
    const { data, error } = await supabase.from("folders").insert({ user_id: user.id, name: newFolderName.trim(), color }).select().single();
    if (!error) { setFolders(f => [...f, data]); setNewFolderName(""); setShowNewFolder(false); }
  };
  const deleteFolder = async (id) => {
    await supabase.from("folders").delete().eq("id", id);
    setFolders(f => f.filter(x => x.id !== id));
    if (activeFolder === id) setActiveFolder(null);
  };

  // Note CRUD
  const newNote = async () => {
    const { data, error } = await supabase.from("notes").insert({ user_id: user.id, folder_id: activeFolder, subject: "", note: "" }).select().single();
    if (!error) { setNotes(n => [data, ...n]); setEditingNote(data); setView("note-edit"); }
  };
  const updateNote = async (updated) => {
    await supabase.from("notes").update({ subject: updated.subject, note: updated.note, folder_id: updated.folder_id }).eq("id", updated.id);
    setNotes(n => n.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    setEditingNote(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  };
  const deleteNote = async (id) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes(n => n.filter(x => x.id !== id));
    setTasks(t => t.filter(x => x.note_id !== id));
    setView("notes");
  };

  // Task CRUD
  const addTask = async (text, segment, noteId = null, folderId = null) => {
    const { data, error } = await supabase.from("tasks").insert({ user_id: user.id, text, segment, note_id: noteId, folder_id: folderId || activeFolder, done: false }).select().single();
    if (!error) setTasks(t => [...t, data]);
    return data;
  };
  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from("tasks").update({ done: !task.done }).eq("id", id);
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  };
  const updateTaskSegment = async (id, segment) => {
    await supabase.from("tasks").update({ segment }).eq("id", id);
    setTasks(t => t.map(x => x.id === id ? { ...x, segment } : x));
  };
  const deleteTask = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(t => t.filter(x => x.id !== id));
  };
  const addStandaloneTask = async () => {
    if (!newTaskText.trim()) return;
    await addTask(newTaskText.trim(), newTaskSegment, null, activeFolder);
    setNewTaskText(""); setShowAddTask(false);
  };

  // AI Summarize
  const summarizeNote = async (note) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Summarize this note and extract action points. Respond ONLY with a JSON object with keys "summary" (string) and "actionPoints" (array of strings). Note:\n\nSubject: ${note.subject}\n\n${note.note}` }] })
      });
      const json = await res.json();
      const text = json.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        await updateNote({ ...note, note: `${note.note}\n\n📋 AI Summary: ${parsed.summary}` });
        for (const apText of (parsed.actionPoints || [])) await addTask(apText, "this-week", note.id, note.folder_id);
      }
    } catch (e) { console.error(e); }
  };

  // Voice
  const { listening, start: startVoice, stop: stopVoice } = useSpeechRecognition((t) => {
    if (editingNote) setEditingNote(n => ({ ...n, note: (n.note + " " + t).trim() }));
  });

  const visibleNotes   = notes.filter(n => activeFolder ? n.folder_id === activeFolder : true);
  const segmentedTasks = allTasks.filter(t => t.segment === activeSegment);
  const folderColor    = (id) => folders.find(f => f.id === id)?.color || "#888";

  if (loading) return <Splash />;

  // ─── Mobile bottom nav items ──────────────────────────────
  const mobileNavItems = [
    { key: "todos",   icon: "✅", label: "To-Dos" },
    { key: "notes",   icon: "📝", label: "Notes" },
    { key: "search",  icon: "🔍", label: "Search" },
    { key: "folders", icon: "📁", label: "Folders" },
    { key: "account", icon: "👤", label: "Account" },
  ];

  return (
    <div style={S.root}>
      <style>{globalCSS}</style>

      {/* ── Top Bar ── */}
      <div style={{ ...S.topBar, padding: isMobile ? "10px 16px" : "10px 20px" }}>
        {!isMobile && (
          <button className="btn" onClick={() => setSidebarOpen(o => !o)} style={{ fontSize: 18, color: "#7c6af7" }}>☰</button>
        )}
        <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: isMobile ? 16 : 18, color: "#c9b8ff", letterSpacing: "-0.5px" }}>✦ NoteFlow</span>
        <div style={{ flex: 1 }} />
        {!isMobile && (
          <>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 13 }}>🔍</span>
              <input placeholder="Semantic search…" value={searchQuery}
                onFocus={() => setView("search")} onChange={e => { setSearchQuery(e.target.value); setView("search"); }}
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className="btn" onClick={() => setFontSize(f => Math.max(12, f - 1))} style={{ opacity: 0.6, fontSize: 11 }}>A-</button>
              <button className="btn" onClick={() => setFontSize(f => Math.min(22, f + 1))} style={{ opacity: 0.6, fontSize: 15 }}>A+</button>
            </div>
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: isMobile ? 0 : 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#7c6af733", border: "1px solid #7c6af7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#7c6af7", fontWeight: 600 }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          {!isMobile && <button className="btn" onClick={() => supabase.auth.signOut()} style={{ fontSize: 12, color: "#665f80" }}>Sign out</button>}
        </div>
      </div>

      {/* ── Motivational Quote Banner ── */}
      <QuoteBanner isMobile={isMobile} />

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar — desktop only */}
          {!isMobile && sidebarOpen && (
            <div style={S.sidebar}>
              <NavItem icon="✅" label="To-Dos"  active={view === "todos"} onClick={() => setView("todos")} />
              <NavItem icon="📝" label="Notes"   active={view === "notes" || view === "note-edit"} onClick={() => { setView("notes"); setEditingNote(null); }} />
              <NavItem icon="🔍" label="Search"  active={view === "search"} onClick={() => setView("search")} />
              <div style={S.sidebarSection}>Folders</div>
              {folders.map(f => (
                <NavItem key={f.id} label={f.name} dot={f.color}
                  active={activeFolder === f.id}
                  onClick={() => { setActiveFolder(f.id === activeFolder ? null : f.id); setView("notes"); }}
                  onDelete={() => deleteFolder(f.id)} />
              ))}
              {showNewFolder ? (
                <div style={{ padding: "4px 12px", display: "flex", gap: 4 }}>
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name"
                    style={{ fontSize: 12, height: 28 }}
                    onKeyDown={e => { if (e.key === "Enter") addFolder(); if (e.key === "Escape") setShowNewFolder(false); }} autoFocus />
                  <button className="btn" onClick={addFolder} style={{ color: "#7c6af7", fontSize: 16 }}>+</button>
                </div>
              ) : (
                <button className="btn" onClick={() => setShowNewFolder(true)}
                  style={{ margin: "4px 12px", color: "#665f80", fontSize: 12, textAlign: "left" }}>+ New folder</button>
              )}
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 16px 8px" : 24,
            paddingBottom: isMobile ? "env(safe-area-inset-bottom, 8px)" : 24 }}>

            {/* TO-DOS */}
            {view === "todos" && (
              <div>
                <div style={S.pageHeader}>
                  <h1 style={{ ...S.pageTitle, fontSize: isMobile ? 20 : 22 }}>To-Dos</h1>
                  <div style={{ flex: 1 }} />
                  <button className="btn" onClick={() => setShowAddTask(o => !o)} style={S.primaryBtn}>+ Add Task</button>
                </div>

                {showAddTask && (
                  <div className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Task description…"
                      style={{ flex: "1 1 200px", minWidth: 0 }}
                      onKeyDown={e => { if (e.key === "Enter") addStandaloneTask(); }} autoFocus />
                    <select value={newTaskSegment} onChange={e => setNewTaskSegment(e.target.value)}>
                      {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button className="btn" onClick={addStandaloneTask} style={S.primaryBtn}>Add</button>
                  </div>
                )}

                {/* Segment tabs — scrollable on mobile */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                  {SEGMENTS.map(s => (
                    <button key={s.key} className={`btn seg-btn ${activeSegment === s.key ? "active" : ""}`}
                      onClick={() => setActiveSegment(s.key)}
                      style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, background: "#1a1828", border: "1px solid #2d2a45", color: "#a09bbd", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {s.icon} {s.label}
                      <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4 }}>{allTasks.filter(t => t.segment === s.key && !t.done).length}</span>
                    </button>
                  ))}
                </div>

                {segmentedTasks.length === 0
                  ? <div style={S.empty}>No tasks here — add one above ✨</div>
                  : segmentedTasks.map(t => (
                    <TaskRow key={t.id} task={t} fontSize={fontSize}
                      folderColor={t.folder_id ? folderColor(t.folder_id) : null}
                      onToggle={() => toggleTask(t.id)}
                      onDelete={() => deleteTask(t.id)}
                      onSegmentChange={(seg) => updateTaskSegment(t.id, seg)}
                      isMobile={isMobile}
                      onNoteClick={t._fromNote ? () => {
                        const n = notes.find(n => n.id === t.note_id);
                        if (n) { setEditingNote(n); setView("note-edit"); }
                      } : null} />
                  ))
                }
              </div>
            )}

            {/* NOTES */}
            {view === "notes" && (
              <div>
                <div style={S.pageHeader}>
                  <h1 style={{ ...S.pageTitle, fontSize: isMobile ? 20 : 22 }}>
                    {activeFolder ? folders.find(f => f.id === activeFolder)?.name || "Notes" : "All Notes"}
                  </h1>
                  <div style={{ flex: 1 }} />
                  <button className="btn" onClick={newNote} style={S.primaryBtn}>+ New Note</button>
                </div>
                {visibleNotes.length === 0
                  ? <div style={S.empty}>No notes yet — create one ✨</div>
                  : <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                    {visibleNotes.map(n => {
                      const folder = folders.find(f => f.id === n.folder_id);
                      const noteTasks = tasks.filter(t => t.note_id === n.id);
                      return (
                        <div key={n.id} className="card note-card" onClick={() => { setEditingNote(n); setView("note-edit"); }}>
                          {folder && <span className="pill" style={{ background: folder.color + "22", color: folder.color, marginBottom: 8, display: "inline-block" }}>{folder.name}</span>}
                          <div style={{ fontWeight: 600, marginBottom: 4, color: "#d8d0f0" }}>{n.subject || "Untitled"}</div>
                          <div style={{ fontSize: fontSize - 2, color: "#8884aa", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{n.note || "…"}</div>
                          {noteTasks.length > 0 && <div style={{ marginTop: 8, fontSize: fontSize - 3, color: "#7c6af7" }}>✅ {noteTasks.filter(t => !t.done).length} open / {noteTasks.length} tasks</div>}
                          <div style={{ marginTop: 8, fontSize: fontSize - 4, color: "#665f80", fontFamily: "'JetBrains Mono', monospace" }}>{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            )}

            {/* NOTE EDITOR */}
            {view === "note-edit" && editingNote && (
              <NoteEditor
                note={editingNote} folders={folders}
                tasks={tasks.filter(t => t.note_id === editingNote.id)}
                fontSize={fontSize} listening={listening} isMobile={isMobile}
                onStartVoice={startVoice} onStopVoice={stopVoice}
                onBack={() => setView("notes")}
                onDelete={() => deleteNote(editingNote.id)}
                onSummarize={() => summarizeNote(editingNote)}
                onNoteChange={(field, val) => { const u = { ...editingNote, [field]: val }; setEditingNote(u); updateNote(u); }}
                onAddTask={(text, segment) => addTask(text, segment, editingNote.id, editingNote.folder_id)}
                onToggleTask={toggleTask} onDeleteTask={deleteTask} onSegmentChange={updateTaskSegment}
              />
            )}

            {/* SEARCH — desktop */}
            {view === "search" && !isMobile && (
              <div>
                <h1 style={{ ...S.pageTitle, marginBottom: 20 }}>🔍 Smart Search</h1>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search anything — semantic matching enabled…"
                  style={{ marginBottom: 20, fontSize, width: "100%" }} autoFocus />
                {!searchQuery && <div style={S.empty}>Start typing to find notes and tasks by meaning.</div>}
                {searchResults.length === 0 && searchQuery && <div style={S.empty}>No results found.</div>}
                <SearchResults results={searchResults} notes={notes} allTasks={allTasks} fontSize={fontSize}
                  onNoteClick={(n) => { setEditingNote(n); setView("note-edit"); }} />
              </div>
            )}

            {/* SEARCH — mobile */}
            {view === "search" && isMobile && (
              <div>
                <h1 style={{ ...S.pageTitle, marginBottom: 14, fontSize: 20 }}>🔍 Search</h1>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notes and tasks…"
                  style={{ marginBottom: 14, width: "100%" }} autoFocus />
                {!searchQuery && <div style={S.empty}>Type to search by meaning, not just keywords.</div>}
                {searchResults.length === 0 && searchQuery && <div style={S.empty}>No results found.</div>}
                <SearchResults results={searchResults} notes={notes} allTasks={allTasks} fontSize={fontSize}
                  onNoteClick={(n) => { setEditingNote(n); setView("note-edit"); }} />
              </div>
            )}

            {/* FOLDERS — mobile */}
            {view === "folders" && isMobile && (
              <div>
                <div style={S.pageHeader}>
                  <h1 style={{ ...S.pageTitle, fontSize: 20 }}>Folders</h1>
                </div>
                {folders.length === 0 && <div style={S.empty}>No folders yet.</div>}
                {folders.map(f => (
                  <div key={f.id} className="card" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onClick={() => { setActiveFolder(f.id); setView("notes"); }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{f.name}</span>
                    <span style={{ fontSize: 12, color: "#665f80" }}>{notes.filter(n => n.folder_id === f.id).length} notes</span>
                    <button className="btn" onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }} style={{ color: "#f76a8a", fontSize: 14, padding: "4px 8px" }}>✕</button>
                  </div>
                ))}
                {showNewFolder ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name"
                      style={{ flex: 1 }} onKeyDown={e => { if (e.key === "Enter") addFolder(); }} autoFocus />
                    <button className="btn" onClick={addFolder} style={S.primaryBtn}>Add</button>
                  </div>
                ) : (
                  <button className="btn" onClick={() => setShowNewFolder(true)}
                    style={{ ...S.primaryBtn, marginTop: 12, width: "100%", padding: "12px 0", textAlign: "center" }}>
                    + New Folder
                  </button>
                )}
              </div>
            )}

            {/* ACCOUNT — mobile */}
            {view === "account" && isMobile && (
              <div>
                <h1 style={{ ...S.pageTitle, fontSize: 20, marginBottom: 20 }}>Account</h1>
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#665f80", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Signed in as</div>
                  <div style={{ color: "#c9b8ff", wordBreak: "break-all" }}>{user?.email}</div>
                </div>
                <div className="card" style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#a09bbd" }}>Font size</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn" onClick={() => setFontSize(f => Math.max(12, f - 1))}
                      style={{ background: "#2d2a45", color: "#e8e4d9", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>A-</button>
                    <span style={{ color: "#7c6af7", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{fontSize}px</span>
                    <button className="btn" onClick={() => setFontSize(f => Math.min(22, f + 1))}
                      style={{ background: "#2d2a45", color: "#e8e4d9", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>A+</button>
                  </div>
                </div>
                <button className="btn" onClick={() => supabase.auth.signOut()}
                  style={{ ...S.primaryBtn, width: "100%", padding: "13px 0", textAlign: "center", background: "#f76a8a22", color: "#f76a8a", border: "1px solid #f76a8a44" }}>
                  Sign out
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        {isMobile && (
          <div style={{
            display: "flex", background: "#100e1c",
            borderTop: "1px solid #2d2a45",
            paddingBottom: "env(safe-area-inset-bottom, 12px)",
            flexShrink: 0, zIndex: 100,
          }}>
            {mobileNavItems.map(item => {
              const isActive = view === item.key || (item.key === "notes" && view === "note-edit");
              return (
                <button key={item.key} className="btn"
                  onClick={() => {
                    if (item.key === "notes") setEditingNote(null);
                    setView(item.key);
                  }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "10px 0 4px", color: isActive ? "#7c6af7" : "#665f80",
                    borderTop: isActive ? "2px solid #7c6af7" : "2px solid transparent",
                    transition: "all 0.15s" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Search Results ───────────────────────────────────────────
function SearchResults({ results, notes, allTasks, fontSize, onNoteClick }) {
  return results.map(r => {
    if (r.type === "note") {
      const n = notes.find(n => n.id === r.id);
      if (!n) return null;
      return (
        <div key={r.id} className="card" style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => onNoteClick(n)}>
          <span className="pill" style={{ background: "#7c6af722", color: "#7c6af7", marginBottom: 6, display: "inline-block" }}>Note</span>
          <div style={{ fontWeight: 600, color: "#d8d0f0" }}>{n.subject || "Untitled"}</div>
          <div style={{ fontSize: fontSize - 2, color: "#8884aa" }}>{n.note?.slice(0, 120)}…</div>
        </div>
      );
    } else {
      const t = allTasks.find(t => t.id === r.id);
      if (!t) return null;
      return (
        <div key={r.id} className="card" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill" style={{ background: "#f7936a22", color: "#f7936a" }}>Task</span>
          <span style={{ color: t.done ? "#665f80" : "#e8e4d9", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
          {t._fromNote && <span style={{ fontSize: 11, color: "#665f80" }}>↗ {t._noteSubject}</span>}
        </div>
      );
    }
  });
}

// ─── Note Editor ──────────────────────────────────────────────
function NoteEditor({ note, folders, tasks, fontSize, listening, isMobile, onStartVoice, onStopVoice, onBack, onDelete, onSummarize, onNoteChange, onAddTask, onToggleTask, onDeleteTask, onSegmentChange }) {
  const [apText, setApText] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const saveTimer = useRef(null);

  const handleField = (field, val) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onNoteChange(field, val), 600);
    onNoteChange(field, val);
  };

  const doSummarize = async () => { setSummarizing(true); await onSummarize(); setSummarizing(false); };
  const addAP = async () => { if (!apText.trim()) return; await onAddTask(apText.trim(), "this-week"); setApText(""); };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn" onClick={onBack} style={{ color: "#7c6af7", fontSize: 22 }}>←</button>
        <select value={note.folder_id || ""} onChange={e => handleField("folder_id", e.target.value || null)}
          style={{ fontSize: isMobile ? 12 : 13 }}>
          <option value="">No folder</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={listening ? onStopVoice : onStartVoice}
          style={{ background: listening ? "#f76a8a22" : "#7c6af722", color: listening ? "#f76a8a" : "#7c6af7", padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: 8, fontSize: isMobile ? 12 : 13 }}>
          {listening ? "⏹" : "🎙"}{!isMobile && (listening ? " Stop" : " Record")}
        </button>
        <button className="btn" onClick={doSummarize} disabled={summarizing}
          style={{ background: "#f7936a22", color: "#f7936a", padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: 8, fontSize: isMobile ? 12 : 13 }}>
          {summarizing ? "…" : "✨"}{!isMobile && (summarizing ? " …" : " Summarize")}
        </button>
        <button className="btn" onClick={onDelete} style={{ color: "#f76a8a", fontSize: isMobile ? 16 : 13 }}>🗑</button>
      </div>

      <input defaultValue={note.subject} key={note.id + "-subject"}
        onChange={e => handleField("subject", e.target.value)} placeholder="Subject / Title"
        style={{ fontSize: fontSize + (isMobile ? 2 : 4), fontWeight: 600, background: "transparent", border: "none",
          borderBottom: "2px solid #2d2a45", borderRadius: 0, padding: "8px 0", marginBottom: 16, color: "#d8d0f0", width: "100%" }} />

      <textarea defaultValue={note.note} key={note.id + "-note"}
        onChange={e => handleField("note", e.target.value)}
        placeholder="Write your note here… or tap 🎙 to speak."
        rows={isMobile ? 7 : 10} style={{ fontSize, marginBottom: 20, minHeight: isMobile ? 140 : 180, width: "100%" }} />

      <div style={{ fontWeight: 600, color: "#c9b8ff", fontSize: fontSize - 1, marginBottom: 10 }}>✅ Action Points</div>
      {tasks.length === 0 && <div style={{ color: "#665f80", fontStyle: "italic", marginBottom: 12, fontSize: fontSize - 2 }}>No action points yet.</div>}
      {tasks.map(t => (
        <div key={t.id} className="task-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #1e1c30" }}>
          <button className="btn" onClick={() => onToggleTask(t.id)} style={{ fontSize: 18, flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</button>
          <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#665f80" : "#e8e4d9", fontSize }}>{t.text}</span>
          {!isMobile && (
            <select value={t.segment} onChange={e => onSegmentChange(t.id, e.target.value)} style={{ fontSize: 11, padding: "2px 6px" }}>
              {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}
          <button className="btn task-del" onClick={() => onDeleteTask(t.id)}
            style={{ opacity: isMobile ? 1 : 0, color: "#f76a8a", transition: "opacity 0.15s", fontSize: 14 }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={apText} onChange={e => setApText(e.target.value)} placeholder="Add action point…"
          onKeyDown={e => { if (e.key === "Enter") addAP(); }} style={{ flex: 1 }} />
        <button className="btn" onClick={addAP} style={S.primaryBtn}>Add</button>
      </div>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, dot, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative" }} className="nav-item-wrap">
      <button className={`btn nav-btn ${active ? "active" : ""}`} onClick={onClick}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", flex: 1, textAlign: "left", fontSize: 14,
          color: active ? "#7c6af7" : "#a09bbd", background: active ? "#7c6af711" : "transparent", transition: "all 0.1s" }}>
        {dot ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} /> : icon && <span>{icon}</span>}
        {label}
      </button>
      {onDelete && (
        <button className="btn folder-del" onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ opacity: 0, position: "absolute", right: 10, color: "#f76a8a", fontSize: 11, transition: "opacity 0.15s" }}>✕</button>
      )}
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onNoteClick, onSegmentChange, folderColor, fontSize, isMobile }) {
  return (
    <div className="task-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: "1px solid #1e1c30" }}>
      <button className="btn" onClick={onToggle} style={{ marginTop: 2, flexShrink: 0, fontSize: 18 }}>{task.done ? "✅" : "⬜"}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "#665f80" : "#e8e4d9", wordBreak: "break-word" }}>{task.text}</span>
        {task._fromNote && (
          <button className="btn" onClick={onNoteClick}
            style={{ display: "block", marginTop: 2, fontSize: fontSize - 4, color: "#7c6af7", opacity: 0.7, textAlign: "left" }}>
            ↗ {task._noteSubject}
          </button>
        )}
      </div>
      {!isMobile && (
        <select value={task.segment} onChange={e => onSegmentChange(e.target.value)} style={{ fontSize: 11, padding: "2px 6px", flexShrink: 0 }}>
          {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )}
      {folderColor && <span style={{ width: 6, height: 6, borderRadius: "50%", background: folderColor, flexShrink: 0, marginTop: 6 }} />}
      <button className="btn task-del" onClick={onDelete}
        style={{ opacity: isMobile ? 1 : 0, color: "#f76a8a", transition: "opacity 0.15s", flexShrink: 0, fontSize: 14 }}>✕</button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const S = {
  root:           { fontFamily: "'Lora', 'Georgia', serif", background: "#0f0e17", color: "#e8e4d9", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:         { background: "#130f1e", borderBottom: "1px solid #2d2a45", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  sidebar:        { width: 210, background: "#100e1c", borderRight: "1px solid #2d2a45", display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0, padding: "12px 0" },
  sidebarSection: { margin: "16px 12px 6px", fontSize: 10, letterSpacing: 2, color: "#665f80", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" },
  pageHeader:     { display: "flex", alignItems: "center", marginBottom: 20, gap: 12 },
  pageTitle:      { fontSize: 22, fontWeight: 600, color: "#c9b8ff" },
  primaryBtn:     { background: "#7c6af7", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit" },
  empty:          { color: "#665f80", fontStyle: "italic", marginTop: 40, textAlign: "center" },
  label:          { display: "block", fontSize: 11, color: "#665f80", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; }
  body { height: 100%; overflow: hidden; -webkit-tap-highlight-color: transparent; }
  #root { height: 100%; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #3a3850; border-radius: 3px; }
  ::placeholder { color: #665f80; }
  .btn { cursor: pointer; border: none; background: none; color: inherit; font: inherit; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .card { background: #1a1828; border: 1px solid #2d2a45; border-radius: 12px; padding: 16px; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  input, textarea, select { background: #1a1828; border: 1px solid #2d2a45; border-radius: 8px; color: #e8e4d9; padding: 8px 12px; font: inherit; outline: none; resize: vertical; -webkit-appearance: none; }
  input:focus, textarea:focus, select:focus { border-color: #7c6af7; }
  select { -webkit-appearance: auto; appearance: auto; }
  .task-row:hover .task-del { opacity: 1 !important; }
  .nav-item-wrap:hover .folder-del { opacity: 1 !important; }
  .note-card:hover { border-color: #7c6af7 !important; cursor: pointer; }
  .seg-btn.active { background: #7c6af7 !important; color: #fff !important; }
  .nav-btn.active { color: #7c6af7 !important; }
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
  @media (max-width: 767px) {
    input, textarea { font-size: 16px !important; }
    * { -webkit-text-size-adjust: none; }
  }
`;
