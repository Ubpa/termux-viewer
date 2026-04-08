# termux-viewer 设计文档

**日期**：2026-04-08  
**技术栈**：Fastify + Vite + React + TypeScript  
**目标**：在手机浏览器中浏览 Termux Home 目录，支持代码/图片/Markdown 文件预览

---

## 1. 项目目标

在 Termux 上启动一个本地 Web 服务，用户通过手机或局域网内其他设备的浏览器访问，实现：

- 浏览 `~`（Termux Home）目录结构
- 点击文件在页面下方预览内容
- 支持代码语法高亮、Markdown 渲染、图片展示

---

## 2. 架构概览

```
termux-viewer/
├── server/                    # Fastify 后端
│   ├── index.ts               # 服务入口，生产模式 serve Vite 产物
│   ├── routes/
│   │   ├── files.ts           # GET /api/files?path=  列目录
│   │   └── read.ts            # GET /api/read?path=   读文件
│   └── utils/
│       └── fs.ts              # 路径安全校验（jail 到 HOME）
├── client/                    # Vite + React 前端
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Breadcrumb.tsx  # 路径面包屑
│       │   ├── FileList.tsx    # 文件列表（上方）
│       │   └── Preview.tsx     # 文件预览（下方）
│       ├── hooks/
│       │   └── useFiles.ts     # 文件列表数据获取
│       └── types.ts            # 共用类型定义
├── package.json                # 根 package，管理 scripts
├── tsconfig.json
└── tsconfig.node.json
```

---

## 3. 后端设计

### 3.1 路由

| 路由 | 方法 | 参数 | 返回 |
|------|------|------|------|
| `/api/files` | GET | `path`（相对 HOME，默认 `/`） | `FileEntry[]` |
| `/api/read` | GET | `path`（相对 HOME） | 文件内容（text 或 base64） |
| `/*` | GET | - | 生产模式 serve Vite 静态产物 |

### 3.2 FileEntry 类型

```typescript
interface FileEntry {
  name: string;
  path: string;       // 相对 HOME 的路径
  isDir: boolean;
  size: number;       // bytes，目录为 0
  mtime: string;      // ISO 时间字符串
  ext: string;        // 文件扩展名（小写），目录为空
}
```

### 3.3 /api/read 响应

服务端仅返回 `'text' | 'image' | 'binary'` 三种底层类型；客户端在此基础上根据 `FileEntry.ext` 进一步细分为 `markdown` / `code` / `text` / `image` / `binary` 五种渲染类型（见 §4.3）。

```typescript
interface ReadResponse {
  type: 'text' | 'image' | 'binary';
  content: string;    // text: 原始文本；image: base64 data URL；binary: 空字符串
  mimeType: string;
}
```

**图片 serving 策略**：`/api/read?path=` 对图片文件直接以正确 `Content-Type` 流式返回二进制，客户端 `<img src="/api/read?path=...">` 直接引用，避免 base64 编码带来 ~33% 体积膨胀。`ReadResponse` 对图片路径不适用（直接 img src 即可）。

**错误响应格式**（统一）：
```typescript
interface ErrorResponse {
  error: string;   // 人类可读的错误描述
  code: number;    // HTTP 状态码，如 403 / 404 / 500
}
```

### 3.4 路径安全（fs.ts）

- 所有路径以 `process.env.HOME`（`/data/data/com.termux/files/home`）为根
- 使用 `path.resolve` 解析后，再调用 `fs.realpath()` 解析符号链接，防止通过 symlink 逃逸 HOME 目录
- 最终检查 realpath 是否以 HOME 开头，否则返回 403
- **隐藏文件策略**：默认显示所有文件（含 `.` 开头的隐藏文件），但 `.ssh/` 目录下的文件内容读取请求返回 403，保护私钥安全

### 3.5 文件大小限制

- 文本/代码文件：超过 **1MB** 只返回前 1000 行 + 截断提示
- 图片：超过 **10MB** 拒绝，返回提示

---

## 4. 前端设计

### 4.1 布局（移动端竖屏优先）

```
┌─────────────────────────┐
│  🗂 termux-viewer        │  ← 顶部标题栏
│  ~/projects/foo          │  ← 面包屑导航（可点击）
├─────────────────────────┤
│  📁 src                  │
│  📁 node_modules         │  ← 文件列表区（上方，可滚动）
│  📄 package.json  1.2KB  │
│  📄 README.md    3.4KB   │
├─────────────────────────┤
│  [预览区]                │  ← 文件预览区（下方，可滚动）
│  README.md               │
│  # Hello World           │
│  ...                     │
└─────────────────────────┘
```

- 文件列表区：`50vh`，超出滚动
- 预览区：`50vh`，超出滚动
- 无文件选中时，预览区显示提示文字

### 4.2 组件职责

**App.tsx**
- 管理当前路径 `currentPath: string` state（相对 HOME，初始为 `/`）
- 管理选中文件 `selectedFile: FileEntry | null` state
- 组合 Breadcrumb + FileList + Preview

**Breadcrumb.tsx**
- 解析 `currentPath`，展示可点击的路径段
- 面包屑超长时水平滚动（`overflow-x: auto`），不截断、不折行
- 点击任意段跳转到对应目录

**FileList.tsx**
- 接收 `path`，内部调用 `useFiles(path)` hook 获取列表
- 目录排在文件前面，各自按名称字母排序
- 点击目录 → 更新 `currentPath`
- 点击文件 → 更新 `selectedFile`
- 显示文件图标（根据 ext）、名称、大小
- 展示 loading 状态（骨架屏或 spinner）和 error 状态（错误提示文字）

**Preview.tsx**
- 接收 `selectedFile: FileEntry | null`
- 无选中时显示"点击文件预览"提示
- 根据 `selectedFile.ext` 确定客户端渲染类型（见 §4.3），再调用 `/api/read` 获取内容
- 图片类型直接用 `<img src="/api/read?path=...">` 展示，无需调用 ReadResponse
- 根据渲染类型选择渲染器：
  - `markdown`：使用 `marked` + `DOMPurify` 渲染
  - `code`：使用 `highlight.js` 语法高亮，显示行号
  - `image`：`<img src="/api/read?path=...">` 直接展示
  - `text`：`<pre>` 纯文本
  - `binary`：显示"不支持预览"
- 展示 loading 状态和 error 状态（如 403 提示"无权限访问"）

**useFiles.ts hook**
- 参数：`path: string`
- 返回：`{ data: FileEntry[], loading: boolean, error: string | null }`
- path 变化时重新 fetch `/api/files?path=`

### 4.3 文件类型判断（客户端）

| 类型 | 扩展名 |
|------|--------|
| markdown | `.md`, `.markdown` |
| image | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` |
| code | `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.sh`, `.json`, `.yaml`, `.yml`, `.toml`, `.css`, `.html`, `.xml`, `.c`, `.cpp`, `.go`, `.rs` 等 |
| text | `.txt`, `.log`, `.env` 等 |
| binary | 其他 |

---

## 5. 开发模式 vs 生产模式

### 开发模式

```bash
# 终端 1：启动 Fastify（port 3001）
npm run dev:server

# 终端 2：启动 Vite dev server（port 5173），代理 /api → 3001
npm run dev:client
```

`vite.config.ts` 中配置 proxy：
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### 生产模式

```bash
npm run build        # vite build → client/dist/
npm run start        # Fastify serve client/dist/ + API
```

Fastify 注册 `@fastify/static` 插件 serve `client/dist/`，SPA fallback 到 `index.html`。

---

## 6. 依赖清单

### 后端
- `fastify` - HTTP 框架
- `@fastify/static` - 静态文件 serve
- `@fastify/cors` - 开发模式跨域

### 前端
- `react` + `react-dom`
- `marked` - Markdown 渲染
- `dompurify` - XSS 防护
- `highlight.js` - 语法高亮

### 开发工具
- `vite` + `@vitejs/plugin-react`
- `typescript`
- `tsx` - 运行 server TypeScript（替代 ts-node，更快）
- `concurrently` - 并行启动 server + client

---

## 7. 启动脚本（package.json scripts）

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite client",
    "build": "tsc -p tsconfig.node.json && vite build client",
    "start": "node dist/server/index.js"
  }
}
```

`tsconfig.node.json` 须设置 `"outDir": "dist/server"`，确保 `node dist/server/index.js` 路径正确。

---

## 8. 安全考量

1. **路径 jail**：`path.resolve` + `fs.realpath()` 双重校验，防止 `../` 和 symlink 逃逸
2. **`.ssh/` 保护**：`.ssh/` 目录文件内容请求返回 403
3. **文件大小限制**：防止读取超大文件导致内存溢出
4. **XSS 防护**：Markdown 渲染使用 DOMPurify 清洗
5. **仅本地访问**：默认监听 `0.0.0.0`（局域网可访问），不对外暴露

---

## 9. 成功标准

- [ ] `npm run dev` 一键启动，浏览器可访问
- [ ] 可浏览 `~` 目录，面包屑导航正常
- [ ] 点击 `.md` 文件，下方渲染 Markdown
- [ ] 点击代码文件，下方语法高亮展示
- [ ] 点击图片文件，下方展示图片
- [ ] 手机浏览器竖屏布局正常
