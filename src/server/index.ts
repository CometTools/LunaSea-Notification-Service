import express from 'express';
import { Logger, ELogger } from '@lunasea-notification-relay/core/logger';
import { router } from '@lunasea-notification-relay/server/v1';

export namespace Server {
    const PORT = process.env.PORT || '9000';
    const server = express();

    /**
     * Initialize the Express server.
     *
     * Does things like set CORS, set JSON limits, adds global middleware, etc.
     */
    export const initialize = (): void => {
        server.use(express.json());
        server.use('/v1', router);
    };

    /**
     * Start the express server on the the environment PORT value, or 9000.
     */
    export const start = (): void => {
        initialize();
        server.listen(PORT).on('error', (error) => {
            ELogger.error(error);
            process.exit(1);
        });
        Logger.info('Server Running / Port', PORT);
    };

    /**
     * Simple interface to structure all responses to hooks
     */
    export interface Response {
        message: string;
    }
}
