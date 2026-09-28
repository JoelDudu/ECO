import type { Request, Response } from 'express';
import { z } from 'zod';
import { SessionManager } from '../core/session-manager';

const manager = SessionManager.getInstance();

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateBody<T>(schema: z.ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return null;
  }
  return result.data;
}

function getSession(name: string, res: Response) {
  const session = manager.get(name);
  if (!session) {
    res.status(404).json({ success: false, error: `Instance '${name}' not found` });
    return null;
  }
  if (!session.isConnected) {
    res.status(409).json({
      success: false,
      error: `Instance '${name}' is not connected (status: ${session.status})`,
    });
    return null;
  }
  return session;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const PhoneSchema = z.string().min(8).transform((v) => v.replace(/\D/g, ''));

const SendTextSchema = z.object({
  phone: PhoneSchema,
  message: z.string().min(1, 'message cannot be empty'),
  quoted: z.string().optional(), // messageId para responder
});

const SendImageSchema = z.object({
  phone: PhoneSchema,
  url: z.string().url('url must be a valid URL'),
  caption: z.string().optional(),
});

const SendVideoSchema = z.object({
  phone: PhoneSchema,
  url: z.string().url(),
  caption: z.string().optional(),
});

const SendAudioSchema = z.object({
  phone: PhoneSchema,
  url: z.string().url('url must be a valid URL'),
  ptt: z.boolean().default(true), // true = microfone azul (Voice Note), false = arquivo de áudio
});

const SendDocumentSchema = z.object({
  phone: PhoneSchema,
  url: z.string().url(),
  filename: z.string().default('document'),
  mimetype: z.string().default('application/octet-stream'),
  caption: z.string().optional(),
});

const SendLocationSchema = z.object({
  phone: PhoneSchema,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  name: z.string().optional(),
});

const SendStickerSchema = z.object({
  phone: PhoneSchema,
  url: z.string().url(),
});

const SendReactionSchema = z.object({
  phone: PhoneSchema,
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

const MarkReadSchema = z.object({
  phone: PhoneSchema,
  messageIds: z.array(z.string()).min(1),
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /instances/:name/send/text
 * Envia uma mensagem de texto simples.
 */
export async function sendText(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendTextSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendText(jid, body.message);
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/image
 * Envia uma imagem a partir de uma URL.
 */
export async function sendImage(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendImageSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendMedia(jid, {
      type: 'image',
      url: body.url,
      ...(body.caption !== undefined && { caption: body.caption }),
    });
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/video
 * Envia um vídeo a partir de uma URL.
 */
export async function sendVideo(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendVideoSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendMedia(jid, {
      type: 'video',
      url: body.url,
      ...(body.caption !== undefined && { caption: body.caption }),
    });
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/audio
 * Envia um áudio como Voice Note PTT (microfone azul) ou arquivo de áudio.
 */
export async function sendAudio(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendAudioSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendAudio(jid, body.url, body.ptt);
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/document
 * Envia um documento/arquivo a partir de uma URL.
 */
export async function sendDocument(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendDocumentSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendMedia(jid, {
      type: 'document',
      url: body.url,
      ...(body.filename !== undefined && { filename: body.filename }),
      ...(body.mimetype !== undefined && { mimetype: body.mimetype }),
      ...(body.caption !== undefined && { caption: body.caption }),
    });
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/location
 * Envia uma localização geográfica.
 */
export async function sendLocation(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendLocationSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendLocation(jid, body.latitude, body.longitude, body.name);
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/sticker
 * Envia uma figurinha (sticker) a partir de uma URL.
 */
export async function sendSticker(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendStickerSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    const result = await session.sendMedia(jid, { type: 'sticker', url: body.url });
    res.json({ success: true, instance: name, messageId: result?.key.id, jid });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/send/reaction
 * Envia uma reação (emoji) a uma mensagem existente.
 */
export async function sendReaction(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(SendReactionSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    await session.sendReaction(jid, body.messageId, body.emoji);
    res.json({ success: true, instance: name });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * POST /instances/:name/read
 * Marca mensagens como lidas (checkmarks azuis).
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { name } = req.params as { name: string };
  const session = getSession(name, res);
  if (!session) return;

  const body = validateBody(MarkReadSchema, req.body, res);
  if (!body) return;

  try {
    const jid = await session.resolveJid(body.phone);
    await session.markAsRead(jid, body.messageIds);
    res.json({ success: true, instance: name, marked: body.messageIds.length });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
