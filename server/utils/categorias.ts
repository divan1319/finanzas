// server/utils/categorias.ts

// El orden importa: gana la primera categoría que coincida.
const REGLAS_CATEGORIA: Array<{ categoria: string; palabras: string[] }> = [
  {
    categoria: "Alimentos",
    palabras: ["PEDIDOSYA", "CAFETERIA", "WENDYS", "BURGER KING"],
  },
  {
    categoria: "Compras",
    palabras: ["SELECTOS", "SIMAN"],
  },
  {
    categoria: "Servicios",
    palabras: ["BANCA DIGITAL"],
  },
  {
    categoria: "Suscripciones",
    palabras: ["POKEMON", "SPOTIFY", "GOOGLE", "CLAUDE"],
  },
  {
    categoria: "Salud & Farmacia",
    palabras: ["SAN NICOLAS", "FARMAVALUE"],
  },
];

// Mayúsculas, sin tildes y sin espacios/símbolos: así "Pedidos Ya", "PEDIDOSYA"
// y "PedidosYa" coinciden igual, y "WENDY'S" coincide con "WENDYS".
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function obtenerCategoria(comercio: string): string {
  const texto = normalizar(comercio);
  for (const { categoria, palabras } of REGLAS_CATEGORIA) {
    if (palabras.some((p) => texto.includes(normalizar(p)))) {
      return categoria;
    }
  }
  return "Otros";
}