/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{tsx,html}",
    "./src/lib/prompt.ts" // 关键：让 Tailwind 扫描 prompt.ts 里的字符串模板，防止类名被 purge 掉
  ],
  darkMode: "media"
}
