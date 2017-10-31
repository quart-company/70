const { parse } = require('url');
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_TYPE } = require('http2').constants;

const respond = (stream, headers, statusCode = 200) =>
  (typeof stream.respond === 'function')
    ? stream.respond(Object.assign({ [HTTP2_HEADER_STATUS]: statusCode }, headers))
    : stream.writeHead(statusCode, headers);

const finish = (stream, value, statusCode) => {
  const end = (headers, chunk) => {
    if (stream.headersSent) return stream.end(chunk);
    if (value.length) headers['Content-Length'] = value.length;

    respond(stream, headers, statusCode);
    stream.end(chunk);
  };
  // Check and create response type
  if (!value) return;
  if (typeof value === 'object' && !(value instanceof Error)) {
    end({ 'Content-Type': 'application/json' }, JSON.stringify(value));
  } else if (value instanceof Error) {
    finish(stream, { error: value.message }, value.code);
  } else {
    end({ 'Content-Type': 'text/plain' }, value);
  }
};

const getBody = async ({ stream }, body = '') => new Promise((resolve, reject) => {
  stream.on('data', (chunk) => body += chunk);
  stream.on('end', () => resolve(body));
  stream.on('error', reject);
});

module.exports = {
  MATCH_ALL: Symbol('match_all'),
  method: (m, handle) => (ctx) => (((Array.isArray(m))?m:[m]).indexOf(ctx.method) >= 0)?handle(ctx):finish(ctx.response, "Not Found", 404),
  handle: ({ routes, maxRouteRecursions, onError }) => {
    const routeMap = (routes instanceof Map) ? routes : new Map(Object.entries(routes));

    const findRoute = (url, i) => {
      // Limit max recursions
      if (i > (maxRouteRecursions || 50)) return;
      if (url === "") return routeMap.get(this.MATCH_ALL);
      // Support keys without / at the beginning
      if ((url[0] === '/') && routeMap.has(url.substring(1))) return routeMap.get(url.substring(1));
      // Find URL or recurse
      return (routeMap.has(url)) ? routeMap.get(url) : findRoute(url.substring(0, url.lastIndexOf('/')), i++);
    };

    return async (stream, res) => {
      const headers = stream.headers || res;
      const response = (typeof stream.respond === 'function') ? stream : res;
      const { pathname, path, query } = parse(stream.url || headers[HTTP2_HEADER_PATH], true);
      const method = stream.method || headers[HTTP2_HEADER_METHOD];
      const route = findRoute(pathname, 0, maxRouteRecursions);
      if (!route) return finish(response, "Not Found", 404);

      const context = { method, url: path, query, headers, respond: (...args) => respond(stream, ...args), stream, response };

      try {
        finish(response, await route(context));
      } catch (error) {
        if (typeof onError === 'function') onError(error);
        finish(response, "Internal Server Error", 500);
      }
    }
  },
  text: async (context) => getBody(context),
  json: async (context) => JSON.parse(await getBody(context))
}; // 70
