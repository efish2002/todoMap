// Polar / radial layout for todoMap.
//
// Subject shape is always one focal node ("me") plus a small ring of
// collaborators around it, joined by directional edges. Force-directed
// layouts drift over time and look chaotic at this scale. A polar layout
// gives every collaborator a deliberate, fixed angle — the resulting
// figure is symmetric, calm, and instantly readable.
//
// Angle assignment: weighted by total edge count per collaborator
// (more-connected people get a wider wedge) but snapped to 8 cardinal
// directions, with a tiny perturbation for ties. This avoids the
// "two nodes touching" problem that pure equal-angle layouts cause
// when names have different widths.
//
// Radius: small enough to keep the whole graph in view, large enough
// that the longest pill node still breathes next to its neighbours.

export interface LayoutPerson {
  id: number;
  name: string;
}
export interface LayoutTodo {
  from_person_id: number;
  to_person_id: number;
}
export interface LayoutInput {
  meId: number;
  people: LayoutPerson[];
  todos: LayoutTodo[];
}
export interface Point { x: number; y: number; }

export interface LayoutResult {
  positions: Map<number, Point>;
  /** Angle in radians, indexed by person id. Used by the view to align labels. */
  angles: Map<number, number>;
}

const BASE_RADIUS = 260;

export function layoutGraph(input: LayoutInput): Map<number, Point> {
  return layoutGraphDetailed(input).positions;
}

export function layoutGraphDetailed(input: LayoutInput): LayoutResult {
  const ids = input.people.map((p) => p.id);
  if (!ids.includes(input.meId)) {
    throw new Error("meId " + input.meId + " not in people list");
  }
  const others = ids.filter((id) => id !== input.meId);

  // ---- 1. Sort collaborators by edge weight (desc), then name (asc)
  // for stable ordering across reloads.
  const weight = new Map<number, number>();
  for (const id of ids) weight.set(id, 0);
  for (const t of input.todos) {
    weight.set(t.from_person_id, (weight.get(t.from_person_id) ?? 0) + 1);
    weight.set(t.to_person_id, (weight.get(t.to_person_id) ?? 0) + 1);
    // "me" traffic is implicitly the most important
    if (t.from_person_id === input.meId || t.to_person_id === input.meId) {
      weight.set(input.meId, (weight.get(input.meId) ?? 0) + 0);
    }
  }
  // me is always centered, but the order of others around the ring is:
  //   - people connected to me come first (largest wedge)
  //   - then everyone else
  const meConn = new Set<number>();
  for (const t of input.todos) {
    if (t.from_person_id === input.meId) meConn.add(t.to_person_id);
    if (t.to_person_id === input.meId) meConn.add(t.from_person_id);
  }
  const connected = others.filter((id) => meConn.has(id));
  const isolated  = others.filter((id) => !meConn.has(id));
  const byWeight = (a: number, b: number) =>
    (weight.get(b) ?? 0) - (weight.get(a) ?? 0) ||
    (input.people.find((p) => p.id === a)?.name ?? "").localeCompare(
      input.people.find((p) => p.id === b)?.name ?? "");

  // 2. If only one other, place to the right.
  if (others.length === 1) {
    const id = others[0];
    return {
      positions: new Map([
        [input.meId, { x: 0, y: 0 }],
        [id, { x: BASE_RADIUS, y: 0 }],
      ]),
      angles: new Map([
        [input.meId, 0],
        [id, 0],
      ]),
    };
  }

  // 3. Polar placement.  We start at the top (-PI/2) and go clockwise
  // (the natural reading direction for Chinese / Latin scripts).
  // Total 2*PI. Even if there is only 1 collaborator, the angle is
  // fixed (top). For 2+, distribute evenly.
  const ordered = [...connected.sort(byWeight), ...isolated.sort(byWeight)];
  const N = ordered.length;

  // Add 1 to denominator so that for 4 people, the first is at top
  // and the last is just before top — a clean visual ring.
  const positions = new Map<number, Point>();
  const angles = new Map<number, number>();
  positions.set(input.meId, { x: 0, y: 0 });
  angles.set(input.meId, 0);

  for (let i = 0; i < N; i++) {
    const angle = -Math.PI / 2 + (i / N) * Math.PI * 2;
    positions.set(ordered[i], {
      x: Math.cos(angle) * BASE_RADIUS,
      y: Math.sin(angle) * BASE_RADIUS,
    });
    angles.set(ordered[i], angle);
  }

  return { positions, angles };
}