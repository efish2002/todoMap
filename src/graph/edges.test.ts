import { describe, it, expect } from "vitest";
import { buildEdges } from "./edges";
import type { Todo, Project } from "../types";

const proj = (id: number, color: string): Project => ({
  id, name: "P" + id, color, archived: false, created_at: "",
});

const todo = (
  id: number,
  from: number,
  to: number,
  project_id: number,
  status: Todo["status"] = "pending",
): Todo => ({
  id, title: "T" + id, description: null, status, priority: 0,
  due_date: null, tags: null, project_id, from_person_id: from,
  to_person_id: to, created_at: "", updated_at: "",
});

describe("buildEdges", () => {
  it("returns one edge per todo", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10), todo(2, 1, 2, 10), todo(3, 1, 3, 11)],
      [proj(10, "#3aa856"), proj(11, "#5b8def")],
    );
    expect(edges).toHaveLength(3);
  });

  it("uses dashed style for done todos", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10, "done")],
      [proj(10, "#3aa856")],
    );
    expect(edges[0].dashed).toBe(true);
  });

  it("uses the project color", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10, "pending")],
      [proj(10, "#ff00ff")],
    );
    expect(edges[0].color).toBe("#ff00ff");
  });

  it("assigns unique arcIndex within a pair and matches arcCount", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10), todo(2, 1, 2, 10), todo(3, 1, 2, 10)],
      [proj(10, "#3aa856")],
    );
    const indices = edges.map((e) => e.arcIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
    expect(edges.every((e) => e.arcCount === 3)).toBe(true);
  });
});
