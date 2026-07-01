import type { Person, Todo } from "../types";

interface Props {
  me: Person;
  selected: Person | null;
  todos: Todo[];
  people: Person[];
  onOpenTodo: (todoId: number) => void;
  onToggleDone: (todoId: number, done: boolean) => void;
  onEditPerson: (p: Person) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待办",
  in_progress: "进行中",
  done: "已完成",
  blocked: "已阻塞",
};

export function Sidebar({ me, selected, todos, people, onOpenTodo, onToggleDone, onEditPerson }: Props) {
  const target = selected ?? me;
  const outgoing = todos.filter((t) => t.from_person_id === target.id);
  const incoming = todos.filter((t) => t.to_person_id === target.id);
  const self = todos.filter((t) => t.from_person_id === target.id && t.to_person_id === target.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? "#" + id;
  const colorIdx = (target.id % 8 + 8) % 8;

  const renderCard = (t: Todo, arrow: "out" | "in" | "self") => {
    const isDone = t.status === "done";
    const arrowText = arrow === "out" ? "→" : arrow === "in" ? "←" : "↺";
    const otherName =
      arrow === "out" ? nameOf(t.to_person_id) :
      arrow === "in"  ? nameOf(t.from_person_id) : "我自己";
    return (
      <div key={t.id} className={"todo-card status-" + t.status} onClick={() => onOpenTodo(t.id)}>
        <label className="check" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e) => onToggleDone(t.id, e.target.checked)}
            aria-label={"标记 " + t.title + (isDone ? " 为未完成" : " 为已完成")}
          />
        </label>
        <div className="todo-body">
          <div className={"title" + (isDone ? " done" : "")}>{t.title}</div>
          <div className="meta">
            <span className="arrow">{arrowText}</span>
            <span>{otherName}</span>
            <span className="arrow">·</span>
            <span>{STATUS_LABEL[t.status] ?? t.status}</span>
            {t.priority > 0 && (
              <>
                <span className="arrow">·</span>
                <span className={"priority-dot p" + t.priority} aria-hidden></span>
                <span>P{t.priority}</span>
              </>
            )}
            {t.due_date && (
              <>
                <span className="arrow">·</span>
                <span>{t.due_date}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="person-card">
        <div
          className={"avatar" + (target.is_me ? " avatar-me" : " avatar-color-" + colorIdx)}
          onDoubleClick={() => onEditPerson(target)}
          title="双击编辑"
        >
          {target.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="name editable"
            onDoubleClick={() => onEditPerson(target)}
            title="双击编辑"
          >
            {target.name}{target.is_me ? "（我）" : ""}
          </div>
          {(target.organization || target.contact) && (
            <div className="person-meta">
              {target.organization ? <span>{target.organization}</span> : null}
              {target.organization && target.contact ? <span className="dot">·</span> : null}
              {target.contact ? <span>{target.contact}</span> : null}
            </div>
          )}
          <div className="meta">
            {outgoing.length + incoming.length} 条请求
            {self.length > 0 ? " · " + self.length + " 自循环" : ""}
          </div>
        </div>
      </div>

      {self.length > 0 && (
        <section className="sidebar-section">
          <h4>
            {target.is_me ? "我请求我自己的" : target.name + " 请求给自己的"}
            <span className="count">· {self.length}</span>
          </h4>
          {self.map((t) => renderCard(t, "self"))}
        </section>
      )}

      <section className="sidebar-section">
        <h4>
          {target.is_me ? "我请求出去的" : target.name + " 请求出去的"}
          <span className="count">· {outgoing.length}</span>
        </h4>
        {outgoing.length === 0 && <div className="empty">暂无</div>}
        {outgoing.map((t) => renderCard(t, "out"))}
      </section>

      <section className="sidebar-section">
        <h4>
          {target.is_me ? "别人请求给我的" : "请求给 " + target.name + " 的"}
          <span className="count">· {incoming.length}</span>
        </h4>
        {incoming.length === 0 && <div className="empty">暂无</div>}
        {incoming.map((t) => renderCard(t, "in"))}
      </section>
    </aside>
  );
}
