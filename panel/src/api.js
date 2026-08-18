export async function api(ruta, opciones) {
  const res = await fetch(`/api${ruta}`, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error || `error ${res.status}`);
  return datos;
}

export const fechaCorta = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

export const enmascarar = (dni = '') => (dni.length > 4 ? '•'.repeat(dni.length - 4) + dni.slice(-4) : dni);
