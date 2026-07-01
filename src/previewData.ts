import type { Person, Project, Todo } from "./types";

const now = () => new Date().toISOString();

export const previewMe: Person = {
  id: 1,
  name: "高远",
  avatar_path: null,
  organization: "Independent",
  contact: "gaoyuan@hey.com",
  is_me: true,
  created_at: now(),
};

export const previewPeople: Person[] = [
  previewMe,
  { id: 2, name: "李宁",   avatar_path: null, organization: "设计组",  contact: "lining@studio.cn",  is_me: false, created_at: now() },
  { id: 3, name: "Mira",   avatar_path: null, organization: "Acme Co.", contact: "@mira",            is_me: false, created_at: now() },
  { id: 4, name: "陈默",   avatar_path: null, organization: "工程",     contact: "chenmo@dev.cn",    is_me: false, created_at: now() },
  { id: 5, name: "Yuki",   avatar_path: null, organization: "Marketing",contact: "yuki@brand.io",    is_me: false, created_at: now() },
];

export const previewProjects: Project[] = [
  { id: 1, name: "官网改版",    color: "#007AFF", archived: false, created_at: now() },
  { id: 2, name: "iOS v2",      color: "#FF9500", archived: false, created_at: now() },
  { id: 3, name: "品牌手册",    color: "#AF52DE", archived: false, created_at: now() },
];

export const previewTodos: Todo[] = [
  { id: 1,  title: "初稿设计稿评审",          description: "需要和工程同步断点", status: "in_progress", priority: 1, due_date: "2026-07-05", tags: "design,review",  project_id: 1, from_person_id: 1, to_person_id: 2, created_at: now(), updated_at: now() },
  { id: 2,  title: "迁移品牌色到 iOS v2",     description: null,                status: "pending",     priority: 2, due_date: "2026-07-10", tags: "design",         project_id: 2, from_person_id: 2, to_person_id: 4, created_at: now(), updated_at: now() },
  { id: 3,  title: "准备品牌手册的字体章节",  description: null,                status: "blocked",     priority: 1, due_date: null,        tags: "brand",          project_id: 3, from_person_id: 5, to_person_id: 1, created_at: now(), updated_at: now() },
  { id: 4,  title: "走查官网首页",             description: null,                status: "done",        priority: 3, due_date: "2026-06-25", tags: null,             project_id: 1, from_person_id: 1, to_person_id: 3, created_at: now(), updated_at: now() },
  { id: 5,  title: "发 Mira 邀请链接",         description: null,                status: "pending",     priority: 0, due_date: "2026-07-02", tags: "growth",         project_id: 1, from_person_id: 1, to_person_id: 3, created_at: now(), updated_at: now() },
  { id: 6,  title: "提交品牌手册封面方案",     description: null,                status: "in_progress", priority: 2, due_date: "2026-07-08", tags: "brand",          project_id: 3, from_person_id: 1, to_person_id: 5, created_at: now(), updated_at: now() },
  { id: 7,  title: "复盘上周阻塞",             description: "自己写给自己",       status: "pending",     priority: 0, due_date: null,        tags: null,             project_id: 2, from_person_id: 1, to_person_id: 1, created_at: now(), updated_at: now() },
];