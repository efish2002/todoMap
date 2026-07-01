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

export function Sidebar({ me, selected, todos, people, onOpenTodo, onToggleDone, onEditPerson }: Props) {
  const target = selected ?? me;
  const outgoing = todos.filter((t) => t.from_person_id === target.id);
  const incoming = todos.filter((t) => t.to_person_id === target.id);
  // "Self" todos: both endpoints are the same person. When viewing "me" this
  // surfaces "remind myself to do X" type entries. For other people we still
  // show it but it's much rarer.
  const self = todos.filter((t) => t.from_person_id === target.id && t.to_person_id === target.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? "#" + id;

  const renderCard = (t: Todo, arrow: "out" | "in" | "self") => {
    const isDone = t.status === "done";
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
            {arrow === "out" ? "→ " : arrow === "in" ? "← " : "↺ "}
            {arrow === "out" ? nameOf(t.to_person_id) : arrow === "in" ? nameOf(t.from_person_id) : "我自己"}
            {" · "}{t.status}{t.due_date ? " · " + t.due_date : ""}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="person-card">
        <div
          className={"avatar" + (target.is_me ? " avatar-me" : "")}
          onDoubleClick={() => onEditPerson(target)}
          title="双击编辑"
        >
          {target.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div
            className="name editable"
            onDoubleClick={() => onEditPerson(target)}
            title="双击编辑"
          >
            {target.name}{target.is_me ? " (我)" : ""}
          </div>
          {(target.organization || target.contact) && (
            <div className="person-meta">
              {target.organization ? <span>{target.organization}</span> : null}
              {target.organization && target.contact ? <span className="dot">·</span> : null}
              {target.contact ? <span>{target.contact}</span> : null}
            </div>
          )}
          <div className="meta">
            {outgoing.length + incoming.length} 条委托
            {self.length > 0 ? " · " + self.length + " 自委托" : ""}
          </div>
        </div>
      </div>

      {self.length > 0 && (
        <section>
          <h4>{target.is_me ? "我委托给我自己的" : target.name + " 委托给自己的"} · {self.length}</h4>
          {self.map((t) => renderCard(t, "self"))}
        </section>
      )}

      <section>
        <h4>{target.is_me ? "我委托出去的" : target.name + " 委托出去的"} · {outgoing.length}</h4>
        {outgoing.length === 0 && <div className="empty">暂无</div>}
        {outgoing.map((t) => renderCard(t, "out"))}
      </section>

      <section>
        <h4>{target.is_me ? "别人委托给我的" : "委托给 " + target.name + " 的"} · {incoming.length}</h4>
        {incoming.length === 0 && <div className="empty">暂无</div>}
        {incoming.map((t) => renderCard(t, "in"))}
      </section>
    </aside>
  );
}
