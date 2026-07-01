import { describe, it, expect } from "vitest";
import { layoutGraph } from "./layout";

describe("layoutGraph", () => {
  it("places 'me' at the origin", () => {
    const positions = layoutGraph({
      meId: 1,
      people: [
        { id: 1, name: "me" },
        { id: 2, name: "alice" },
      ],
      todos: [{ from_person_id: 1, to_person_id: 2 }],
    });
    expect(positions.get(1)).toEqual({ x: 0, y: 0 });
    expect(positions.get(2)).not.toEqual({ x: 0, y: 0 });
  });

  it("returns a position for every person", () => {
    const positions = layoutGraph({
      meId: 1,
      people: [
        { id: 1, name: "me" },
        { id: 2, name: "A" },
        { id: 3, name: "B" },
        { id: 4, name: "C" },
      ],
      todos: [
        { from_person_id: 1, to_person_id: 2 },
        { from_person_id: 1, to_person_id: 3 },
        { from_person_id: 1, to_person_id: 4 },
      ],
    });
    expect(positions.size).toBe(4);
  });

  it("throws if meId is not in people", () => {
    expect(() => layoutGraph({
      meId: 99,
      people: [{ id: 1, name: "me" }],
      todos: [],
    })).toThrow();
  });
});
