const http2 = require('http2');
const { handle } = require('../../70');
const createCert = require('create-cert');

(async () => {
  const server = http2.createSecureServer(await createCert());
  
  server.on('stream', handle({
    routes: {
      '/': (stream) => ({ query: stream.query })
    },
    protocol: 'http/2'
  }));
  
  server.listen(9080);
})();