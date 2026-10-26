/**
 * Pasar como `onUpdate` a los elementos de Framer Motion que animan `opacity`.
 *
 * Framer acelera la opacidad con animaciones nativas del navegador (WAAPI). Al
 * terminar, el elemento vuelve un instante a su opacidad inicial (0) antes de
 * fijar la final: se ve un parpadeo (p. ej. al abrir el diálogo de purga).
 * Con un `onUpdate` presente, Framer anima por JavaScript y no hay parpadeo.
 */
export const sinAceleracion = () => {};

/**
 * Redondea la meta de una animación a `paso` unidades del dibujo. Los niveles cambian
 * décimas de píxel cada segundo: sin esto, cada dato arranca un resorte invisible que
 * obliga a recalcular estilos y repintar el SVG.
 */
export const aPaso = (v: number, paso = 0.5) => Math.round(v / paso) * paso;
