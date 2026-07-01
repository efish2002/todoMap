import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { layoutGraph } from "../graph/layout";
import { buildEdges } from "../graph/edges";
import type { Person, Project, Todo, TodoStatus } from "../types";

interface Props {
  me: Person;
  people: Person[];
  projects: Project[];
  todos: Todo[];
  selectedId: number | null;
  onSelectNode: (personId: number | null) => void;
  onSelectEdge: (todoId: number) => void;
  onEditPerson: (personId: number) => void;
}

interface NodeData {
  label: string;
  isMe: boolean;
  color: string;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  pending: number;
  inProgress: number;
  done: number;
  blocked: number;
  selfCount: number;
  index: number;
  onEdit: (id: number) => void;
}

const handleStyle: CSSProperties = { background: "transparent", border: 0, opacity: 0, width: 1, height: 1 };

const STATUS_STROKE: Record<TodoStatus, string> = {
  pending: "#007AFF",
  in_progress: "#FF9500",
  done: "#34C759",
  blocked: "#FF3B30",
};

function PersonNode({ data, id }: NodeProps<NodeData>) {
  const { label, isMe, color, selected, hovered, dimmed, pending, inProgress, done, blocked, selfCount, index, onEdit } = data;
  const cls =
    "tnode" +
    (selected ? " selected" : "") +
    (hovered ? " hovered" : "") +
    (isMe ? " ring-pulse" : "") +
    (dimmed ? " dimmed" : "");
  const badgeCls = isMe ? "avatar avatar-me" : "avatar avatar-color-" + (index % 8);
  const total = pending + inProgress + done + blocked;
  const overflow = pending + inProgress + blocked;
  const personId = Number(id);
  return (
    <div
      className={cls}
      style={{ borderColor: selected ? "var(--accent)" : "var(--hairline)", cursor: "grab" }}
      onDoubleClick={(e) => { e.stopPropagation(); onEdit(personId); }}
      title={isMe ? "双击编辑我的信息" : ("双击编辑 " + label + " 的信息 · 拖动调整位置")}
    >
      <Handle type="target" position={Position.Top}    style={handleStyle} />
      <Handle type="target" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left}   style={handleStyle} />
      <Handle type="source" position={Position.Right}  style={handleStyle} />
      <Handle type="source" position={Position.Top}    style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <div className={badgeCls} style={isMe ? undefined : { background: color }}>{label.slice(0, 1).toUpperCase()}</div>
      <div className="label">{label}{isMe ? <span className="me-tag">ME</span> : null}</div>
      {total > 0 ? (
        <div className="count-pill" aria-label={"待办 " + total}>
          {overflow > 0 ? overflow : <span className="all-done" title="全部完成">{"\u2713"}</span>}
        </div>
      ) : null}
      {selfCount > 0 ? (
        <div className="self-pill" title={"自循环 " + selfCount}>
          <span className="self-glyph" aria-hidden>{"\u21BB"}</span>
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { person: PersonNode };

interface EdgeData {
  todo_id: number;
  status: TodoStatus;
  hovered: boolean;
  dimmed: boolean;
  curve: number; // signed curvature
}

function edgeStyle(data: EdgeData | undefined): CSSProperties {
  const status = data?.status ?? "pending";
  const stroke = STATUS_STROKE[status];
  const hovered = !!data?.hovered;
  const dimmed = !!data?.dimmed;
  // Only blocked uses dotted; done uses very faded, all others solid.
  const dash =
    status === "blocked" ? "2 5" :
    status === "done"    ? "1 6" :
    undefined;
  return {
    stroke,
    strokeWidth: hovered ? 2.4 : 1.4,
    strokeDasharray: dash,
    opacity: dimmed ? 0.15 : hovered ? 1 : 0.6,
    transition: "opacity 220ms ease, stroke-width 220ms ease",
  };
}

/** Curvature by source/target angle, so the arc bows away from "me".
 *  - edges that don't touch "me" bow clockwise
 *  - edges that touch "me" bow outward (positive curvature) */
function curvatureFor(meId: number, source: number, target: number, edgeCount: number, edgeIndex: number): number {
  const isMeEdge = source === meId || target === meId;
  if (isMeEdge) {
    // bow outward: 0.35 with small offset for siblings
    const offset = edgeCount > 1 ? (edgeIndex - (edgeCount - 1) / 2) * 0.08 : 0;
    return 0.35 + offset;
  }
  // non-me edges get a small CCW bow
  return 0.2;
}

export function GraphView(props: Props) {
  const { me, people, projects, todos, selectedId, onSelectNode, onSelectEdge, onEditPerson } = props;
  const [hoverPersonId, setHoverPersonId] = useState<number | null>(null);
  const [hoverEdgeId, setHoverEdgeId] = useState<number | null>(null);
  const [userPositions, setUserPositions] = useState<Map<number, { x: number; y: number }>>(() => {
    if (typeof window === "undefined") return new Map();
    try {
      const raw = window.localStorage.getItem("todomap.userPositions");
      if (!raw) return new Map();
      const obj = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      const m = new Map<number, { x: number; y: number }>();
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v && typeof v.x === "number" && typeof v.y === "number") {
          m.set(Number(k), v);
        }
      }
      return m;
    } catch {
      return new Map();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userPositions.size === 0) {
      window.localStorage.removeItem("todomap.userPositions");
      return;
    }
    const obj: Record<string, { x: number; y: number }> = {};
    for (const [k, v] of userPositions) obj[String(k)] = v;
    window.localStorage.setItem("todomap.userPositions", JSON.stringify(obj));
  }, [userPositions]);

  const autoPositions = useMemo(
    () =>
      layoutGraph({
        meId: me.id,
        people: people.map((p) => ({ id: p.id, name: p.name })),
        todos: todos.map((t) => ({ from_person_id: t.from_person_id, to_person_id: t.to_person_id })),
      }),
    [me.id, people, todos],
  );

  const positions = useMemo(() => {
    const merged = new Map<number, { x: number; y: number }>();
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

  const counts = useMemo(() => {
    const m = new Map<number, { pending: number; inProgress: number; done: number; blocked: number; selfCount: number }>();
    for (const p of people) m.set(p.id, { pending: 0, inProgress: 0, done: 0, blocked: 0, selfCount: 0 });
    for (const t of todos) {
      const a = m.get(t.from_person_id);
      if (!a) continue;
      if (t.from_person_id === t.to_person_id) { a.selfCount++; continue; }
      if (t.status === "in_progress") a.inProgress++;
      else if (t.status === "pending") a.pending++;
      else if (t.status === "done") a.done++;
      else if (t.status === "blocked") a.blocked++;
    }
    return m;
  }, [people, todos]);

  const focusedPersonId = hoverPersonId ?? selectedId;

  const nodeWidth = useCallback((p: Person, isMe: boolean) => {
    return Math.max(110, Math.round(p.name.length * 8.4 + 28 + (isMe ? 18 : 0)) + (isMe ? 0 : 22));
  }, []);

  const nodes: Node<NodeData>[] = useMemo(
    () =>
      people.map((p, i) => {
        const pos = positions.get(p.id) ?? { x: 0, y: 0 };
        const color = colorByPerson.get(p.id) ?? "#8E8E93";
        const c = counts.get(p.id) ?? { pending: 0, inProgress: 0, done: 0, blocked: 0, selfCount: 0 };
        const selected = selectedId === p.id;
        const hovered = hoverPersonId === p.id;
        const dimmed = focusedPersonId != null && focusedPersonId !== p.id;
        const w = nodeWidth(p, p.is_me);
        return {
          id: String(p.id),
          type: "person",
          position: { x: pos.x - w / 2, y: pos.y - 20 },
          data: { label: p.name, isMe: p.is_me, color, selected, hovered, dimmed, ...c, index: i, onEdit: onEditPerson },
        };
      }),
    [people, positions, colorByPerson, counts, selectedId, hoverPersonId, focusedPersonId, nodeWidth],
  );

  const edges: Edge<EdgeData>[] = useMemo(() => {
    const built = buildEdges(todos, projects);
    // Group edges by (source,target) to give each a curve offset
    const groups = new Map<string, number>();
    for (const e of built) {
      const k = e.source < e.target ? e.source + "-" + e.target : e.target + "-" + e.source;
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    return built
      .filter((e) => e.source !== e.target) // 隐藏自循环
      .map((e) => {
        const k = e.source < e.target ? e.source + "-" + e.target : e.target + "-" + e.source;
        const idx = seen.get(k) ?? 0;
        seen.set(k, idx + 1);
        const dimmed = focusedPersonId != null && e.source !== focusedPersonId && e.target !== focusedPersonId;
        const hovered = hoverEdgeId === e.todo_id;
        return {
          id: String(e.id),
          source: String(e.source),
          target: String(e.target),
          type: "default",
          data: {
            todo_id: e.todo_id,
            status: e.status,
            hovered,
            dimmed,
            curve: curvatureFor(me.id, e.source, e.target, groups.get(k) ?? 1, idx),
          },
          style: edgeStyle({ todo_id: e.todo_id, status: e.status, hovered, dimmed, curve: 0 }),
          markerEnd: undefined,
          animated: e.status === "in_progress" && !dimmed,
          pathOptions: { curvature: 0 },
        };
      });
  }, [todos, projects, focusedPersonId, hoverEdgeId, positions, me.id]);

  // Apply curvature to edges via style override at render time. ReactFlow's
  // default edge type uses `pathOptions.curvature` so we set it on each edge.
  const edgesWithCurve = useMemo(
    () => edges.map((e) => ({ ...e, pathOptions: { curvature: e.data?.curve ?? 0.3 } })),
    [edges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, n) => {
    setHoverEdgeId(null);
    onSelectNode(Number(n.id));
  }, [onSelectNode]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_, e) => {
    setHoverEdgeId(null);
    onSelectEdge(Number(e.id));
  }, [onSelectEdge]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_, n) => setHoverPersonId(Number(n.id)), []);
  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => setHoverPersonId(null), []);
  const onEdgeMouseEnter: EdgeMouseHandler = useCallback((_, e) => setHoverEdgeId(Number(e.id)), []);
  const onEdgeMouseLeave: EdgeMouseHandler = useCallback(() => setHoverEdgeId(null), []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edgesWithCurve}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.30 }}
        minZoom={0.4}
        maxZoom={1.4}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        defaultEdgeOptions={{ type: "default" }}
        onNodeClick={onNodeClick}
        onNodeDragStop={(_, n) => {
          const person = people.find((p) => p.id === Number(n.id));
          if (!person) return;
          const w = nodeWidth(person, Number(n.id) === me.id);
          setUserPositions((prev) => {
            const next = new Map(prev);
            next.set(Number(n.id), { x: n.position.x + w / 2, y: n.position.y + 20 });
            return next;
          });
        }}
        onNodeDoubleClick={(_, n) => onEditPerson(Number(n.id))}
        onEdgeClick={onEdgeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onPaneClick={() => { onSelectNode(null); setHoverPersonId(null); setHoverEdgeId(null); }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E5EA" gap={32} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
