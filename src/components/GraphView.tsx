import { useCallback, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { layoutGraph, type Point } from "../graph/layout";
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
  // User-dragged positions override the auto layout. Persists for the session.
  const [userPositions, setUserPositions] = useState<Map<number, Point>>(new Map());

  const autoPositions = useMemo(
    () =>
      layoutGraph({
        meId: me.id,
        people: people.map((p) => ({ id: p.id, name: p.name })),
        todos: todos.map((t) => ({ from_person_id: t.from_person_id, to_person_id: t.to_person_id })),
      }),
    [me.id, people, todos],
  );

  // For each person, prefer the user-dragged position if it exists, otherwise the auto layout.
  const positions = useMemo(() => {
    const merged = new Map<number, Point>();
    for (const p of people) {
      merged.set(p.id, userPositions.get(p.id) ?? autoPositions.get(p.id) ?? { x: 0, y: 0 });
    }
    return merged;
  }, [people, autoPositions, userPositions]);

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
          draggable: !p.is_me, // "me" stays pinned at the center
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
            cursor: p.is_me ? "default" : "grab",
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

  // When the user finishes dragging a node, remember where they put it so the
  // auto-layout doesn't snap it back. Skip "me" (it's pinned).
  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      const id = Number(node.id);
      if (!Number.isFinite(id)) return;
      const meId = me.id;
      if (id === meId) return;
      setUserPositions((prev) => {
        const next = new Map(prev);
        next.set(id, { x: node.position.x, y: node.position.y });
        return next;
      });
    },
    [me.id],
  );

  const resetLayout = useCallback(() => setUserPositions(new Map()), []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeDragStop={onNodeDragStop}
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
      <button
        className="layout-reset"
        onClick={resetLayout}
        title="重置自动布局"
      >↺ 重置布局</button>
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
