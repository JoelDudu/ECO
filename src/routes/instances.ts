import { Router } from 'express';
import {
  connectInstance,
  createInstance,
  deleteInstance,
  disconnectInstance,
  getInstance,
  getQrJson,
  getQrPage,
  listInstances,
  requestPairingCode,
  setWebhook,
  streamEvents,
} from '../controllers/instances.controller';
import {
  markAsRead,
  sendAudio,
  sendDocument,
  sendImage,
  sendLocation,
  sendReaction,
  sendSticker,
  sendText,
  sendVideo,
} from '../controllers/messages.controller';

export const instancesRouter = Router();

// ── Gerenciamento de Instâncias ───────────────────────────────────────────────
instancesRouter.get('/', listInstances);
instancesRouter.post('/', createInstance);
instancesRouter.get('/:name', getInstance);
instancesRouter.delete('/:name', deleteInstance);
instancesRouter.post('/:name/connect', connectInstance);
instancesRouter.post('/:name/disconnect', disconnectInstance);

// ── QR Code & Pairing ─────────────────────────────────────────────────────────
instancesRouter.get('/:name/qr', getQrPage);
instancesRouter.get('/:name/qr-json', getQrJson);
instancesRouter.post('/:name/pairing-code', requestPairingCode);

// ── Webhook ───────────────────────────────────────────────────────────────────
instancesRouter.post('/:name/webhook', setWebhook);

// ── SSE (Server-Sent Events) ──────────────────────────────────────────────────
instancesRouter.get('/:name/events', streamEvents);

// ── Envio de Mensagens ────────────────────────────────────────────────────────
instancesRouter.post('/:name/send/text', sendText);
instancesRouter.post('/:name/send/image', sendImage);
instancesRouter.post('/:name/send/video', sendVideo);
instancesRouter.post('/:name/send/audio', sendAudio);
instancesRouter.post('/:name/send/document', sendDocument);
instancesRouter.post('/:name/send/location', sendLocation);
instancesRouter.post('/:name/send/sticker', sendSticker);
instancesRouter.post('/:name/send/reaction', sendReaction);
instancesRouter.post('/:name/read', markAsRead);
