<img src="https://github.com/quart-search/70/raw/master/Logo.png" width="140">

------

### Your next web service powered only by 70 lines of goodness.

------
70 serves web services and APIs, 70 has no dependencies, 70 has the essentials and all in 70 lines.

## Features
- Supports HTTP (HTTPS) and HTTP/2
- Async/await response handling
- Simple Router
- Body parser
- Query parser

## Getting Started
Install from npm:
```
npm install 70 --save
```

Create a set of routes with `http` or `https` server and configure as needed:
```javascript
const http = require('http');
const { handle } = require('70');

const routes = {
  '/': () => ({ message: "Welcome to 70!" })
};

http.createServer(handle({ routes })).listen(8080);
```

Parse request body and send a response:
```javascript
const http = require('http');
const { handle, json } = require('70');

const routes = {
  '/endpoint': async (stream) => {
    const body = await json(stream);
    return { success: true, body };
  }
};

http.createServer(handle({ routes })).listen(8080);
```

## License
[MIT](./LICENSE)
