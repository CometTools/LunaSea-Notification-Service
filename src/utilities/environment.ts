import { Logger } from './logger';

export namespace Environment {
  /**
   * Validate that all required environment values are found.
   *
   * If a value is not found, it will exit the application.
   */
  export const validate = (): void => {
    Logger.debug('Loading environment...');
    if (!process.env.FIREBASE_DATABASE_URL) shutdown('FIREBASE_DATABASE_URL');
    Logger.debug('-> FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL);
    if (!process.env.FANART_TV_API_KEY) shutdown('FANART_TV_API_KEY');
    Logger.debug('-> FANART_TV_API_KEY:', process.env.FANART_TV_API_KEY);
    if (!process.env.THEMOVIEDB_API_KEY) shutdown('THEMOVIEDB_API_KEY');
    Logger.debug('-> THEMOVIEDB_API_KEY:', process.env.THEMOVIEDB_API_KEY);
    Logger.debug('Loaded environment.');
  };

  /**
   * Shutdown application with a log showing which variable is missing from the environment.
   *
   * @param variable Environmental variable to print as missing
   */
  const shutdown = (variable: string): void => {
    Logger.fatal(`Unable to find ${variable} environment value. Exiting...`);
    process.exit(1);
  };
}
