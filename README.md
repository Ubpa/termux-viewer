# termux-viewer

在手机浏览器中浏览和预览 Termux 主目录下的文件。

## 功能

- 📁 目录浏览，按文件夹/文件分类排序
- 👁️ 文件预览：代码高亮、Markdown 渲染（GFM 表格/任务列表）、图片查看
- 🔄 实时更新：目录有变化时自动刷新，无需手动操作
- 🔒 安全限制：禁止路径穿越（`../`）和访问 `.ssh/` 目录
- 📱 移动端优化：上 1/3 文件列表、下 2/3 预览的垂直分栏布局
- 🗂️ 文件列表折叠/展开：上滑展开、下滑收起，预览区顶部上拉时自动展开
- 🖱️ 长按菜单：复制文件路径、删除文件
- 📖 自动预览：进入目录时自动展示 README（如存在）
- 🔗 GitHub 链接：若仓库有 remote，面包屑行显示跳转按钮

## 快速开始

```bash
# 构建
npm run build

# 启动
npm start
```

然后在手机浏览器访问 `http://localhost:3001`。

局域网内其他设备访问：`http://<手机IP>:3001`（需与手机同一 Wi-Fi）

## 开发模式

```bash
npm run dev
```

Vite 开发服务器在 `http://localhost:5173`，API 代理到 `http://localhost:3001`。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + TypeScript + Fastify |
| 前端 | React 18 + TypeScript + Vite |
| 代码高亮 | highlight.js |
| Markdown | react-markdown + remark-gfm |
| 实时推送 | SSE（Server-Sent Events）+ `fs.watch` |

## 目录结构

```
termux-viewer/
├── server/
│   ├── index.ts          # Fastify 入口
│   ├── routes/
│   │   ├── files.ts      # GET /api/files — 目录列表
│   │   ├── read.ts       # GET /api/read  — 文件内容
│   │   └── watch.ts      # GET /api/watch — SSE 文件监听
│   └── utils/
│       └── fs.ts         # 安全路径解析工具
└── client/
    └── src/
        ├── App.tsx
        ├── types.ts
        ├── components/
        │   ├── FileList.tsx
        │   ├── Preview.tsx
        │   └── Breadcrumb.tsx
        ├── hooks/
        │   └── useFiles.ts
        └── utils/
            └── fileType.ts
```

## 限制

| 项目 | 限制 |
|------|------|
| 文本文件 | 最大 1 MB，超出截断为前 1000 行 |
| 图片文件 | 最大 10 MB |

## API

| 端点 | 说明 |
|------|------|
| `GET /api/files?path=/` | 返回目录条目列表（JSON） |
| `GET /api/read?path=/file` | 返回文件内容（文本 JSON / 图片二进制流） |
| `GET /api/watch?path=/` | SSE 连接，目录变化时推送 `change` 事件 |
