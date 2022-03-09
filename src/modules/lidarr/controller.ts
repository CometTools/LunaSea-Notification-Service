import express from 'express';
import { Models, Payloads } from './';
import { Middleware, Models as ServerModels } from '../../server';
import { Firebase } from '../../services';
import { Constants, Logger, Notifications } from '../../utils';

export const enable = (api: express.Router) => api.use(route, router);

const router = express.Router();
const route = '/lidarr';

router.post(
  '/user/:id',
  Middleware.validateUser,
  Middleware.checkNotificationPassword,
  Middleware.pullUserTokens,
  handler,
);
router.post('/device/:id', Middleware.extractDeviceToken, handler);

async function handler(request: express.Request, response: express.Response): Promise<void> {
  try {
    response.status(200).json(<ServerModels.Response>{ message: Constants.MESSAGE.OK });
    Logger.debug('-> HTTP response sent (200 OK)');
    await _handleWebhook(
      request.body,
      response.locals.tokens,
      response.locals.profile,
      response.locals.notificationSettings,
    );
  } catch (error) {
    Logger.error(error);
    response
      .status(500)
      .json(<ServerModels.Response>{ message: Constants.MESSAGE.INTERNAL_SERVER_ERROR });
    Logger.debug('HTTP response sent (500 Internal Server Error)');
  }
}

const _handleWebhook = async (
  data: any,
  devices: string[],
  profile: string,
  settings: Notifications.Settings,
): Promise<void> => {
  let payload: Notifications.Payload | undefined;
  if (data.eventType) {
    switch (data.eventType) {
      case Models.EventType.Download:
        payload = await Payloads.download(data, profile);
        break;
      case Models.EventType.Grab:
        payload = await Payloads.grab(data, profile);
        break;
      case Models.EventType.Rename:
        payload = await Payloads.rename(data, profile);
        break;
      case Models.EventType.Retag:
        payload = await Payloads.retag(data, profile);
        break;
      case Models.EventType.Test:
        payload = await Payloads.test(data, profile);
        break;
      default:
        Logger.warn('-> An unknown eventType was received:', JSON.stringify(data));
        break;
    }
  }
  if (payload) await Firebase.sendNotification(devices, payload, settings);
};
