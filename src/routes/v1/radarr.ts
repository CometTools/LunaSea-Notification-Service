import { Server } from '../../server';
import { Middleware } from '../../server/middleware';
import { Constants } from '../../utilities/constants';
import { Firebase } from '../../utilities/firebase';
import { Logger } from '../../utilities/logger';
import { Webhooks } from '../../webhooks/radarr';
import express from 'express';

/**
 * Route namespace to contain all Radarr related routes and handlers.
 */
export namespace Route {
    export const router = express.Router();
    router.post('/user/:id', Middleware.validateUser, Middleware.checkNotificationPassword, Middleware.extractProfile, userHandler);
    router.post('/device/:id', Middleware.extractProfile, deviceHandler);

    /**
     * Radarr User Handler: Handles a webhook from Radarr, and sends a notification to all devices that are attached to the calling account.
     *
     * @param request Express request object
     * @param response Express response object
     */
    async function userHandler(request: express.Request, response: express.Response): Promise<void> {
        Logger.info('Running Radarr [user] webhook...');
        try {
            Logger.debug('-> Sending HTTP response to complete webhook...');
            response.status(200).json(<Server.Response>{ message: Constants.MSG_OK });
            Logger.debug('-> HTTP response sent (200 OK)');
            const devices: string[] = await Firebase.getDeviceTokenList(request.params.id);
            let title = 'Radarr';
            if (request.params.profile && request.params.profile !== 'default') title += ` (${request.params.profile})`;
            Logger.debug('->', devices?.length ?? 0, 'device(s) found');
            if ((devices?.length ?? 0) > 0) await Webhooks.execute(request.body, devices, title);
        } catch (error) {
            Logger.error(error.message);
            Logger.debug('-> Sending HTTP response to complete webhook...');
            response.status(500).json(<Server.Response>{ message: Constants.MSG_INTERNAL_SERVER_ERROR });
            Logger.debug('HTTP response sent (500 Internal Server Error)');
        }
        Logger.info('Finished Radarr [user] webhook.');
    }

    /**
     * Radarr Device Handler: Handles a webhook from Radarr [device ID], and sends a notification to the single device.
     *
     * @param request Express request object
     * @param response Express response object
     */
    async function deviceHandler(request: express.Request, response: express.Response): Promise<void> {
        Logger.info('Running Radarr [device] webhook...');
        try {
            Logger.debug('-> Sending HTTP response to complete webhook...');
            response.status(200).json(<Server.Response>{ message: Constants.MSG_OK });
            Logger.debug('-> HTTP response sent (200 OK)');
            const devices: string[] = [request.params.id];
            let title = 'Radarr';
            if (request.params.profile && request.params.profile !== 'default') title += ` (${request.params.profile})`;
            await Webhooks.execute(request.body, devices, title);
        } catch (error) {
            Logger.error(error.message);
            Logger.debug('Sending HTTP response to complete webhook...');
            response.status(500).json(<Server.Response>{ message: Constants.MSG_INTERNAL_SERVER_ERROR });
            Logger.debug('HTTP response sent (500 Internal Server Error)');
        }
        Logger.info('Finished Radarr [device] webhook.');
    }
}