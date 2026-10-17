import { like } from "drizzle-orm";
import { db } from "~~/server/db";
import { gastos, tarjetas } from "~~/server/db/schema";
import { enviarPush } from "~~/server/utils/webPush";
import { construirNotificacionGasto } from "#shared/utils/pushNotificaciones";

interface HostingerWebhookPayload {
  id: string;
  event: "message.received" | string;
  timestamp: string;
  data: {
    eventId: string;
    mailboxAddress: string;
    messageId: string;
    inReplyTo: string;
    references: string[];
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    date: string;
    plainBody: string;
    htmlBody: string;
    bodyUrl: string;
    attachments: Array<{
      contentType: string;
      filename: string;
      sizeBytes: number;
      fileUrl: string;
    }>;
  };
}

interface Compra {
  ultimos4: string;
  moneda: string;
  monto: number;
  comercio: string;
  fecha: string; // YYYY-MM-DD
}

const REGEX_CUSCATLAN =
  /X+(\d{4})\s+por\s+([A-Z]{3})\s+([\d,]+(?:\.\d{1,2})?)\s+en\s+(.+?)\s+el\s+d[ií]a\s+(\d{4}-\d{2}-\d{2})/i;

const REGEX_AGRICOLA =
  /tarjeta de cr[eé]dito\s+(\d{4})\s+ha realizado una compra por\s+([A-Z]{3})\s+([\d,]+(?:\.\d{1,2})?)\s+en\s+(.+?)\s+Fecha\/Hora:\s*(\d{2})\/(\d{2})\/(\d{4})/i;

const normalizar = (texto: string) => texto.replace(/\s+/g, " ");

function parsearCuscatlan(texto: string): Compra | null {
  const m = normalizar(texto).match(REGEX_CUSCATLAN);
  if (!m) return null;
  const [, ultimos4, moneda, montoStr, comercio, fecha] = m;
  return {
    ultimos4: ultimos4!,
    moneda: moneda!.toUpperCase(),
    monto: Number(montoStr!.replace(/,/g, "")),
    comercio: comercio!.trim(),
    fecha: fecha!,
  };
}

function parsearAgricola(texto: string): Compra | null {
  const m = normalizar(texto).match(REGEX_AGRICOLA);
  if (!m) return null;
  const [, ultimos4, moneda, montoStr, comercio, dd, mm, yyyy] = m;
  return {
    ultimos4: ultimos4!,
    moneda: moneda!.toUpperCase(),
    monto: Number(montoStr!.replace(/,/g, "")),
    comercio: comercio!.trim(),
    fecha: `${yyyy}-${mm}-${dd}`, // el Agrícola manda DD/MM/AAAA
  };
}

// El texto completo viene en bodyUrl (plainBody está truncado a 200 caracteres).
// Si la descarga falla, se usa plainBody como respaldo.
async function obtenerTexto(bodyUrl: string, plainBody: string) {
  if (bodyUrl) {
    try {
      const completo = await $fetch<{ plainText?: string; html?: string }>(
        bodyUrl,
      );
      if (completo?.plainText) return completo.plainText;
    } catch (e) {
      console.error("[hostinger-webhook] error descargando bodyUrl", e);
    }
  }
  return plainBody || "";
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const authHeader = getHeader(event, "authorization");

  // 1. Verificar el Bearer Token que genera Hostinger al crear el webhook
  if (
    !authHeader ||
    authHeader !== `Bearer ${config.hostingerWebhookEmailKey}`
  ) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const payload = await readBody<HostingerWebhookPayload>(event);

  if (payload?.event !== "message.received" || !payload?.data) {
    return { ok: true, ignored: true };
  }

  const { eventId, subject, from, plainBody, bodyUrl } = payload.data;

  // 2. Obtener el texto completo y probar los parsers de cada banco
  const texto = await obtenerTexto(bodyUrl, plainBody);
  const compra = parsearCuscatlan(texto) ?? parsearAgricola(texto);

  if (!compra) {
    console.warn("[hostinger-webhook] no se pudo parsear", {
      eventId,
      subject,
      from,
      texto: texto.slice(0, 1000),
    });
    return { ok: true, parsed: false }; // 200 para que no reintente indefinidamente
  }

  if (compra.moneda !== "USD") {
    console.warn("[hostinger-webhook] compra en otra moneda", compra);
    // decide: guardarla igual, convertirla o ignorarla
  }

  // 3. Buscar la tarjeta por sus últimos 4 dígitos (el nombre termina en ellos, ej. "Visa - 1231")
  const [tarjeta] = await db
    .select({ id: tarjetas.id, nombre: tarjetas.nombre })
    .from(tarjetas)
    .where(like(tarjetas.nombre, `%${compra.ultimos4}`))
    .limit(1);

  if (!tarjeta) {
    console.warn("[hostinger-webhook] tarjeta no registrada", compra.ultimos4);
    return { ok: true, parsed: true, tarjeta: "no encontrada" };
  }

  // 4. Guardar el gasto
  const nuevoGasto = await db
    .insert(gastos)
    .values({
      tarjeta_id: tarjeta.id,
      fecha: compra.fecha,
      monto: compra.monto,
      descripcion: compra.comercio,
      categoria: "Otros",
      created_at: new Date().toISOString(),
    })
    .returning();

  // 5. Avisar a los dispositivos suscritos. Se espera el envío (en serverless el proceso
  // puede congelarse al responder) pero un fallo nunca debe impedir responder 200,
  // o Hostinger reintentaría y se duplicaría el gasto.
  try {
    await enviarPush(
      construirNotificacionGasto({
        id: nuevoGasto[0]?.id,
        monto: compra.monto,
        moneda: compra.moneda,
        comercio: compra.comercio,
        tarjetaNombre: tarjeta.nombre,
      }),
    );
  } catch (e) {
    console.error("[hostinger-webhook] error enviando notificación push", e);
  }

  return {
    success: true,
    gasto: nuevoGasto[0],
  };
});