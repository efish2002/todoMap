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

const RADIUS = 220;
const ITERATIONS = 200;

export function layoutGraph(input: LayoutInput): Map<number, Point> {
  const ids = input.people.map((p) => p.id);
  if (!ids.includes(input.meId)) {
    throw new Error('meId ' + input.meId + ' not in people list');
  }
  const others = ids.filter((id) => id !== input.meId);

  const pos = new Map<number, Point>();
  pos.set(input.meId, { x: 0, y: 0 });
  others.forEach((id, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2;
    pos.set(id, { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS });
  });

  const edges = input.todos.map((t) => [t.from_person_id, t.to_person_id] as const);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const id of others) {
      const current = pos.get(id)!;
      const best = bestAngle(id, current, pos, edges);
      pos.set(id, best);
    }
  }
  return pos;
}

function bestAngle(
  id: number,
  current: Point,
  pos: Map<number, Point>,
  edges: readonly (readonly [number, number])[],
): Point {
  const candidates = [-0.3, -0.1, 0, 0.1, 0.3].map((da) => rotate(current, da));
  let best = current;
  let bestScore = Infinity;
  for (const c of candidates) {
    pos.set(id, c);
    const s = crossings(edges, pos);
    if (s < bestScore) { bestScore = s; best = c; }
  }
  pos.set(id, best);
  return best;
}

function rotate(p: Point, dAngle: number): Point {
  const r = Math.hypot(p.x, p.y);
  const a = Math.atan2(p.y, p.x) + dAngle;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function crossings(edges: readonly (readonly [number, number])[], pos: Map<number, Point>): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (segmentsCross(
        pos.get(edges[i][0])!, pos.get(edges[i][1])!,
        pos.get(edges[j][0])!, pos.get(edges[j][1])!,
      )) n++;
    }
  }
  return n;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
