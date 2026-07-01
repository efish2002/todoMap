import { useEffect, useState } from "react";
import { api } from "../api";
import type { Person, Project, Todo, TodoStatus } from "../types";
import { NewPersonDialog } from "./NewPersonDialog";

interface Props {
  me: Person;
  people: Person[];
  projects: Project[];
  editing: Todo | null;
  prefill?: { from?: number; to?: number; project_id?: number };
  onClose: () => void;
  onSaved: (t: Todo) => void;
  onPersonCreated?: (p: Person) => Promise<void>;
}

export function TodoDialog({ me, people, projects, editing, prefill, onClose, onSaved, onPersonCreated }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [fromId, setFromId] = useState<number>(editing?.from_person_id ?? prefill?.from ?? me.id);
  const [toId, setToId] = useState<number>(editing?.to_person_id ?? prefill?.to ?? (people.find((p) => p.id !== me.id)?.id ?? me.id));
  const [projectId, setProjectId] = useState<number | null>(editing?.project_id ?? prefill?.project_id ?? projects[0]?.id ?? null);
  const [status, setStatus] = useState<TodoStatus>(editing?.status ?? "pending");
  const [priority, setPriority] = useState<number>(editing?.priority ?? 0);
  const [dueDate, setDueDate] = useState<string>(editing?.due_date ?? "");
  const [tags, setTags] = useState<string>(editing?.tags ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const submit = async () => {
    if (!title.trim() || !projectId) return;
    setBusy(true); setErr(null);
    try {
      const t = editing
        ? await api.updateTodo({
            id: editing.id,
            title: title.trim(),
            description: description.trim() || undefined,
            status, priority,
            project_id: projectId,
            from_person_id: fromId,
            to_person_id: toId,
          })
        : await api.createTodo({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate || null,
            tags: tags.trim() || null,
            project_id: projectId,
            from_person_id: fromId,
            to_person_id: toId,
          });
      onSaved(t);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{editing ? "编辑请求" : "新增请求"}</h2>
        <label>标题<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
        <label>描述<textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="row">
          <label>请求方
            <select className="input" value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_me ? "（我）" : ""}</option>)}
            </select>
          </label>
          <label>接收方
            <select className="input" value={toId} onChange={(e) => setToId(Number(e.target.value))}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_me ? "（我）" : ""}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="btn" style={{ width: "100%", marginTop: -4, marginBottom: 14 }} onClick={() => setShowNewPerson(true)}>+ 新建协作人</button>
        <label>项目
          <select className="input" value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value))}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="row">
          <label>状态
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              <option value="pending">待办</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
              <option value="blocked">已阻塞</option>
            </select>
          </label>
          <label>优先级
            <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={0}>无</option>
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
            </select>
          </label>
          <label>截止日
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <label>标签（逗号分隔）<input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !title.trim() || !projectId}>
            {editing ? "保存" : "创建"}
          </button>
        </div>
        {showNewPerson && (
          <NewPersonDialog
            initialName=""
            onClose={() => setShowNewPerson(false)}
            onCreated={async (p) => {
              setShowNewPerson(false);
              if (onPersonCreated) await onPersonCreated(p);
              setToId(p.id);
            }}
          />
        )}
      </div>
    </div>
  );
}