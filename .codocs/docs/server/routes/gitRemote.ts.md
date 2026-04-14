---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/gitRemote.ts
  source_hash: sha256:442634d96b3b85652f59b6a72fbf7b89c6c55aa77d67f72c969b7ffaf623ee8c
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/routes/gitRemote.ts

`GET /api/git-remote?path=` — 返回当前目录所属 git 仓库 origin remote 的可浏览 HTTPS URL。

**`findGitConfig`**：从 `path` 向上遍历到 HOME 边界，逐级查找 `.git/config`。

**`parseOriginUrl` + `toHttpsUrl`**：提取 `[remote "origin"]` 的 url，转换三种格式：HTTPS/HTTP 去掉 `.git` 后缀后返回；`git@host:user/repo.git` → `https://host/user/repo`；`git://` 同理。

响应：`{ url: string | null }`，无仓库或无 origin 时为 `null`。
