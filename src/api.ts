import { invoke } from "@tauri-apps/api/core";
import type { Comment, Person, Project, Todo, TodoStatus } from "./types";

export const api = {
  // me
  getOrCreateMe: (name: string, avatar_path: string | null) =>
    invoke<Person>("get_or_create_me", { name, avatarPath: avatar_path }),
  setMyAvatar: (avatar_path: string | null) =>
    invoke<void>("set_my_avatar", { avatarPath: avatar_path }),

  // people
  listPeople: () => invoke<Person[]>("list_people"),
  upsertPerson: (name: string, avatar_path: string | null) =>
    invoke<Person>("upsert_person", { name, avatarPath: avatar_path }),

  // projects
  listProjects: (include_archived: boolean) =>
    invoke<Project[]>("list_projects", { includeArchived: include_archived }),
  createProject: (name: string, color: string) =>
    invoke<Project>("create_project", { name, color }),
  updateProject: (
    id: number,
    name: string | null,
    color: string | null,
    archived: boolean | null,
  ) => invoke<Project>("update_project", { id, name, color, archived }),

  // todos
  listTodos: () => invoke<Todo[]>("list_todos"),
  listTodosForPerson: (person_id: number) =>
    invoke<Todo[]>("list_todos_for_person", { personId: person_id }),
  createTodo: (input: {
    title: string;
    description: string | null;
    priority: number;
    due_date: string | null;
    tags: string | null;
    project_id: number;
    from_person_id: number;
    to_person_id: number;
  }) =>
    invoke<Todo>("create_todo", {
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.due_date,
      tags: input.tags,
      projectId: input.project_id,
      fromPersonId: input.from_person_id,
      toPersonId: input.to_person_id,
    }),
  updateTodo: (input: {
    id: number;
    title?: string;
    description?: string;
    status?: TodoStatus;
    priority?: number;
    project_id?: number;
    from_person_id?: number;
    to_person_id?: number;
  }) =>
    invoke<Todo>("update_todo", {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      projectId: input.project_id,
      fromPersonId: input.from_person_id,
      toPersonId: input.to_person_id,
    }),
  setTodoStatus: (id: number, status: TodoStatus) =>
    invoke<Todo>("set_todo_status", { id, status }),
  deleteTodo: (id: number) => invoke<void>("delete_todo", { id }),

  // comments
  addComment: (todo_id: number, author_id: number, body: string) =>
    invoke<Comment>("add_comment", { todoId: todo_id, authorId: author_id, body }),
  listComments: (todo_id: number) =>
    invoke<Comment[]>("list_comments", { todoId: todo_id }),
  deleteComment: (id: number) => invoke<void>("delete_comment", { id }),

  exportJson: () => invoke<string>("export_json"),
  importJson: (json: string, merge: boolean) =>
    invoke<void>("import_json", { json, merge }),
};
