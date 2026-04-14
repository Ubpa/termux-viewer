/**
 * 失败测试：复现 CMakeLists.txt 高亮 bug
 *
 * Bug 描述：
 *   getRenderType('.txt', 'CMakeLists.txt') 返回 'text' 而不是 'code'
 *
 * 根因：
 *   fileType.ts 中 TEXT_EXTS 包含 '.txt'，且在 CODE_EXTS 检查之后、
 *   named-file 特判之前就命中返回 'text'——导致后面的
 *     if (name && name.toLowerCase() === 'cmakelists.txt') return 'code'
 *   永远无法执行。
 *
 * 期望行为：
 *   named-file 特判应该优先于通用扩展名判断，
 *   或者 TEXT_EXTS 命中后再检查 name。
 */

import { describe, it, expect } from 'vitest'
import { getRenderType } from '../utils/fileType'

describe('getRenderType — CMakeLists.txt', () => {
  it('CMakeLists.txt 应返回 "code"（当前 bug：返回 "text"）', () => {
    // path.extname('CMakeLists.txt') === '.txt'，所以 ext 传 '.txt'
    expect(getRenderType('.txt', 'CMakeLists.txt')).toBe('code')
  })

  it('cmakelists.txt（全小写）也应返回 "code"（大小写不敏感）', () => {
    expect(getRenderType('.txt', 'cmakelists.txt')).toBe('code')
  })
})
