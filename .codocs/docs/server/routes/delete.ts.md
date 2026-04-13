# delete.ts

`DELETE /api/delete?path=` — 删除文件或目录。安全校验复用 `resolveSafePath()` + `isSshPath()`，禁止删除 HOME 根。
