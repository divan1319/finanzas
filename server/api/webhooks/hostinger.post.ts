import { eq } from "drizzle-orm";
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

const REGEX_COMPRA =
  /X+(\d{4})\s+por\s+([A-Z]{3})\s+([\d,]+(?:\.\d{1,2})?)\s+en\s+(.+?)\s+el\s+d[ií]a\s+(\d{4}-\d{2}-\d{2})/i;

function parsearCompra(texto: string) {
  const m = texto.replace(/\s+/g, " ").match(REGEX_COMPRA);
  if (!m) return null;
  const [, ultimos4, moneda, montoStr, comercio, fecha] = m;
  return {
    ultimos4,
    moneda: moneda!.toUpperCase(),
    monto: Number(montoStr!.replace(/,/g, "")),
    comercio: comercio!.trim(),
    fecha,
  };
}

function quitarHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&iacute;/g, "í");
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

  const { eventId, subject, from, date, plainBody, htmlBody, bodyUrl } =
    payload.data;

  // 1) Intentar con plainBody; 2) htmlBody; 3) descargar bodyUrl
  let compra =
    parsearCompra(plainBody || "") ?? parsearCompra(quitarHtml(htmlBody || ""));

  if (!compra && bodyUrl) {
    try {
      const completo = await $fetch<string>(bodyUrl, { responseType: "text" });
      compra = parsearCompra(quitarHtml(completo));
    } catch (e) {
      console.error("[hostinger-webhook] error descargando bodyUrl", e);
    }
  }

  if (!compra) {
    console.warn("[hostinger-webhook] no se pudo parsear", {
      eventId,
      subject,
      from,
      plainBody,
    });
    return { ok: true, parsed: false }; // 200 para que no reintente indefinidamente
  }

  if (compra.moneda !== "USD") {
    console.warn("[hostinger-webhook] compra en otra moneda", compra);
    // decide: guardarla igual, convertirla o ignorarla
  }

  // Buscar la tarjeta por su codigo
  const [tarjeta] = await db
    .select({ id: tarjetas.id, nombre: tarjetas.nombre })
    .from(tarjetas)
    .where(eq(tarjetas.codigo, "A")) // ← ajusta al nombre real de tu columna
    .limit(1);

  if (!tarjeta) {
    console.warn("[hostinger-webhook] tarjeta no registrada", compra.ultimos4);
    return { ok: true, parsed: true, tarjeta: "no encontrada" };
  }

  const nuevoGasto = await db
    .insert(gastos)
    .values({
      tarjeta_id: tarjeta.id,
      fecha: compra.fecha!,
      monto: Number(compra.monto!),
      descripcion: compra.comercio.trim(),
      categoria: "Otros",
      created_at: new Date().toISOString(),
    })
    .returning();

  // Avisar a los dispositivos suscritos. Se espera el envío (en serverless el proceso
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
