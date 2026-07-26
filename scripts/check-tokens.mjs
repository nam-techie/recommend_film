#!/usr/bin/env node
/**
 * Chặn class Tailwind không tồn tại và việc quay lại bảng màu cũ.
 *
 * Lý do có file này: một lần codemod đổi màu bằng sed (`purple-500` → `accent-*`)
 * dùng alternation không có ranh giới từ, sinh ra `accent-soft0` — class không tồn
 * tại trong tailwind.config.ts. Tailwind không báo lỗi, không sinh CSS, chỉ âm thầm
 * mất màu: thanh tiến độ rỗng, thanh tua player rơi về xanh mặc định của trình duyệt.
 * 74 chỗ trong 24 file, không ai phát hiện cho tới khi nhìn thấy trên production.
 *
 * Chạy: node scripts/check-tokens.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['app', 'components', 'hooks', 'lib']
const EXTENSIONS = /\.(tsx|ts)$/

/** Token màu hợp lệ (khớp tailwind.config.ts). `surface` bị loại vì surface-1/2/3 là hợp lệ. */
const TOKEN = '(?:accent|fg|rating|ok|bad|info)'
const SUFFIX = '(?:-(?:soft|strong|secondary|muted|faint|fg))?'

const RULES = [
  {
    // accent-soft0, fg-muted3, rating0… — token dính số là dấu hiệu codemod hỏng
    pattern: new RegExp(`\\b${TOKEN}${SUFFIX}\\d`, 'g'),
    message: 'Token màu dính chữ số — class này không tồn tại, Tailwind sẽ bỏ qua im lặng',
  },
  {
    // Bảng màu cũ đã bị thay bằng token (xem README, mục "Quy ước UI")
    pattern: /\b(?:bg|text|border|ring|from|via|to|accent|fill|stroke|divide)-(?:slate|gray|zinc|neutral|stone)-(?:500|600|700|800)\b/g,
    message: 'Dùng thang xám cũ — fail contrast trên nền tối, hãy dùng fg / fg-secondary / fg-muted',
  },
  {
    pattern: /\b(?:bg|text|border|ring|from|via|to|accent|fill|stroke)-(?:fuchsia|purple|violet)-\d{2,3}\b/g,
    message: 'Gọi thẳng thang màu Tailwind — hãy dùng token accent / accent-strong / accent-soft',
  },
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (EXTENSIONS.test(entry)) files.push(full)
  }
  return files
}

const problems = []
for (const root of ROOTS) {
  let files
  try { files = walk(root) } catch { continue }
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0
        for (const match of line.matchAll(rule.pattern)) {
          problems.push({ file: relative(process.cwd(), file), line: index + 1, match: match[0], message: rule.message })
        }
      }
    })
  }
}

if (problems.length === 0) {
  console.log('✓ check-tokens: không có class màu hỏng hay lệch token')
  process.exit(0)
}

console.error(`\n✗ check-tokens: tìm thấy ${problems.length} vấn đề\n`)
for (const problem of problems.slice(0, 60)) {
  console.error(`  ${problem.file}:${problem.line}  "${problem.match}"\n    → ${problem.message}`)
}
if (problems.length > 60) console.error(`  … và ${problems.length - 60} vấn đề nữa`)
console.error('')
process.exit(1)
