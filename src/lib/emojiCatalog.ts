/**
 * Catálogo de emojis para etiquetas y categorías.
 *
 * Por qué una lista propia y no una librería: `emoji-picker-react` y
 * `emoji-mart` pesan entre 500 kB y más de 1 MB con sus datos, cuando el
 * bundle entero de Áurea ronda los 254 kB. Multiplicar por tres el peso de la
 * app para elegir un icono no sale a cuenta, y además traen su propio aspecto,
 * que no es el de aquí.
 *
 * A cambio, esta lista no es exhaustiva — por eso el selector deja pegar
 * cualquier otro emoji a mano. Lo curado cubre lo que se usa a diario en
 * finanzas, viajes y casa; el resto sigue siendo posible.
 *
 * Las palabras clave están en español y sin tildes: el buscador normaliza lo
 * que se teclea, así "avion" encuentra ✈️ y "cafe" encuentra ☕.
 */

export interface EmojiGroup {
  label: string
  emojis: { char: string; keywords: string }[]
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: 'Dinero',
    emojis: [
      { char: '💰', keywords: 'dinero saco ahorro' },
      { char: '💶', keywords: 'euro billete dinero' },
      { char: '💵', keywords: 'dolar billete dinero' },
      { char: '💳', keywords: 'tarjeta credito pago' },
      { char: '🏦', keywords: 'banco' },
      { char: '🧾', keywords: 'recibo factura ticket' },
      { char: '📈', keywords: 'inversion bolsa subida' },
      { char: '📉', keywords: 'perdida bajada bolsa' },
      { char: '🪙', keywords: 'moneda cripto' },
      { char: '💸', keywords: 'gasto volando dinero' },
      { char: '🐷', keywords: 'hucha ahorro cerdo' },
      { char: '🧮', keywords: 'cuentas abaco calculo' },
    ],
  },
  {
    label: 'Viajes',
    emojis: [
      { char: '✈️', keywords: 'avion vuelo viaje' },
      { char: '🧳', keywords: 'maleta equipaje viaje' },
      { char: '🏨', keywords: 'hotel alojamiento' },
      { char: '🗺️', keywords: 'mapa viaje ruta' },
      { char: '🚕', keywords: 'taxi coche' },
      { char: '🚆', keywords: 'tren ferrocarril' },
      { char: '🚌', keywords: 'autobus bus' },
      { char: '⛽', keywords: 'gasolina combustible' },
      { char: '🚗', keywords: 'coche automovil' },
      { char: '🛳️', keywords: 'barco crucero' },
      { char: '🏖️', keywords: 'playa vacaciones' },
      { char: '⛰️', keywords: 'montana senderismo' },
      { char: '🎒', keywords: 'mochila excursion' },
      { char: '📸', keywords: 'foto camara recuerdo' },
    ],
  },
  {
    label: 'Banderas',
    emojis: [
      { char: '🇪🇸', keywords: 'espana bandera' },
      { char: '🇨🇳', keywords: 'china bandera' },
      { char: '🇵🇱', keywords: 'polonia bandera' },
      { char: '🇬🇧', keywords: 'reino unido inglaterra bandera' },
      { char: '🇵🇹', keywords: 'portugal bandera' },
      { char: '🇫🇷', keywords: 'francia bandera' },
      { char: '🇮🇹', keywords: 'italia bandera' },
      { char: '🇩🇪', keywords: 'alemania bandera' },
      { char: '🇺🇸', keywords: 'estados unidos eeuu bandera' },
      { char: '🇯🇵', keywords: 'japon bandera' },
      { char: '🇲🇦', keywords: 'marruecos bandera' },
      { char: '🇸🇪', keywords: 'suecia bandera' },
    ],
  },
  {
    label: 'Casa',
    emojis: [
      { char: '🏠', keywords: 'casa hogar vivienda' },
      { char: '🔑', keywords: 'llave alquiler piso' },
      { char: '💡', keywords: 'luz electricidad bombilla' },
      { char: '🚿', keywords: 'agua ducha' },
      { char: '🔥', keywords: 'gas calefaccion' },
      { char: '📶', keywords: 'internet wifi movil' },
      { char: '🧹', keywords: 'limpieza casa' },
      { char: '🛋️', keywords: 'muebles sofa hogar' },
      { char: '🔧', keywords: 'reparacion arreglo herramienta' },
      { char: '🪴', keywords: 'planta jardin' },
    ],
  },
  {
    label: 'Comida',
    emojis: [
      { char: '🛒', keywords: 'compra supermercado carrito' },
      { char: '🍽️', keywords: 'restaurante comida cena' },
      { char: '☕', keywords: 'cafe desayuno' },
      { char: '🍺', keywords: 'cerveza bar copas' },
      { char: '🍷', keywords: 'vino copas' },
      { char: '🍕', keywords: 'pizza comida rapida' },
      { char: '🍜', keywords: 'ramen sopa asiatica' },
      { char: '🥐', keywords: 'panaderia croissant desayuno' },
      { char: '🍣', keywords: 'sushi japones' },
      { char: '🥗', keywords: 'ensalada sano' },
    ],
  },
  {
    label: 'Ocio y salud',
    emojis: [
      { char: '🎬', keywords: 'cine peliculas suscripcion' },
      { char: '🎵', keywords: 'musica suscripcion' },
      { char: '🎮', keywords: 'videojuegos juegos' },
      { char: '📚', keywords: 'libros lectura estudio' },
      { char: '🏋️', keywords: 'gimnasio deporte' },
      { char: '⚽', keywords: 'futbol deporte' },
      { char: '💊', keywords: 'salud medicina farmacia' },
      { char: '🦷', keywords: 'dentista salud' },
      { char: '🐶', keywords: 'perro mascota' },
      { char: '🐱', keywords: 'gato mascota' },
      { char: '🎁', keywords: 'regalo cumpleanos' },
      { char: '🎄', keywords: 'navidad fiestas' },
    ],
  },
  {
    label: 'Personas y trabajo',
    emojis: [
      { char: '👤', keywords: 'persona alguien' },
      { char: '👥', keywords: 'personas compartido grupo' },
      { char: '👫', keywords: 'pareja dos' },
      { char: '👶', keywords: 'bebe hijo ninos' },
      { char: '💼', keywords: 'trabajo maletin negocio' },
      { char: '💻', keywords: 'ordenador trabajo portatil' },
      { char: '🧑‍🎓', keywords: 'estudios universidad formacion' },
      { char: '🏢', keywords: 'oficina empresa' },
      { char: '✂️', keywords: 'peluqueria corte cuidado' },
      { char: '👕', keywords: 'ropa camiseta' },
    ],
  },
]

/** Sin tildes y en minúsculas, para que "avion" encuentre "avión". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Los emojis cuyo texto de búsqueda contiene la consulta. Vacía = todos, por grupos. */
export function searchEmojis(query: string): EmojiGroup[] {
  const q = normalize(query)
  if (!q) return EMOJI_GROUPS
  return EMOJI_GROUPS.map((group) => ({
    label: group.label,
    emojis: group.emojis.filter((e) => normalize(e.keywords).includes(q) || normalize(group.label).includes(q)),
  })).filter((group) => group.emojis.length > 0)
}
