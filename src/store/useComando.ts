import { useCallback } from 'react';
import type { Comando } from '@/data/DataSource';
import { useTelemetria } from './useTelemetria';
import { useUsuario } from './useOperacion';

type SinUsuario<C> = C extends { usuarioId: string } ? Omit<C, 'usuarioId'> : C;
export type ComandoUsuario = SinUsuario<Comando>;

/** Envía un comando firmado con el usuario del perfil activo (queda en la auditoría). */
export function useComando() {
  const enviar = useTelemetria((s) => s.enviar);
  const usuario = useUsuario();
  return useCallback(
    (c: ComandoUsuario) => enviar({ ...c, usuarioId: usuario.id } as Comando),
    [enviar, usuario.id],
  );
}
