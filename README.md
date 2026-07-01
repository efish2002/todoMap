# todoMap

本地桌面应用,记录项目工作网络:节点是人,边是"我委托给 ta 的 todo"或"ta 委托给我的 todo"。同项目的边/节点用同一种颜色。"我"在中心。

## 技术栈

- Tauri 2 (Rust 2.1, WebView2 on Windows)
- React 18 + TypeScript + Vite
- React Flow 11
- SQLite (rusqlite 0.31)
- Vitest

## 开发

```bash
# 一次性安装
npm install

# 跑全部测试 (Rust + frontend)
cd src-tauri && cargo test
npm test -- --run

# 启动桌面 app (Tauri WebView + Rust backend)
cargo tauri dev
# 或者在 src-tauri 目录里
cd src-tauri && cargo tauri dev

# 仅前端 (无 Tauri 桥): 浏览器会卡在 "加载中..." 因为 invoke() 不可用
npm run dev
```

## 生产构建

```bash
# 前端
npm run build

# 桌面 binary
cd src-tauri && cargo tauri build
```

## 数据

所有数据存本地 SQLite:
- Windows: `%APPDATA%\com.todomap\app\`
- macOS: `~/Library/Application Support/com.todomap/`
- Linux: `~/.local/share/com.todomap/`

应用内置"导出 JSON" 把全量数据下载到一个 `.json` 文件,可作为备份或迁移。

## 文档

- 设计: [docs/superpowers/specs/2026-07-01-todoMap-design.md](docs/superpowers/specs/2026-07-01-todoMap-design.md)
- 实施计划: [docs/superpowers/plans/2026-07-01-todoMap-implementation.md](docs/superpowers/plans/2026-07-01-todoMap-implementation.md)