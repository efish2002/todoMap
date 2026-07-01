import type { Project, Todo, TodoStatus } from "../types";

export interface EdgeData {
  id: number;
  todo_id: number;
  source: number;
  target: number;
  color: string;
  dashed: boolean;
  arcIndex: number;
  arcCount: number;
  status: TodoStatus;
}

export function buildEdges(todos: Todo[], projects: Project[]): EdgeData[] {
  const colorByProject = new Map(projects.map((p) => [p.id, p.color]));
  const pairCounts = new Map<string, number>();
  const pairIndices = new Map<string, number>();
  const out: EdgeData[] = [];

  for (const t of todos) {
    const key = pairKey(t.from_person_id, t.to_person_id);
    const count = (pairCounts.get(key) ?? 0) + 1;
    pairCounts.set(key, count);
  }

  for (const t of todos) {
    const key = pairKey(t.from_person_id, t.to_person_id);
    const idx = pairIndices.get(key) ?? 0;
    pairIndices.set(key, idx + 1);
    out.push({
      id: t.id,
      todo_id: t.id,
      source: t.from_person_id,
      target: t.to_person_id,
      color: colorByProject.get(t.project_id) ?? "#888888",
      dashed: t.status === "done",
      arcIndex: idx,
      arcCount: pairCounts.get(key) ?? 1,
      status: t.status,
    });
  }
  return out;
}

function pairKey(a: number, b: number): string {
  return a < b ? a + "-" + b : b + "-" + a;
}
