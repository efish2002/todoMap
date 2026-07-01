import type { Person, Todo } from "../types";

interface Props {
  me: Person;
  selected: Person | null;
  todos: Todo[];
  people: Person[];
  onOpenTodo: (todoId: number) => void;
}

export function Sidebar({ me, selected, todos, people, onOpenTodo }: Props) {
  const target = selected ?? me;
  const outgoing = todos.filter((t) => t.from_person_id === target.id);
  const incoming = todos.filter((t) => t.to_person_id === target.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? "#" + id;

  return (
    <aside className="sidebar">
      <div className="person-card">
        <div className={"avatar" + (target.is_me ? " avatar-me" : "")}>
          {target.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="name">{target.name}{target.is_me ? " (我)" : ""}</div>
          <div className="meta">
            {outgoing.length + incoming.length} 条委托
          </div>
        </div>
      </div>

      <section>
        <h4>{target.is_me ? "我委托出去的" : target.name + " 委托出去的"} · {outgoing.length}</h4>
        {outgoing.length === 0 && <div className="empty">暂无</div>}
        {outgoing.map((t) => (
          <div key={t.id} className={"todo-card status-" + t.status} onClick={() => onOpenTodo(t.id)}>
            <div className="title">{t.status === "done" ? <s>{t.title}</s> : t.title}</div>
            <div className="meta">→ {nameOf(t.to_person_id)} · {t.status}{t.due_date ? " · " + t.due_date : ""}</div>
          </div>
        ))}
      </section>

      <section>
        <h4>{target.is_me ? "别人委托给我的" : "委托给 " + target.name + " 的"} · {incoming.length}</h4>
        {incoming.length === 0 && <div className="empty">暂无</div>}
        {incoming.map((t) => (
          <div key={t.id} className={"todo-card status-" + t.status} onClick={() => onOpenTodo(t.id)}>
            <div className="title">{t.status === "done" ? <s>{t.title}</s> : t.title}</div>
            <div className="meta">← {nameOf(t.from_person_id)} · {t.status}{t.due_date ? " · " + t.due_date : ""}</div>
          </div>
        ))}
      </section>
    </aside>
  );
}
