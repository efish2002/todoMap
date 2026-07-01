import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { layoutGraph } from "../graph/layout";
import { buildEdges } from "../graph/edges";
import type { Person, Project, Todo } from "../types";

interface Props {
  me: Person;
  people: Person[];
  projects: Project[];
  todos: Todo[];
  selectedId: number | null;
  onSelectNode: (personId: number | null) => void;
  onSelectEdge: (todoId: number) => void;
}

export function GraphView(props: Props) {
  const { me, people, projects, todos, selectedId, onSelectNode, onSelectEdge } = props;
  const [menu, setMenu] = useState<{ kind: "node" | "edge"; x: number; y: number; id: number } | null>(null);

  const positions = useMemo(
    () =>
      layoutGraph({
        meId: me.id,
        people: people.map((p) => ({ id: p.id, name: p.name })),
        todos: todos.map((t) => ({ from_person_id: t.from_person_id, to_person_id: t.to_person_id })),
      }),
    [me.id, people, todos],
  );

  const colorByPerson = useMemo(() => {
    const m = new Map<number, string>();
    const recent = new Map<number, { project_id: number; ts: string }>();
    const projColor = new Map(projects.map((p) => [p.id, p.color]));
    for (const t of todos) {
      const cur = recent.get(t.to_person_id);
      if (!cur || cur.ts < t.updated_at) recent.set(t.to_person_id, { project_id: t.project_id, ts: t.updated_at });
      const cur2 = recent.get(t.from_person_id);
      if (!cur2 || cur2.ts < t.updated_at) recent.set(t.from_person_id, { project_id: t.project_id, ts: t.updated_at });
    }
    for (const [pid, info] of recent) {
      const c = projColor.get(info.project_id);
      if (c) m.set(pid, c);
    }
    return m;
  }, [people, projects, todos]);

  const nodes: Node[] = useMemo(
    () =>
      people.map((p) => {
        const pos = positions.get(p.id) ?? { x: 0, y: 0 };
        const color = colorByPerson.get(p.id) ?? "#5a5f70";
        const selected = selectedId === p.id;
        return {
          id: String(p.id),
          position: pos,
          data: { label: p.name, isMe: p.is_me, color },
          style: {
            background: p.is_me ? "#e8c547" : "#1f2330",
            color: p.is_me ? "#1a1f2e" : "#e6e9f0",
            border: selected ? "3px solid #e8c547" : (p.is_me ? "2px solid #e8c547" : "2px solid " + color),
            boxShadow: selected ? "0 0 0 4px rgba(232,197,71,0.18)" : "none",
            borderRadius: "50%",
            width: 60,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: p.is_me ? 700 : 500,
          },
        };
      }),
    [people, positions, colorByPerson, selectedId],
  );

  const edges: Edge[] = useMemo(() => {
    const built = buildEdges(todos, projects);
    return built.map((e) => {
      const offset = e.arcCount > 1 ? (e.arcIndex - (e.arcCount - 1) / 2) * 30 : 0;
      const t = todos.find((x) => x.id === e.todo_id);
      return {
        id: String(e.id),
        source: String(e.source),
        target: String(e.target),
        type: "default",
        animated: e.status === "in_progress",
        label: t?.title,
        style: {
          stroke: e.color,
          strokeWidth: 1,
          strokeDasharray: e.dashed ? "4 4" : undefined,
          opacity: e.dashed ? 0.4 : 0.85,
        },
        pathOptions: { curvature: offset / 200 },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.color },
        data: { todo_id: e.todo_id },
        labelStyle: { fontSize: 10, fill: "#aab0c0" },
        labelBgStyle: { fill: "#0f1320" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
      };
    });
  }, [todos, projects]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, n) => { setMenu(null); onSelectNode(Number(n.id)); }}
        onEdgeClick={(_, e) => { setMenu(null); onSelectEdge(Number(e.id)); }}
        onNodeContextMenu={(e, n) => { e.preventDefault(); setMenu({ kind: "node", x: e.clientX, y: e.clientY, id: Number(n.id) }); }}
        onEdgeContextMenu={(e, ed) => { e.preventDefault(); setMenu({ kind: "edge", x: e.clientX, y: e.clientY, id: Number(ed.id) }); }}
        onPaneClick={() => { setMenu(null); onSelectNode(null); }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222a3a" gap={24} size={1} />
        <Controls />
      </ReactFlow>
      {menu && (
        <div className="ctxmenu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {menu.kind === "node" && (
            <button onClick={() => { onSelectNode(menu.id); setMenu(null); }}>查看详情</button>
          )}
          {menu.kind === "edge" && (
            <button onClick={() => { onSelectEdge(menu.id); setMenu(null); }}>打开 todo</button>
          )}
        </div>
      )}
    </div>
  );
}
