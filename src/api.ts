import { isTauri, invoke } from "@tauri-apps/api/core";

function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === "undefined" || !isTauri()) {
    return Promise.reject(
      new Error("预览模式不能保存，请在 Tauri 桌面应用中操作（" + cmd + "）")
    );
  }
  return invoke<T>(cmd, args);
}
import type { Comment, Person, Project, Todo, TodoStatus } from "./types";

export const api = {
  // me
  getOrCreateMe: (name: string, avatar_path: string | null) =>
    call<Person>("get_or_create_me", { name, avatarPath: avatar_path }),
  setMyAvatar: (avatar_path: string | null) =>
    call<void>("set_my_avatar", { avatarPath: avatar_path }),

  // people
  listPeople: () => call<Person[]>("list_people"),
  upsertPerson: (name: string, avatar_path: string | null) =>
    call<Person>("upsert_person", { name, avatarPath: avatar_path }),
  updatePerson: (input: {
    id: number;
    name?: string;
    avatar_path?: string | null;
    organization?: string | null;
    contact?: string | null;
  }) =>
    call<Person>("update_person", {
      id: input.id,
      name: input.name,
      avatarPath: input.avatar_path,
      organization: input.organization,
      contact: input.contact,
    }),

  // projects
  listProjects: (include_archived: boolean) =>
    call<Project[]>("list_projects", { includeArchived: include_archived }),
  createProject: (name: string, color: string) =>
    call<Project>("create_project", { name, color }),
  updateProject: (
    id: number,
    name: string | null,
    color: string | null,
    archived: boolean | null,
  ) => call<Project>("update_project", { id, name, color, archived }),

  // todos
  listTodos: () => call<Todo[]>("list_todos"),
  listTodosForPerson: (person_id: number) =>
    call<Todo[]>("list_todos_for_person", { personId: person_id }),
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
    call<Todo>("create_todo", {
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
    call<Todo>("update_todo", {
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
    call<Todo>("set_todo_status", { id, status }),
  deleteTodo: (id: number) => call<void>("delete_todo", { id }),

  // comments
  addComment: (todo_id: number, author_id: number, body: string) =>
    call<Comment>("add_comment", { todoId: todo_id, authorId: author_id, body }),
  listComments: (todo_id: number) =>
    call<Comment[]>("list_comments", { todoId: todo_id }),
  deleteComment: (id: number) => call<void>("delete_comment", { id }),

  exportJson: () => call<string>("export_json"),
  importJson: (json: string, merge: boolean) =>
    call<void>("import_json", { json, merge }),
};
