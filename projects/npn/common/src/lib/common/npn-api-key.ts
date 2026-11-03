import { NpnConfiguration } from './config';

/**
 * The header the services API reads an API key from.
 */
export const NPN_API_KEY_HEADER = 'x-api-key';

/**
 * The configured services API key, or undefined when none is usable.
 *
 * A production build replaces `__NPN_API_KEY__` with the NPN_API_KEY Amplify variable.
 * If that variable is missing the placeholder survives into the bundle, and sending it
 * would only look like a key; treating it as absent keeps the request as it was before
 * keys existed.
 */
export function npnApiKey(config: NpnConfiguration): string {
    const key = config ? config.npnApiKey : undefined;
    if (!key || /^__.*__$/.test(key)) {
        return undefined;
    }
    return key;
}
