// @ts-check
import { defineConfig } from 'astro/config'

// site = the Vercel preview, so og:image resolves to an absolute URL.
// ARCH_BASE (no leading slash, Git Bash would turn it into a Windows path) builds the same site under a sub-path for pagxstudio.com (sites/pagx-studio/sync-architecture.sh).
export default defineConfig({ site: 'https://pagx-architecture.vercel.app', base: `/${process.env.ARCH_BASE ?? ''}` })
