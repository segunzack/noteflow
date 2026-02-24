// ============================================================
//  NoteFlow — Full App with Supabase Auth + Data
//
//  SETUP (2 minutes):
//  1. Create a project at https://supabase.com
//  2. Run supabase_schema.sql in SQL Editor → New Query
//  3. Replace the two constants below with your project values
//     (found in: Project Settings → API)
// ============================================================

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── 🔧 CONFIG — replace these two values ────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Contexts ────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── Segment config ──────────────────────────────────────────
const SEGMENTS = [
  { key: "today",     label: "Today",     icon: "☀️" },
  { key: "this-week", label: "This Week", icon: "📅" },
  { key: "project",   label: "Project",   icon: "🎯" },
  { key: "waiting",   label: "Waiting",   icon: "⏳" },
  { key: "someday",   label: "Someday",   icon: "🌙" },
];

const FOLDER_COLORS = ["#7c6af7","#f7936a","#4fc4cf","#f7c948","#a8d96c","#f76a8a"];

// ─── Semantic search helpers ──────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

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
    <div style={styles.root}>
      <style>{globalCSS}</style>
      <div style={{ margin: "auto", color: "#7c6af7", fontSize: 32, animation: "pulse 1.2s ease-in-out infinite" }}>✦</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup | reset
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
    } catch (e) {
      setMessage({ type: "err", text: e.message });
    }
    setLoading(false);
  };

  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>
      <div style={{ margin: "auto", width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 28, fontWeight: 600, color: "#c9b8ff", letterSpacing: "-1px" }}>NoteFlow</div>
          <div style={{ color: "#665f80", fontSize: 13, marginTop: 4 }}>Your portable thinking assistant</div>
        </div>

        <div style={{ background: "#1a1828", border: "1px solid #2d2a45", borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#100e1c", borderRadius: 10, padding: 4 }}>
            {["login","signup"].map(m => (
              <button key={m} className="btn" onClick={() => { setMode(m); setMessage(null); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 13, fontWeight: 600,
                  background: mode === m ? "#7c6af7" : "transparent",
                  color: mode === m ? "#fff" : "#665f80", transition: "all 0.15s" }}>
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
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && submit()}
              style={{ width: "100%" }} autoFocus />
          </div>

          {mode !== "reset" && (
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Password</label>
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
//  MAIN APP (authenticated)
// ═══════════════════════════════════════════════════════════════
function NoteFlowApp() {
  const { user } = useAuth();

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

  // ─── Load data ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: f }, { data: n }, { data: t }] = await Promise.all([
        supabase.from("folders").select("*").order("created_at"),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at"),
      ]);
      setFolders(f || []);
      setNotes(n || []);
      setTasks(t || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // ─── Derived ────────────────────────────────────────────────
  const allTasks = [
    ...tasks.filter(t => !t.note_id),
    ...tasks.filter(t => !!t.note_id).map(t => {
      const note = notes.find(n => n.id === t.note_id);
      return { ...t, _fromNote: true, _noteSubject: note?.subject || "Note" };
    }),
  ];

  // ─── Search ─────────────────────────────────────────────────
  const runSearch = useCallback((q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const qTokens = tokenize(q);
    const docs = [
      ...notes.map(n => ({ type: "note", id: n.id, text: `${n.subject} ${n.note}` })),
      ...allTasks.map(t => ({ type: "task", id: t.id, text: t.text })),
    ];
    const vocab = [...new Set(docs.flatMap(d => tokenize(d.text)).concat(qTokens))];
    const qVec = buildVector(qTokens, vocab);
    const scored = docs
      .map(d => ({ ...d, score: cosineSim(qVec, buildVector(tokenize(d.text), vocab)) }))
      .filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
    setSearchResults(scored);
  }, [notes, allTasks]);

  useEffect(() => { if (view === "search") runSearch(searchQuery); }, [searchQuery, view, runSearch]);

  // ─── Folder CRUD ────────────────────────────────────────────
  const addFolder = async () => {
    if (!newFolderName.trim()) return;
    const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
    const { data, error } = await supabase.from("folders")
      .insert({ user_id: user.id, name: newFolderName.trim(), color }).select().single();
    if (!error) { setFolders(f => [...f, data]); setNewFolderName(""); setShowNewFolder(false); }
  };

  const deleteFolder = async (id) => {
    await supabase.from("folders").delete().eq("id", id);
    setFolders(f => f.filter(x => x.id !== id));
    if (activeFolder === id) setActiveFolder(null);
  };

  // ─── Note CRUD ──────────────────────────────────────────────
  const newNote = async () => {
    const { data, error } = await supabase.from("notes")
      .insert({ user_id: user.id, folder_id: activeFolder, subject: "", note: "" })
      .select().single();
    if (!error) { setNotes(n => [data, ...n]); setEditingNote(data); setView("note-edit"); }
  };

  const updateNote = async (updated) => {
    await supabase.from("notes").update({
      subject: updated.subject, note: updated.note, folder_id: updated.folder_id
    }).eq("id", updated.id);
    setNotes(n => n.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    setEditingNote(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  };

  const deleteNote = async (id) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes(n => n.filter(x => x.id !== id));
    setTasks(t => t.filter(x => x.note_id !== id));
    setView("notes");
  };

  // ─── Task CRUD ──────────────────────────────────────────────
  const addTask = async (text, segment, noteId = null, folderId = null) => {
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, text, segment, note_id: noteId,
      folder_id: folderId || activeFolder, done: false
    }).select().single();
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

  // ─── AI Summarize ───────────────────────────────────────────
  const summarizeNote = async (note) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Summarize this note and extract action points. Respond ONLY with a JSON object with keys "summary" (string) and "actionPoints" (array of strings). Note:\n\nSubject: ${note.subject}\n\n${note.note}` }]
        })
      });
      const json = await res.json();
      const text = json.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        await updateNote({ ...note, note: `${note.note}\n\n📋 AI Summary: ${parsed.summary}` });
        for (const apText of (parsed.actionPoints || [])) {
          await addTask(apText, "this-week", note.id, note.folder_id);
        }
      }
    } catch (e) { console.error("Summarize error:", e); }
  };

  // ─── Voice ──────────────────────────────────────────────────
  const { listening, start: startVoice, stop: stopVoice } = useSpeechRecognition((t) => {
    if (editingNote) {
      const updated = { ...editingNote, note: (editingNote.note + " " + t).trim() };
      setEditingNote(updated);
    }
  });

  // ─── Filtered ───────────────────────────────────────────────
  const visibleNotes  = notes.filter(n => activeFolder ? n.folder_id === activeFolder : true);
  const segmentedTasks = allTasks.filter(t => t.segment === activeSegment);
  const folderColor   = (id) => folders.find(f => f.id === id)?.color || "#888";

  if (loading) return <Splash />;

  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      {/* Top Bar */}
      <div style={styles.topBar}>
        <button className="btn" onClick={() => setSidebarOpen(o => !o)} style={{ fontSize: 18, color: "#7c6af7" }}>☰</button>
        <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 18, color: "#c9b8ff", letterSpacing: "-0.5px" }}>NoteFlow</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 13 }}>🔍</span>
          <input placeholder="Semantic search…" value={searchQuery}
            onFocus={() => setView("search")}
            onChange={e => { setSearchQuery(e.target.value); setView("search"); }}
            style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button className="btn" onClick={() => setFontSize(f => Math.max(12, f - 1))} style={{ opacity: 0.6, fontSize: 11 }}>A-</button>
          <button className="btn" onClick={() => setFontSize(f => Math.min(22, f + 1))} style={{ opacity: 0.6, fontSize: 15 }}>A+</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7c6af733", border: "1px solid #7c6af7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#7c6af7", fontWeight: 600 }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <button className="btn" onClick={() => supabase.auth.signOut()} style={{ fontSize: 12, color: "#665f80" }}>Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={styles.sidebar}>
            <NavItem icon="✅" label="To-Dos" active={view === "todos"} onClick={() => setView("todos")} />
            <NavItem icon="📝" label="Notes" active={view === "notes" || view === "note-edit"}
              onClick={() => { setView("notes"); setEditingNote(null); }} />
            <NavItem icon="🔍" label="Search" active={view === "search"} onClick={() => setView("search")} />

            <div style={styles.sidebarSection}>Folders</div>
            {folders.map(f => (
              <NavItem key={f.id} label={f.name} dot={f.color}
                active={activeFolder === f.id}
                onClick={() => { setActiveFolder(f.id === activeFolder ? null : f.id); setView("notes"); }}
                onDelete={() => deleteFolder(f.id)} />
            ))}
            {showNewFolder ? (
              <div style={{ padding: "4px 12px", display: "flex", gap: 4 }}>
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Folder name" style={{ fontSize: 12, height: 28 }}
                  onKeyDown={e => { if (e.key === "Enter") addFolder(); if (e.key === "Escape") setShowNewFolder(false); }} autoFocus />
                <button className="btn" onClick={addFolder} style={{ color: "#7c6af7", fontSize: 16 }}>+</button>
              </div>
            ) : (
              <button className="btn" onClick={() => setShowNewFolder(true)}
                style={{ margin: "4px 12px", color: "#665f80", fontSize: 12, textAlign: "left" }}>+ New folder</button>
            )}
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>

          {/* TO-DOS */}
          {view === "todos" && (
            <div>
              <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>To-Dos</h1>
                <div style={{ flex: 1 }} />
                <button className="btn" onClick={() => setShowAddTask(o => !o)} style={styles.primaryBtn}>+ Add Task</button>
              </div>

              {showAddTask && (
                <div className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Task description…" style={{ flex: "1 1 200px", minWidth: 0 }}
                    onKeyDown={e => { if (e.key === "Enter") addStandaloneTask(); }} autoFocus />
                  <select value={newTaskSegment} onChange={e => setNewTaskSegment(e.target.value)}>
                    {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button className="btn" onClick={addStandaloneTask} style={styles.primaryBtn}>Add</button>
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                {SEGMENTS.map(s => (
                  <button key={s.key} className={`btn seg-btn ${activeSegment === s.key ? "active" : ""}`}
                    onClick={() => setActiveSegment(s.key)}
                    style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, background: "#1a1828", border: "1px solid #2d2a45", color: "#a09bbd", transition: "all 0.15s" }}>
                    {s.icon} {s.label}
                    <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4 }}>{allTasks.filter(t => t.segment === s.key && !t.done).length}</span>
                  </button>
                ))}
              </div>

              {segmentedTasks.length === 0
                ? <div style={styles.empty}>No tasks here — add one above ✨</div>
                : segmentedTasks.map(t => (
                  <TaskRow key={t.id} task={t} fontSize={fontSize}
                    folderColor={t.folder_id ? folderColor(t.folder_id) : null}
                    onToggle={() => toggleTask(t.id)}
                    onDelete={() => deleteTask(t.id)}
                    onSegmentChange={(seg) => updateTaskSegment(t.id, seg)}
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
              <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>{activeFolder ? folders.find(f => f.id === activeFolder)?.name || "Notes" : "All Notes"}</h1>
                <div style={{ flex: 1 }} />
                <button className="btn" onClick={newNote} style={styles.primaryBtn}>+ New Note</button>
              </div>
              {visibleNotes.length === 0
                ? <div style={styles.empty}>No notes yet — create one ✨</div>
                : <div style={styles.noteGrid}>
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
              note={editingNote}
              folders={folders}
              tasks={tasks.filter(t => t.note_id === editingNote.id)}
              fontSize={fontSize}
              listening={listening}
              onStartVoice={startVoice}
              onStopVoice={stopVoice}
              onBack={() => setView("notes")}
              onDelete={() => deleteNote(editingNote.id)}
              onSummarize={() => summarizeNote(editingNote)}
              onNoteChange={(field, val) => {
                const updated = { ...editingNote, [field]: val };
                setEditingNote(updated);
                updateNote(updated);
              }}
              onAddTask={(text, segment) => addTask(text, segment, editingNote.id, editingNote.folder_id)}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onSegmentChange={updateTaskSegment}
            />
          )}

          {/* SEARCH */}
          {view === "search" && (
            <div>
              <h1 style={{ ...styles.pageTitle, marginBottom: 20 }}>🔍 Smart Search</h1>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search anything — semantic matching enabled…"
                style={{ marginBottom: 20, fontSize, width: "100%" }} autoFocus />
              {!searchQuery && <div style={styles.empty}>Start typing to find notes and tasks by meaning, not just keywords.</div>}
              {searchResults.length === 0 && searchQuery && <div style={styles.empty}>No results found.</div>}
              {searchResults.map(r => {
                if (r.type === "note") {
                  const n = notes.find(n => n.id === r.id);
                  if (!n) return null;
                  return (
                    <div key={r.id} className="card" style={{ marginBottom: 10, cursor: "pointer" }}
                      onClick={() => { setEditingNote(n); setView("note-edit"); }}>
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
                      <span style={{ color: t.done ? "#665f80" : "#e8e4d9", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                      {t._fromNote && <span style={{ fontSize: 11, color: "#665f80", marginLeft: "auto" }}>from: {t._noteSubject}</span>}
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  NOTE EDITOR
// ═══════════════════════════════════════════════════════════════
function NoteEditor({ note, folders, tasks, fontSize, listening, onStartVoice, onStopVoice, onBack, onDelete, onSummarize, onNoteChange, onAddTask, onToggleTask, onDeleteTask, onSegmentChange }) {
  const [apText, setApText]       = useState("");
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn" onClick={onBack} style={{ color: "#7c6af7", fontSize: 20 }}>←</button>
        <select value={note.folder_id || ""} onChange={e => handleField("folder_id", e.target.value || null)}>
          <option value="">No folder</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={listening ? onStopVoice : onStartVoice}
          style={{ background: listening ? "#f76a8a22" : "#7c6af722", color: listening ? "#f76a8a" : "#7c6af7", padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>
          {listening ? "⏹ Stop" : "🎙 Record"}
        </button>
        <button className="btn" onClick={doSummarize} disabled={summarizing}
          style={{ background: "#f7936a22", color: "#f7936a", padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>
          {summarizing ? "✨ …" : "✨ Summarize"}
        </button>
        <button className="btn" onClick={onDelete} style={{ color: "#f76a8a", fontSize: 13 }}>🗑 Delete</button>
      </div>

      <input defaultValue={note.subject} key={note.id + "-subject"}
        onChange={e => handleField("subject", e.target.value)}
        placeholder="Subject / Title"
        style={{ fontSize: fontSize + 4, fontWeight: 600, background: "transparent", border: "none", borderBottom: "2px solid #2d2a45", borderRadius: 0, padding: "8px 0", marginBottom: 16, color: "#d8d0f0", width: "100%" }} />

      <textarea defaultValue={note.note} key={note.id + "-note"}
        onChange={e => handleField("note", e.target.value)}
        placeholder="Write your note here… or tap Record to speak."
        rows={10} style={{ fontSize, marginBottom: 20, minHeight: 180, width: "100%" }} />

      <div style={{ fontWeight: 600, color: "#c9b8ff", fontSize: fontSize - 1, marginBottom: 10 }}>✅ Action Points</div>
      {tasks.length === 0 && <div style={{ ...styles.empty, fontSize: fontSize - 2, marginBottom: 12, textAlign: "left" }}>No action points yet.</div>}
      {tasks.map(t => (
        <div key={t.id} className="task-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #1e1c30" }}>
          <button className="btn" onClick={() => onToggleTask(t.id)} style={{ fontSize: 16, flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</button>
          <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#665f80" : "#e8e4d9", fontSize }}>{t.text}</span>
          <select value={t.segment} onChange={e => onSegmentChange(t.id, e.target.value)} style={{ fontSize: 11, padding: "2px 6px" }}>
            {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn task-del" onClick={() => onDeleteTask(t.id)} style={{ opacity: 0, color: "#f76a8a", transition: "opacity 0.15s" }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={apText} onChange={e => setApText(e.target.value)} placeholder="Add action point…"
          onKeyDown={e => { if (e.key === "Enter") addAP(); }} style={{ flex: 1 }} />
        <button className="btn" onClick={addAP} style={styles.primaryBtn}>Add</button>
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
        <button className="btn folder-del" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ opacity: 0, position: "absolute", right: 10, color: "#f76a8a", fontSize: 11, transition: "opacity 0.15s" }}>✕</button>
      )}
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onNoteClick, onSegmentChange, folderColor, fontSize }) {
  return (
    <div className="task-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #1e1c30" }}>
      <button className="btn" onClick={onToggle} style={{ marginTop: 2, flexShrink: 0, fontSize: 16 }}>{task.done ? "✅" : "⬜"}</button>
      <div style={{ flex: 1 }}>
        <span style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "#665f80" : "#e8e4d9" }}>{task.text}</span>
        {task._fromNote && (
          <button className="btn" onClick={onNoteClick} style={{ marginLeft: 8, fontSize: fontSize - 3, color: "#7c6af7", opacity: 0.7 }}>↗ {task._noteSubject}</button>
        )}
      </div>
      <select value={task.segment} onChange={e => onSegmentChange(e.target.value)} style={{ fontSize: 11, padding: "2px 6px", flexShrink: 0 }}>
        {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      {folderColor && <span style={{ width: 6, height: 6, borderRadius: "50%", background: folderColor, flexShrink: 0, marginTop: 6 }} />}
      <button className="btn task-del" onClick={onDelete} style={{ opacity: 0, color: "#f76a8a", transition: "opacity 0.15s", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ─── Styles & CSS ─────────────────────────────────────────────
const styles = {
  root:           { fontFamily: "'Lora', 'Georgia', serif", background: "#0f0e17", color: "#e8e4d9", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:         { background: "#130f1e", borderBottom: "1px solid #2d2a45", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  sidebar:        { width: 210, background: "#100e1c", borderRight: "1px solid #2d2a45", display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0, padding: "12px 0" },
  sidebarSection: { margin: "16px 12px 6px", fontSize: 10, letterSpacing: 2, color: "#665f80", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" },
  pageHeader:     { display: "flex", alignItems: "center", marginBottom: 20, gap: 12 },
  pageTitle:      { fontSize: 22, fontWeight: 600, color: "#c9b8ff" },
  primaryBtn:     { background: "#7c6af7", color: "#fff", padding: "6px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "none", fontFamily: "inherit" },
  noteGrid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  empty:          { color: "#665f80", fontStyle: "italic", marginTop: 40, textAlign: "center" },
  label:          { display: "block", fontSize: 11, color: "#665f80", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 },
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #3a3850; border-radius: 3px; }
  ::placeholder { color: #665f80; }
  .btn { cursor: pointer; border: none; background: none; color: inherit; font: inherit; }
  .card { background: #1a1828; border: 1px solid #2d2a45; border-radius: 12px; padding: 16px; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  input, textarea, select { background: #1a1828; border: 1px solid #2d2a45; border-radius: 8px; color: #e8e4d9; padding: 8px 12px; font: inherit; outline: none; resize: vertical; }
  input:focus, textarea:focus, select:focus { border-color: #7c6af7; }
  .task-row:hover .task-del { opacity: 1 !important; }
  .nav-item-wrap:hover .folder-del { opacity: 1 !important; }
  .note-card:hover { border-color: #7c6af7 !important; cursor: pointer; }
  .seg-btn.active { background: #7c6af7 !important; color: #fff !important; }
  .nav-btn.active { color: #7c6af7 !important; }
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
`;
