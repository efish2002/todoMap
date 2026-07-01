import { useEffect, useState } from "react";
import { api } from "./api";
import type { Person, Project, Todo } from "./types";
import { GraphView } from "./components/GraphView";
import { Sidebar } from "./components/Sidebar";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { TodoDialog } from "./components/TodoDialog";
import { ProjectDialog } from "./components/ProjectDialog";
import { EmptyState } from "./components/EmptyState";

export default function App() {
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
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
    const ps = await api.listPeople();
    setPeople(ps);
    setProjects(await api.listProjects(false));
    setTodos(await api.listTodos());
  };

  const onMeCreated = async (m: Person) => {
    setMe(m);
    await refresh();
  };

  if (!loaded) return <div className="app-loading">加载中...</div>;
  if (!me) return <OnboardingDialog onCreated={onMeCreated} />;

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null;
  const filteredTodos = todos.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });
  const showEmpty = people.length <= 1 && projects.length === 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">●</span>
          <span className="brand-name">todoMap</span>
        </div>
        <button className="topbar-btn" onClick={() => setShowNewProject(true)}>项目 ({projects.length})</button>
        <input
          className="search"
          placeholder="搜索 todo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="primary topbar-btn" onClick={() => setShowNewTodo(true)} disabled={projects.length === 0}>
          + 新增委托
        </button>
      </header>

      <div className="body">
        <main className="graph">
          {showEmpty ? (
            <EmptyState
              title="从第一个项目开始"
              hint="todoMap 让你以图的方式看到和协作人之间的委托关系。先建一个项目,然后给协作人派活。"
              onAction={() => setShowNewProject(true)}
              actionLabel="+ 新建项目"
            />
          ) : (
            <GraphView
              me={me}
              people={people}
              projects={projects}
              todos={filteredTodos}
              selectedId={selectedPersonId}
              onSelectNode={setSelectedPersonId}
              onSelectEdge={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
            />
          )}
        </main>
        <Sidebar
          me={me}
          selected={selectedPerson}
          todos={todos}
          people={people}
          onOpenTodo={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
          onToggleDone={async (id, done) => {
            try {
              await api.setTodoStatus(id, done ? "done" : "pending");
              await refresh();
            } catch (e) {
              console.error("toggle done failed", e);
            }
          }}
        />
      </div>

      <footer className="statusbar">
        <span className="stat">{projects.length} 个项目</span>
        <span className="stat-sep">·</span>
        <span className="stat">{people.length} 个人</span>
        <span className="stat-sep">·</span>
        <span className="stat">
          {todos.length} 条委托
          {todos.filter((t) => t.status === "in_progress").length > 0 &&
            " · " + todos.filter((t) => t.status === "in_progress").length + " 进行中"}
        </span>
        <span className="grow"></span>
        <button className="ghost" onClick={async () => {
          const json = await api.exportJson();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "todomap-" + new Date().toISOString().slice(0, 10) + ".json";
          a.click();
          URL.revokeObjectURL(url);
        }}>导出 JSON</button>
      </footer>

      {showNewTodo && projects.length > 0 && (
        <TodoDialog
          me={me} people={people} projects={projects}
          editing={null}
          onClose={() => setShowNewTodo(false)}
          onSaved={async () => { setShowNewTodo(false); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }}
        />
      )}
      {editingTodo && (
        <TodoDialog
          me={me} people={people} projects={projects}
          editing={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSaved={async () => { setEditingTodo(null); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }}
        />
      )}
      {showNewProject && (
        <ProjectDialog
          editing={null}
          onClose={() => setShowNewProject(false)}
          onSaved={async () => { setShowNewProject(false); await refresh(); }}
        />
      )}
    </div>
  );
}
