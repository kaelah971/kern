import { createAppRequestHandler } from '../src/app/server.ts';

/**
 * Vercel entry point. The existing node:http handler runs as the function
 * request listener; this file never calls server.listen().
 */
export default createAppRequestHandler({ publicMode: true });
