import express from 'express';
import basicauth from 'basic-auth';
import { Models } from './';
import { Firebase } from '../services';
import { Constants, Logger, Notifications } from '../utils';

export async function startNewRequest(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  Logger.info(request.url);
  next();
}

export async function extractNotificationOptions(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const getSound = (sound: any): boolean => {
    return sound !== 'false';
  };

  const getInterruptionLevel = (level: any): Notifications.iOSInterruptionLevel => {
    const idx = Object.values(Notifications.iOSInterruptionLevel).indexOf(level) !== -1;
    if (idx) return level as Notifications.iOSInterruptionLevel;
    return Notifications.iOSInterruptionLevel.ACTIVE;
  };

  response.locals.notificationSettings = <Notifications.Settings>{
    sound: getSound(request.query.sound),
    ios: {
      interruptionLevel: getInterruptionLevel(request.query.interruption_level),
    },
  };

  Logger.debug(`-> Settings: ${JSON.stringify(response.locals.notificationSettings)}`);
  next();
}

export async function extractProfile(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  // Extract the username part from basic auth and set it as the profile
  const auth = basicauth(request);
  response.locals.profile = auth?.name ?? 'default';

  Logger.debug(`-> Profile: ${response.locals.profile}`);
  next();
}

export async function extractDeviceToken(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  if (request.params.id) {
    response.locals.tokens = [request.params.id];
    Logger.debug(`-> Device: ${request.params.id}`);
    next();
  } else {
    Logger.warn('-> A request with no device ID was attempted. Cancelling request...');
    response.status(400).json(<Models.Response>{ message: Constants.MESSAGE.NO_ID_SUPPLIED });
    Logger.debug('-> HTTP response sent (400 Bad Request)');
  }
}

export async function pullUserTokens(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const devices: string[] = await Firebase.getUserDevices(request.params.id);
  const deviceCount: number = devices?.length ?? 0;

  if (deviceCount > 0) {
    response.locals.tokens = devices;
    Logger.debug(`-> Device(s): ${deviceCount} Found`);
    next();
  } else {
    Logger.warn('-> Device(s): 0 Found. Cancelling request...');
    response.status(400).json(<Models.Response>{ message: Constants.MESSAGE.NO_DEVICES_FOUND });
    Logger.debug('-> HTTP response sent (400 Bad Request)');
  }
}

export async function checkNotificationPassword(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  // TODO
  next();
}

export async function validateUser(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  if (request.params.id && (await Firebase.hasUserID(request.params.id))) {
    Logger.debug(`-> User: ${request.params.id}`);
    next();
  } else {
    Logger.warn(`-> Failed to find user: ${request.params.id}. Cancelling request...`);
    response.status(404).json(<Models.Response>{ message: Constants.MESSAGE.USER_NOT_FOUND });
    Logger.debug('HTTP response sent (404 Not Found)');
  }
}
