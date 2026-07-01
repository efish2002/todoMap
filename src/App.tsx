import { useEffect, useState } from "react";
import { isTauri as _isTauri } from "@tauri-apps/api/core";
import { api } from "./api";
import type { Person, Project, Todo } from "./types";
import { GraphView } from "./components/GraphView";
import { Sidebar } from "./components/Sidebar";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { TodoDialog } from "./components/TodoDialog";
import { ProjectDialog } from "./components/ProjectDialog";
import { EditPersonDialog } from "./components/EditPersonDialog";
import { EmptyState } from "./components/EmptyState";
import { previewMe, previewPeople, previewProjects, previewTodos } from "./previewData";

const isTauri = typeof window !== "undefined" && _isTauri();

export default function App() {
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isTauri) {
        setMe(previewMe);
        setPeople(previewPeople);
        setProjects(previewProjects);
        setTodos(previewTodos);
        setLoaded(true);
        return;
      }
      const ps = await api.listPeople();
      const m = ps.find((p) => p.is_me);
      if (m) {
        setMe(m);
        setPeople(ps);
        setProjects(await api.listProjects(false));
        setTodos(await api.listTodos());
      }
      setLoaded(true);
    })();
  }, []);

  const refresh = async () => {
    if (!isTauri) { setTodos((prev) => prev.slice()); return; }
    const ps = await api.listPeople();
    setPeople(ps);
    setProjects(await api.listProjects(false));
    setTodos(await api.listTodos());
  };

  const onMeCreated = async (m: Person) => { setMe(m); await refresh(); };

  if (!loaded) return <div className="app-loading">加载中…</div>;
  if (!me) return <OnboardingDialog onCreated={onMeCreated} />;

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null;
  const filteredTodos = todos.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });
  const showEmpty = people.length <= 1 && projects.length === 0;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const done = todos.filter((t) => t.status === "done").length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <span className="brand-name">todoMap</span>
          <div className="segmented" role="tablist" aria-label="项目">
            <button className="seg-item active" role="tab" aria-selected="true">
              项目<span className="count">({projects.length})</span>
            </button>
          </div>
        </div>
        <div className="search-wrap">
          <span className="search-icon" aria-hidden>⌕</span>
          <input
            className="search"
            placeholder="搜索 todo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索 todo"
          />
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={() => setShowNewProject(true)} title="新建项目">
            + 新建项目
          </button>
          <button
            className="btn-ghost"
            onClick={() => setEditingPerson(me)}
            title="编辑我的信息"
            disabled={!me}
          >
            <span className="me-dot" aria-hidden /> 编辑我
          </button>
          <button className="btn-primary" onClick={() => setShowNewTodo(true)} disabled={projects.length === 0}>
            + 新增请求
          </button>
        </div>
      </header>

      <div className="body">
        <main className="graph">
          {showEmpty ? (
            <EmptyState
              title="从第一个项目开始"
              hint="todoMap 让你以图的方式看到和协作人之间的请求关系。先建一个项目，然后让协作人活起来。"
              onAction={() => setShowNewProject(true)}
              actionLabel="+ 新建项目"
            />
          ) : (
            <GraphView
              me={me} people={people} projects={projects} todos={filteredTodos}
              selectedId={selectedPersonId}
              onSelectNode={setSelectedPersonId}
              onSelectEdge={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
              onEditPerson={(id) => { const p = people.find((x) => x.id === id); if (p) setEditingPerson(p); }}
            />
          )}
        </main>
        <Sidebar
          me={me} selected={selectedPerson} todos={todos} people={people}
          onOpenTodo={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
          onToggleDone={async (id, done) => {
            if (!isTauri) {
              setTodos((prev) => prev.map((t) => t.id === id ? { ...t, status: done ? "done" : "pending" } : t));
              return;
            }
            try { await api.setTodoStatus(id, done ? "done" : "pending"); await refresh(); }
            catch (e) { console.error("toggle done failed", e); }
          }}
          onEditPerson={(p) => setEditingPerson(p)}
        />
      </div>

      <footer className="statusbar">
        <span className="stat">{projects.length} 个项目</span>
        <span className="stat-sep">·</span>
        <span className="stat">{people.length} 个人</span>
        <span className="stat-sep">·</span>
        <span className="stat">
          {todos.length} 条请求
          {inProgress > 0 && " · " + inProgress + " 进行中"}
          {done > 0 && " · " + done + " 已完成"}
        </span>
        <span style={{ flex: 1 }}></span>
        <button className="btn-ghost" onClick={async () => {
          if (!isTauri) {
            const blob = new Blob([JSON.stringify({ me, people, projects, todos }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "todomap-preview.json"; a.click();
            URL.revokeObjectURL(url);
            return;
          }
          const json = await api.exportJson();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "todomap-" + new Date().toISOString().slice(0, 10) + ".json";
          a.click(); URL.revokeObjectURL(url);
        }}>导出 JSON</button>
      </footer>

      {showNewTodo && projects.length > 0 && (
        <TodoDialog me={me} people={people} projects={projects} editing={null}
          onClose={() => setShowNewTodo(false)}
          onSaved={async () => { setShowNewTodo(false); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }} />
      )}
      {editingTodo && (
        <TodoDialog me={me} people={people} projects={projects} editing={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSaved={async () => { setEditingTodo(null); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }} />
      )}
      {showNewProject && (
        <ProjectDialog editing={null}
          onClose={() => setShowNewProject(false)}
          onSaved={async () => { setShowNewProject(false); await refresh(); }} />
      )}
      {editingPerson && (
        <EditPersonDialog person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onSaved={async () => { setEditingPerson(null); await refresh(); }} />
      )}
    </div>
  );
}