import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  onCreated: (me: Person) => void;
}

export function OnboardingDialog({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const me = await api.getOrCreateMe(name.trim(), null);
      onCreated(me);
    } catch (e: any) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-onboarding">
        <div className="onboarding-mark" aria-hidden>T</div>
        <h2>欢迎使用 todoMap</h2>
        <p>先告诉我你的名字，我们就开始了。</p>
        <input
          className="input"
          placeholder="你的名字"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        {err && <div className="error">{err}</div>}
        <div className="modal-actions" style={{ justifyContent: "center" }}>
          <button className="btn-primary" style={{ padding: "8px 28px" }} onClick={submit} disabled={busy || !name.trim()}>开始</button>
        </div>
      </div>
    </div>
  );
}