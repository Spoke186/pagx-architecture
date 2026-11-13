import { createClock, gsap, ScrollTrigger } from '@pagx/motion'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

type Tier = 'high' | 'medium' | 'static'
type Clock = NonNullable<ReturnType<typeof createClock>>
type Lenis = Clock['lenis'] | null
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)]
const portrait = () => innerHeight > innerWidth

// Frame counts of the dusk sequence in public/seq (the Kling video, #74; desktop every frame, phones every second one)
const SEQ = { d: { dir: `${import.meta.env.BASE_URL}seq/d/`, count: 120, step: 1 }, m: { dir: `${import.meta.env.BASE_URL}seq/m/`, count: 120, step: 2 } }

export function init() {
  const tier = (document.documentElement.dataset.tier || 'high') as Tier
  const clock = tier === 'static' ? null : createClock({ smooth: tier === 'high', lerp: 0.1 })
  const lenis = clock?.lenis ?? null

  header()
  anchors(lenis)
  menu(lenis)
  brief()
  materials()
  if (tier === 'static') return
  hero(tier)
  build(clock!)
  motion()
}

function header() {
  const hdr = $('#hdr'), hero = $('.hero')
  let last = 0
  const on = () => {
    const y = scrollY
    hdr.classList.toggle('solid', y > hero.offsetHeight - 90)
    hdr.classList.toggle('hide', y > last && y > innerHeight * 1.2)
    last = y
  }
  addEventListener('scroll', on, { passive: true })
  on()
}

function anchors(lenis: Lenis) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  $$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const el = document.querySelector<HTMLElement>(a.getAttribute('href')!)
      if (!el) return
      e.preventDefault()
      if (lenis) lenis.scrollTo(el, { duration: 1.6 })
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
    }),
  )
}

function menu(lenis: Lenis) {
  const nav = $('#mnav'), btn = $('#menuBtn')
  const set = (open: boolean) => {
    nav.hidden = !open
    btn.setAttribute('aria-expanded', String(open))
    open ? lenis?.stop() : lenis?.start()
    ;(open ? $('#menuClose') : btn).focus()
  }
  btn.addEventListener('click', () => set(true))
  $('#menuClose').addEventListener('click', () => set(false))
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') set(false)
    if (e.key !== 'Tab') return
    const f = $$('a,button', nav), first = f[0], lastEl = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
  })
  $$('a', nav).forEach((a) => a.addEventListener('click', () => { nav.hidden = true; btn.setAttribute('aria-expanded', 'false'); lenis?.start() }))
}

// The brief writes the visitor's answers into the WhatsApp message
function brief() {
  const f = $<HTMLFormElement>('#brief'), go = $<HTMLAnchorElement>('#briefGo')
  const base = new URL(f.dataset.wa!)
  const sync = () => {
    const v = (k: string) => $<HTMLSelectElement>(`#f-${k}`).value
    const text = `${base.searchParams.get('text')}\n\n(Demo brief: ${v('where')}, ${v('size')}, ${v('when')})`
    const u = new URL(base); u.searchParams.set('text', text); go.href = u.href
  }
  f.addEventListener('change', sync)
  sync()
}

// Hero: the mist loop fades in over the poster once it can play; on scroll the word drifts down and the photo up,
// and on desktop the word leans against the pointer.
function hero(tier: Tier) {
  const word = $('.h-word'), bg = $$('.h-bg, .h-vid'), vid = $<HTMLVideoElement>('.h-vid')
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vid.src = innerWidth / innerHeight > 1 ? vid.dataset.d! : vid.dataset.m!
    vid.addEventListener('playing', () => vid.classList.add('on'), { once: true })
    vid.play().catch(() => {})
  }
  gsap.from(word, { yPercent: 40, opacity: 0, duration: 1.8, ease: 'expo.out', delay: 0.15 })
  gsap.from(['.hero-body', '.hero-cta', '.hero-cap'], { opacity: 0, y: 16, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.7 })
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  tl.to(word, { yPercent: 70, opacity: 0, ease: 'none' }, 0).to(bg, { yPercent: 8, ease: 'none' }, 0)
  if (tier !== 'high' || matchMedia('(pointer: coarse)').matches) return
  const wx = gsap.quickTo(word, 'x', { duration: 1.2, ease: 'power3' })
  addEventListener('pointermove', (e) => wx((e.clientX / innerWidth - 0.5) * -10), { passive: true })
}

// Dusk: the one scroll-scrubbed moment. Frames load coarse-to-fine, so scrubbing works from the first second.
function build(clock: Clock) {
  const cv = $<HTMLCanvasElement>('#seq'), g = cv.getContext('2d')!
  const s = portrait() ? SEQ.m : SEQ.d
  const n = Math.ceil(s.count / s.step)
  const imgs: (HTMLImageElement | null)[] = Array(n).fill(null)
  const src = (i: number) => `${s.dir}f${String(i * s.step + 1).padStart(3, '0')}.webp`
  let want = 0, drawn = -1
  const load = (i: number) => new Promise<void>((res) => {
    if (imgs[i]) return res()
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => { imgs[i] = im; drawn = -2; res() }
    im.onerror = () => res()
    im.src = src(i)
  })
  const queue = async () => {
    for (const stride of [16, 8, 4, 2, 1]) {
      const batch = []
      for (let i = 0; i < n; i += stride) batch.push(load(i))
      await Promise.all(batch)
    }
  }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { queue(); o.disconnect() } }, { rootMargin: '150% 0px' }).observe(cv)

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    cv.width = Math.round(cv.clientWidth * dpr)
    cv.height = Math.round(cv.clientHeight * dpr)
    drawn = -2
  }
  addEventListener('resize', size)
  size()
  const nearest = (i: number) => {
    for (let k = 0; k < n; k++) {
      if (imgs[i - k]) return i - k
      if (imgs[i + k]) return i + k
    }
    return -1
  }
  clock.add(() => {
    const i = nearest(want)
    if (i < 0 || i === drawn) return
    const im = imgs[i]!, sc = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight)
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc
    g.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h)
    drawn = i
  })

  // five chapters, each owning a fifth of the scroll; the step bars fill as you go
  const chapters = $$('.chapter'), steps = $$('.b-steps li'), N = chapters.length
  ScrollTrigger.create({
    trigger: '#build', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (st) => {
      const p = st.progress
      want = Math.min(n - 1, Math.round(p * (n - 1)))
      const c = p < 0.01 ? -1 : Math.min(N - 1, Math.floor(p * N))
      chapters.forEach((el, k) => el.classList.toggle('on', k === c))
      steps.forEach((el, k) => {
        el.style.setProperty('--p', String(Math.min(1, Math.max(0, p * N - k))))
        el.classList.toggle('on', k <= c)
      })
    },
  })
}

// Materials: the item you hover, or the one crossing the middle of the screen, owns the sticky photo (desktop only)
function materials() {
  const items = $$('.m-item'), pics = $$('.m-pic')
  const set = (i: number) => {
    items.forEach((el, k) => el.classList.toggle('on', k === i))
    pics.forEach((el, k) => el.classList.toggle('on', k === i))
  }
  items.forEach((el, i) => {
    el.addEventListener('pointerenter', () => set(i))
    ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => st.isActive && set(i) })
  })
}

function motion() {
  $$('.split').forEach((h) => {
    const sp = SplitText.create(h, { type: 'lines', mask: 'lines' })
    gsap.from(sp.lines, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: h, start: 'top 85%' } })
  })
  gsap.from('.facts li', { opacity: 0, y: 24, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.facts', start: 'top 85%' } })
  // Casa Niebla opens from a framed photo to full bleed as it rises into view
  gsap.fromTo('.w-hero-img', { clipPath: 'inset(9% 7% 9% 7%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.w-hero', start: 'top 95%', end: 'top 10%', scrub: true } })
  gsap.fromTo('.w-hero-img img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.w-hero', start: 'top bottom', end: 'bottom top', scrub: true } })
  gsap.from('.w-hero figcaption > *', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.w-hero', start: 'top 30%' } })
  // the other photos are uncovered from below, once
  $$('.reveal').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: f, start: 'top 88%' } })
    gsap.from($('img', f), { scale: 1.2, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 88%' } })
  })
  gsap.from('.proj-copy > *', { opacity: 0, y: 24, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.projects', start: 'top 75%' } })
  gsap.from('.steps li', { opacity: 0, y: 20, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.steps', start: 'top 80%' } })
  // the footer word rises out of the dark, and the forest inside the letters drifts with the scroll
  gsap.from('.ftr-word', { yPercent: 35, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.ftr-word', start: 'top 95%' } })
  gsap.fromTo('.ftr-word', { backgroundPosition: '50% 0%' }, { backgroundPosition: '50% 70%', ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'bottom bottom', scrub: true } })
  addEventListener('load', () => ScrollTrigger.refresh())
}
