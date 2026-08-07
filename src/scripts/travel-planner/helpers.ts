// Consulta obligatoria: falla temprano cuando el HTML esperado no existe.
export function element<T extends HTMLElement>(selector: string): T {
  const match = document.querySelector<T>(selector);
  if (!match) throw new Error(`No se encontró el elemento ${selector}`);
  return match;
}

export function tomorrow(): string {
  // Se construye con valores locales para evitar cambios de día provocados por UTC.
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
