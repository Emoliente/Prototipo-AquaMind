/** Entrega un archivo al navegador para que lo guarde. Lanza si el navegador lo impide. */
export function descargarBlob(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Se libera después: algunos navegadores leen la URL un instante después del clic.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
