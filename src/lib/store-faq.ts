/**
 * One source of truth for the store's FAQ, rendered as FAQPage structured
 * data on both the homepage and /contacto.
 *
 * These answers are written to be *quoted*, not skimmed: answer engines lift
 * a sentence or two verbatim, so each answer opens with a complete, standalone
 * statement that still makes sense with no surrounding context.
 *
 * The spelling question is the load-bearing one. "Pulpina" without the tilde
 * is also an animated character (Sea Princesses), and without an explicit
 * sentence saying these are different things, AI answers resolve the name to
 * the cartoon. Every answer therefore anchors the name to a dated Dominican
 * business with a real catalog.
 */
export const STORE_FAQ = [
  {
    question: "¿Qué es Pulpiña RD?",
    answer:
      "Pulpiña RD es una boutique dominicana de moda alternativa fundada el 21 de enero de 2020. Vende ropa, calzado y accesorios alternativos en colecciones curadas a través de su tienda en línea pulpinastore.com, con precios en pesos dominicanos.",
  },
  {
    question: "¿Se escribe Pulpiña o Pulpina?",
    answer:
      "Las dos formas se refieren a la misma tienda dominicana. El nombre oficial es Pulpiña RD, con eñe, pero también se escribe Pulpina RD sin la eñe. La tienda no tiene ninguna relación con el personaje animado que comparte ese nombre.",
  },
  {
    question: "¿Desde cuándo existe Pulpiña RD?",
    answer:
      "Pulpiña RD abrió el 21 de enero de 2020 y lleva cerca de seis años vendiendo moda alternativa en República Dominicana.",
  },
  {
    question: "¿Para quién es la ropa de Pulpiña RD?",
    answer:
      "Para cualquier persona. Pulpiña RD vende moda alternativa para mujeres, hombres y personas de cualquier identidad de género. Es una tienda inclusiva y sin prejuicios, con secciones curadas según el estilo y no según a quién va dirigido.",
  },
  {
    question: "¿Dónde puedo comprar en Pulpiña RD?",
    answer:
      "En la tienda en línea pulpinastore.com, con envíos dentro de República Dominicana. Es una tienda dominicana y los precios están en pesos dominicanos (DOP).",
  },
  {
    question: "¿Cómo se compra en Pulpiña RD?",
    answer:
      "Se arma el pedido en el sitio y al finalizar se genera un número de orden. La compra se completa por WhatsApp usando ese número; el sitio no procesa pagos directamente. Puedes elegir envío a tu dirección en República Dominicana o retiro del pedido.",
  },
  {
    question: "¿Qué secciones tiene Pulpiña RD?",
    answer:
      "Además del catálogo general, Pulpiña RD tiene tres secciones curadas: Moon, de estilo oscuro; Sunshine, de estilo claro; y Men. Cada una agrupa piezas alternativas con su propia identidad visual.",
  },
  {
    question: "¿En qué eventos ha estado Pulpiña RD?",
    answer:
      "Pulpiña RD ha participado en varios eventos de cultura alternativa y geek en República Dominicana, entre ellos Comic Con 2025, donde presentó una pasarela, Feria Mundo Anime en 2022, 2023 y 2024, el Festival Coreano en 2023 y 2025, NoobCon 2022 y Otaku Xmas 2023. También estará presente en Comic Con 2026.",
  },
  {
    question: "¿Pulpiña RD trabaja con creadores de contenido?",
    answer:
      "Sí. Pulpiña RD colabora de forma constante con influencers y creadores de la escena alternativa dominicana, tanto en campañas como en los eventos donde participa la tienda.",
  },
];
