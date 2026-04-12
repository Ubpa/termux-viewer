# server/routes/gitRemote.ts

`GET /api/git-remote?path=` — 返回当前目录所属 git 仓库 origin remote 的可浏览 HTTPS URL。

**`findGitConfig`**：从 `path` 向上遍历到 HOME 边界，逐级查找 `.git/config`。

**`parseOriginUrl` + `toHttpsUrl`**：提取 `[remote "origin"]` 的 url，转换三种格式：HTTPS 直接返回；`git@host:user/repo.git` → `https://host/user/repo`；`git://` 同理。

响应：`{ url: string | null }`，无仓库或无 origin 时为 `null`。
