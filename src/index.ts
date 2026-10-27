import {serve} from 'bun';
import index from './index.html';
import fonts from './fonts';

const server = serve({
  routes: {
    '/*': index,
    '/fonts/:file': (req) => {
      const file = fonts[req.params.file];
      return file
        ? new Response(Bun.file(file))
        : new Response('Not found', {status: 404});
    },
  },
  development: process.env.NODE_ENV !== 'production' && {
    hmr: true,
    console: true,
  },
});

console.log(`DateConvert running at ${server.url}`);
