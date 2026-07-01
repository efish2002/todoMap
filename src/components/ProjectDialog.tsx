import { useState } from "react";
import { api } from "../api";
import type { Project } from "../types";

interface Props {
  editing?: Project | null;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

const PALETTE = ["#3aa856", "#d97b3a", "#5b8def", "#c45ec4", "#e8c547", "#5ad1ce", "#e85a5a"];

export function ProjectDialog({ editing, onClose, onSaved }: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(editing?.color ?? PALETTE[0]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const p = editing
        ? await api.updateProject(editing.id, name.trim(), color, null)
        : await api.createProject(name.trim(), color);
      onSaved(p);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{editing ? "编辑项目" : "新建项目"}</h2>
        <label>名称<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={"swatch" + (c === color ? " selected" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={"color " + c}
            />
          ))}
        </div>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>
            {editing ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
