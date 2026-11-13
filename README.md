# PAGX Architecture

Concepto de estudio de arquitectura. Casa Niebla pasa de la tarde gris a la hora azul con el scroll: una secuencia de 120 cuadros, loop de niebla en el hero y galería de materiales.

**En vivo:** https://pagx-architecture.vercel.app

> Concepto propio de PagX Studio: la marca, los productos y las cifras son ficticios.

## Stack

Astro 7 · GSAP + ScrollTrigger · Lenis · secuencia de cuadros en canvas

Sitio 100 % estático, con tres niveles de animación (alto, medio y estático) y soporte para `prefers-reduced-motion`.

## Correr en local

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # salida estática en dist/
```

Requiere Node 22.12 o superior. `packages/motion` es el reloj de scroll compartido de PagX: GSAP y Lenis se mueven con un solo ticker.

## Licencia

© 2026 Esteban Muñoz · [PagX Studio](https://pagxstudio.com). Todos los derechos reservados. Ver [LICENSE](LICENSE).
