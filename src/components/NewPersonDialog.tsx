import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  initialName: string;
  onClose: () => void;
  onCreated: (p: Person) => void;
}

export function NewPersonDialog({ initialName, onClose, onCreated }: Props) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const p = await api.upsertPerson(name.trim(), null);
      onCreated(p);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>新建协作人</h2>
        <label>名字<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>创建</button>
        </div>
      </div>
    </div>
  );
}
