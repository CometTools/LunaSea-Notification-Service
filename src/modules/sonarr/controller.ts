import express from 'express';
import { Models, Payloads } from './';
import { Middleware, Models as ServerModels } from '../../server';
import { Firebase } from '../../services';
import { Constants, Logger, Payloads as GenericPayloads } from '../../utils';

export const enable = (api: express.Router) => api.use(route, router);

const router = express.Router();
const route = '/sonarr';

router.post(
  '/user/:id',
  Middleware.validateUser,
  Middleware.checkNotificationPassword,
  Middleware.extractProfile,
  Middleware.pullUserTokens,
  handler,
);
router.post('/device/:id', Middleware.extractProfile, Middleware.extractDeviceToken, handler);

/**
 * Sonarr Webhook Handler: Handles a webhook from Sonarr, and sends a notification to all devices that are in `response.locals.tokens`.
 *
 * @param request Express request object
 * @param response Express response object
 */
async function handler(request: express.Request, response: express.Response): Promise<void> {
  Logger.info('Running Sonarr webhook...');
  try {
    Logger.debug('-> Sending HTTP response to complete webhook...');
    response.status(200).json(<ServerModels.Response>{ message: Constants.MESSAGE.OK });
    Logger.debug('-> HTTP response sent (200 OK)');
    await _handleWebhook(request.body, response.locals.tokens, response.locals.profile);
  } catch (error: any) {
    Logger.error(error.message);
    Logger.debug('-> Sending HTTP response to complete webhook...');
    response
      .status(500)
      .json(<ServerModels.Response>{ message: Constants.MESSAGE.INTERNAL_SERVER_ERROR });
    Logger.debug('HTTP response sent (500 Internal Server Error)');
  }
  Logger.info('Finished Sonarr webhook.');
}

/**
 * Given the request data body, execute the correct webhook handler.
 *
 * @private
 * @param data Webhook notification payload
 * @param devices List of devices to send the notification to
 * @param profile The profile name to attach to the title
 */
const _handleWebhook = async (data: any, devices: string[], profile: string): Promise<void> => {
  Logger.debug('-> Preparing payload...');
  let payload: GenericPayloads.Notification;
  switch (data.eventType) {
    case Models.EventType.Download:
      Logger.info('-> Handling as "Download" event type...');
      payload = await Payloads.download(data, profile);
      break;
    case Models.EventType.EpisodeFileDelete:
      Logger.info('-> Handling as "EpisodeFileDelete" event type...');
      payload = await Payloads.deleteEpisodeFile(data, profile);
      break;
    case Models.EventType.Grab:
      Logger.info('-> Handling as "Grab" event type...');
      payload = await Payloads.grab(data, profile);
      break;
    case Models.EventType.Health:
      Logger.info('-> Handling as "Health" event type...');
      payload = await Payloads.health(data, profile);
      break;
    case Models.EventType.Rename:
      Logger.info('-> Handling as "Rename" event type...');
      payload = await Payloads.rename(data, profile);
      break;
    case Models.EventType.SeriesDelete:
      Logger.info('-> Handling as "SeriesDelete" event type...');
      payload = await Payloads.deleteSeries(data, profile);
      break;
    case Models.EventType.Test:
      Logger.info('-> Handling as "Test" event type...');
      payload = await Payloads.test(data, profile);
      break;
    default:
      Logger.warn('-> An unknown eventType was received:', JSON.stringify(data));
      return;
  }
  await Firebase.sendNotification(devices, payload);
};