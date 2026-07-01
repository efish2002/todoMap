export interface Person {
  id: number;
  name: string;
  avatar_path: string | null;
  organization: string | null;
  contact: string | null;
  is_me: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
}

export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: number;
  due_date: string | null;
  tags: string | null;
  project_id: number;
  from_person_id: number;
  to_person_id: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  todo_id: number;
  author_id: number;
  body: string;
  created_at: string;
}
