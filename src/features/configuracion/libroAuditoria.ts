import type { Hoja } from '@/lib/excel';
import type { RegistroAuditoria } from '@/data/DataSource';
import { aFechaExcel } from '@/lib/fechaExcel';
import { NOMBRE_PERFIL, nombreUsuario, perfilDeUsuario, USUARIO_SISTEMA } from '@/config/usuarios';

const MINUTO = 60_000;

const fechaHoraTexto = (t: number) => {
  const d = new Date(t);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

/** El registro de auditoría tal como está filtrado en pantalla: una fila por orden. */
export function hojasAuditoria(registros: RegistroAuditoria[], filtros: string[], ahora: number): Hoja[] {
  const rechazadas = registros.filter((r) => r.resultado === 'rechazado').length;
  return [
    {
      nombre: 'Auditoría',
      titulo: 'Registro de auditoría',
      subtitulo: `Desarenador Miraflores · ${registros.length} órdenes (${rechazadas} rechazadas) · exportado el ${fechaHoraTexto(ahora)}`,
      columnas: [
        { titulo: 'Fecha y hora', ancho: 17, formato: 'fechaHora' },
        { titulo: 'Usuario', ancho: 22 },
        { titulo: 'Perfil', ancho: 22 },
        { titulo: 'Orden', ancho: 26 },
        { titulo: 'Detalle', ancho: 60 },
        { titulo: 'Motivo', ancho: 40 },
        { titulo: 'Resultado', ancho: 12 },
      ],
      filas: registros.map((r) => {
        const perfil = perfilDeUsuario(r.usuarioId);
        return [
          aFechaExcel(Math.floor(r.t / MINUTO) * MINUTO),
          nombreUsuario(r.usuarioId),
          r.usuarioId === USUARIO_SISTEMA.id ? 'Automático' : perfil ? NOMBRE_PERFIL[perfil] : null,
          r.comando,
          r.detalle || null,
          r.motivo ?? null,
          r.resultado === 'aceptado' ? 'Aceptada' : 'Rechazada',
        ];
      }),
      notas: [
        filtros.length ? `Filtros aplicados: ${filtros.join(' · ')}.` : 'Sin filtros: todas las órdenes registradas.',
        'Generado por AquaMind con datos simulados del prototipo.',
      ],
    },
  ];
}
