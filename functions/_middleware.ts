import { isIpBlocked, CFWorkerEnv } from './../src/functions';

const build403Response = (message = 'permission denied'): Response => {
  return new Response(
    JSON.stringify({
      status: {
        timestamp: new Date().toUTCString(),
        error_code: 403,
        error_message: message,
      },
    }),
    {
      status: 403,
      headers: {
        'content-type': 'application/json',
      },
    }
  );
};

const buildOptionsResponse = (request: Request): Response => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
};

export const onRequest: PagesFunction<CFWorkerEnv> = async ({
  request,
  env,
  next,
}) => {
  const isIpBlockedResponse = isIpBlocked(request, env);
  if (isIpBlockedResponse) {
    return isIpBlockedResponse;
  }

  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return buildOptionsResponse(request);
    }

    const origin = request.headers.get('origin');
    const authKey = request.headers.get('x-carbon-auth-key');
    if (authKey !== env.VITE_CARBON_API_KEY) {
      return build403Response();
    }

    if (
      origin !== null &&
      origin !== 'https://app.carbondefi.xyz' &&
      origin !== 'http://localhost:3000'
    ) {
      return build403Response();
    }

    const response = await next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, HEAD, POST, OPTIONS'
    );
    return response;
  }

  return next();
};
