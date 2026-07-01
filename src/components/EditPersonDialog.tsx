import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  person: Person;
  onClose: () => void;
  onSaved: (p: Person) => void;
}

export function EditPersonDialog({ person, onClose, onSaved }: Props) {
  const [name, setName] = useState(person.name);
  const [organization, setOrganization] = useState(person.organization ?? "");
  const [contact, setContact] = useState(person.contact ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const p = await api.updatePerson({
        id: person.id,
        name: name.trim(),
        organization: organization.trim() || null,
        contact: contact.trim() || null,
      });
      onSaved(p);
    } catch (e: any) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>编辑人员信息</h2>
        <label>姓名<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label>单位<input className="input" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="公司 / 团队 / 学校" /></label>
        <label>联系方式<input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="微信 / 邮箱 / 电话" /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>保存</button>
        </div>
      </div>
    </div>
  );
}