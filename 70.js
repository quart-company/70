const MATCH_ALL = Symbol('match_all');

const respond = (stream, value, statusCode) => {
  const end = (_headers, chunk) => {
    // Assign statusCode
    if (statusCode) stream.statusCode = statusCode;
    // Merge headers
    const headers = Object.assign(_headers, (value.length)?{ 'Content-Length': value.length }:{});
    for (const key in headers) {
      if (!stream.getHeader(key)) stream.setHeader(key, headers[key]);
    }

    stream.end(chunk);
  };
  // Check and create response type
  if (!value) return;
  else if (typeof value === 'string') {
    // Plain Text response
    end({ 'Content-Type': 'text/plain' }, value);
  } else if (typeof value === 'object' && !(value instanceof Error)) {
    // Non-Error Object as response
    end({ 'Content-Type': 'application/json' }, JSON.stringify(value));
  } else if (value instanceof Error) {
    respond(stream, { error: value.message }, value.code);
  } else {
    // Bad return value
    end({ 'Content-Type': 'text/plain' }, "Internal Server Error", 500);
  }
};

const getBody = async ({ stream }, body = '') => new Promise((resolve, reject) => {
  stream.on('data', (chunk) => body += chunk);
  stream.on('end', () => resolve(body));
  stream.on('error', reject);
});

module.exports = {
  handle: ({ routes, maxRouteRecursions, onError }) => {
    const routeMap = (routes instanceof Map)?routes:new Map(Object.entries(routes));

    const findRoute = (url, i) => {
      // Limit max recursions
      if (i > (maxRouteRecursions || 50)) return;
      if (url === "") return routeMap.get(MATCH_ALL);
      // Support keys without / at the beginning
      if ((url[0] === '/') && routeMap.has(url.substring(1))) return routeMap.get(url.substring(1)); 
      // Find URL or recurse
      return (routeMap.has(url))?routeMap.get(url):findRoute(url.substring(0, url.lastIndexOf('/')), i++);
    };
  
    return async (stream, res) => {
      const route = findRoute(stream.url, 0, maxRouteRecursions);
      if (!route) return respond(res || stream, "Not Found", 404);
  
      const { method, url, headers, query } = stream;
      const { setHeader, removeHeader, getHeader } = res || stream;
      const context = { method, url, headers, query, setHeader, removeHeader, getHeader, stream };
  
      try {
        respond(res || stream, await route(context));
      } catch (error) {
        if (typeof onError === 'function') onError(error);
        respond(res || stream, "Internal Server Error", 500);
      }
    }
  },
  text: async (context) => getBody(context),
  json: async (context) => JSON.parse(await getBody(context)),
  MATCH_ALL
}; // 70
