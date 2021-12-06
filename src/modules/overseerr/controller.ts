import express from 'express';
import { Models, Payloads } from './';
import { Middleware, Models as ServerModels } from '../../server';
import { Firebase } from '../../services';
import { Constants, Logger, Notifications } from '../../utils';

export const enable = (api: express.Router) => api.use(route, router);

const router = express.Router();
const route = '/overseerr';

router.post(
  '/user/:id',
  Middleware.validateUser,
  Middleware.checkNotificationPassword,
  Middleware.pullUserTokens,
  handler,
);
router.post('/device/:id', Middleware.extractDeviceToken, handler);

/**
 * Overseerr Webhook Handler: Handles a webhook from Overseerr, and sends a notification to all devices that are in `response.locals.tokens`.
 *
 * @param request Express request object
 * @param response Express response object
 */
async function handler(request: express.Request, response: express.Response): Promise<void> {
  Logger.info('Running Overseerr webhook...');
  try {
    Logger.debug('-> Sending HTTP response to complete webhook...');
    response.status(200).json(<ServerModels.Response>{ message: Constants.MESSAGE.OK });
    Logger.debug('-> HTTP response sent (200 OK)');
    await _handleWebhook(
      request.body,
      response.locals.tokens,
      response.locals.profile,
      response.locals.notificationSettings,
    );
  } catch (error: any) {
    Logger.error(error.message);
    Logger.debug('-> Sending HTTP response to complete webhook...');
    response
      .status(500)
      .json(<ServerModels.Response>{ message: Constants.MESSAGE.INTERNAL_SERVER_ERROR });
    Logger.debug('HTTP response sent (500 Internal Server Error)');
  }
  Logger.info('Finished Overseerr webhook.');
}

/**
 * Given the request data body, execute the correct webhook handler for Overseerr.
 *
 * @private
 * @param data Webhook notification payload
 * @param devices List of devices to send the notification to
 * @param profile The profile name to attach to the title
 * @param settings Notification settings
 */
const _handleWebhook = async (
  data: Models.RequestProperties,
  devices: string[],
  profile: string,
  settings: Notifications.Settings,
): Promise<void> => {
  Logger.debug('-> Preparing payload...');
  let payload: Notifications.Payload | undefined;
  if (data.notification_type) {
    switch (data.notification_type) {
      case Models.NotificationType.MEDIA_APPROVED:
        Logger.info('-> Handling as "MEDIA_APPROVED" event type...');
        payload = await Payloads.mediaApproved(data, profile);
        break;
      case Models.NotificationType.MEDIA_AUTO_APPROVED:
        Logger.info('-> Handling as "MEDIA_AUTO_APPROVED" event type...');
        payload = await Payloads.mediaAutoApproved(data, profile);
        break;
      case Models.NotificationType.MEDIA_AVAILABLE:
        Logger.info('-> Handling as "MEDIA_AVAILABLE" event type...');
        payload = await Payloads.mediaAvailable(data, profile);
        break;
      case Models.NotificationType.MEDIA_DECLINED:
        Logger.info('-> Handling as "MEDIA_DECLINED" event type...');
        payload = await Payloads.mediaDeclined(data, profile);
        break;
      case Models.NotificationType.MEDIA_FAILED:
        Logger.info('-> Handling as "MEDIA_FAILED" event type...');
        payload = await Payloads.mediaFailed(data, profile);
        break;
      case Models.NotificationType.MEDIA_PENDING:
        Logger.info('-> Handling as "MEDIA_PENDING" event type...');
        payload = await Payloads.mediaPending(data, profile);
        break;
      case Models.NotificationType.TEST_NOTIFICATION:
        Logger.info('-> Handling as "TEST_NOTIFICATION" event type...');
        payload = await Payloads.test(data, profile);
        break;
      case Models.NotificationType.ISSUE_CREATED:
        Logger.info('-> Handling as "ISSUE_CREATED" event type...');
        payload = await Payloads.issueCreated(data, profile);
        break;
      case Models.NotificationType.ISSUE_RESOLVED:
        Logger.info('-> Handling as "ISSUE_RESOLVED" event type...');
        payload = await Payloads.issueResolved(data, profile);
        break;
      case Models.NotificationType.ISSUE_REOPENED:
        Logger.info('-> Handling as "ISSUE_REOPENED" event type...');
        payload = await Payloads.issueReopened(data, profile);
        break;
      case Models.NotificationType.ISSUE_COMMENT:
        Logger.info('-> Handling as "ISSUE_COMMENT" event type...');
        payload = await Payloads.issueCommented(data, profile);
        break;
      default:
        Logger.warn('-> An unknown notification_type was received:', JSON.stringify(data));
        break;
    }
  }
  if (payload) await Firebase.sendNotification(devices, payload, settings);
};
