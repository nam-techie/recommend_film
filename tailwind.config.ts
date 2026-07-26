import type { Config } from 'tailwindcss'

/**
 * Token layer duy nhất của CineMind.
 * Giá trị thật nằm ở app/globals.css (:root). File này chỉ ánh xạ sang class.
 *
 * Quy tắc:
 *  - Màu nhấn: chỉ dùng `accent`. Không gọi trực tiếp thang fuchsia hay purple của Tailwind.
 *  - Chữ: chỉ dùng fg / fg-secondary / fg-muted. Không dùng slate-500/600/700 (fail contrast).
 *  - Bán kính: sm / md / lg / xl / full. Không dùng giá trị tuỳ ý kiểu [1.7rem].
 *  - Cỡ chữ nhỏ nhất là `xs` (12px). Không có 9px/10px/11px.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Thân bài: font đọc tốt tiếng Việt ở cỡ nhỏ.
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Tiêu đề: font display.
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        bg: 'hsl(var(--bg))',
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
          DEFAULT: 'hsl(var(--surface-1))',
        },
        fg: {
          DEFAULT: 'hsl(var(--fg))',
          secondary: 'hsl(var(--fg-secondary))',
          muted: 'hsl(var(--fg-muted))',
          /** Chỉ cho icon phụ và đường kẻ — KHÔNG dùng cho text. */
          faint: 'hsl(var(--fg-faint))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          strong: 'hsl(var(--accent-strong))',
          soft: 'hsl(var(--accent-soft))',
          fg: 'hsl(var(--accent-fg))',
        },
        rating: 'hsl(var(--rating))',
        ok: 'hsl(var(--ok))',
        warn: 'hsl(var(--warn))',
        bad: 'hsl(var(--bad))',
        info: { DEFAULT: 'hsl(var(--info))', soft: 'hsl(var(--info-soft))' },

        // --- shadcn/radix compat ---
        background: 'hsl(var(--bg))',
        foreground: 'hsl(var(--fg))',
        card: { DEFAULT: 'hsl(var(--surface-1))', foreground: 'hsl(var(--fg))' },
        popover: { DEFAULT: 'hsl(var(--surface-2))', foreground: 'hsl(var(--fg))' },
        primary: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-fg))' },
        secondary: { DEFAULT: 'hsl(var(--surface-2))', foreground: 'hsl(var(--fg))' },
        muted: { DEFAULT: 'hsl(var(--surface-2))', foreground: 'hsl(var(--fg-muted))' },
        destructive: { DEFAULT: 'hsl(var(--bad))', foreground: '#fff' },
        success: { DEFAULT: 'hsl(var(--ok))', foreground: '#fff' },
        warning: { DEFAULT: 'hsl(var(--warn))', foreground: '#fff' },
        danger: { DEFAULT: 'hsl(var(--bad))', foreground: '#fff' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--accent))',
        text: 'hsl(var(--fg))',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-xl)',
        '3xl': 'var(--radius-xl)',
      },
      fontSize: {
        // Sàn 12px — bỏ mọi cỡ nhỏ hơn.
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.9rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.2rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.05' }],
        '6xl': ['3.75rem', { lineHeight: '1.03' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      boxShadow: {
        card: '0 12px 32px -12px rgb(0 0 0 / 0.6)',
        raised: '0 24px 70px -20px rgb(0 0 0 / 0.65)',
        accent: '0 12px 32px -12px hsl(var(--accent) / 0.45)',
      },
      maxWidth: {
        // Một chiều rộng nội dung duy nhất (trước đây có 1800/1600/1540/1500/1280 lẫn lộn).
        shell: '1600px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
