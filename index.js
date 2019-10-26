const Koa = require('koa');
const Router = require('koa-better-router');
const logger = require('koa-logger');
const cors = require('koa2-cors');
const body = require('koa-better-body');
const send = require('koa-send');

const env = (process.env.NODE_ENV || 'development').toLowerCase();

const router = Router().loadMethods();

router.post('/sign-in', function (ctx, next) {
  const {user, password} = ctx.request.fields || {};
  if (user !== 'user' || password !== 'password') {
    ctx.status = 400;
    ctx.body = {
      error: {code: 1, message: "'user' and/or 'password' incorrect"}
    };
    return;
  }

  ctx.cookies.set('cookie1of3', '12154huhuhhihi', {
    httpOnly: false
  });
  ctx.cookies.set('cookie2of3', 'jhjkhkhkhkgyuf', {
    httpOnly: false,
    domain: '.different-domain.com',
    path: '/different-path',
    maxAge: 7 * 24 * 60 * 60
  });
  ctx.cookies.set('cookie3of3', 'huhuihihjuhyvft', {
    httpOnly: true
  });
  ctx.body = {
    access_token: '12154huhuhhihi'
  };
});

const app = new Koa();
app.proxy = true;
app.use(logger());
if (env === 'development') {
  app.use(cors({origin: '*', credentials: false})); // NOTE: credentials is removed, when origin is '*'
}

app.use(body());
app.use(router.middleware());
app.use(function (ctx, next) {
  if (!ctx.path.startsWith('/public'))
    return;

  const filepath = ctx.path.replace('/public', '');
  return send(ctx, filepath, { root: __dirname + '/public' }).catch((er) => {
    /* istanbul ignore else */
    if (er.code === 'ENOENT' && er.status === 404) {
      ctx.status = 404;
      ctx.body = 'Not Found';
    }
  })
});

let server = null;

async function start() {
  try {
    server = app.listen(3001, '0.0.0.0', () => {
      console.log(`Listening on 0.0.0.0:3001.`);
    });
  } catch (err) {
    console.log(err);
    await stopEverything(false);
  }
}

async function stopHttpServer() {
  return new Promise(function (resolve) {
    if (server) {
      server.once('close', err => {
        server = null;
        resolve(true);
      });
      server.close();
    } else {
      resolve(false);
    }
  })
}

async function stopEverything(isGracefulStopping) {
  try {
    console.log('Stopping everything...');

    await stopHttpServer();

    console.log('Exiting.');
  } catch (err) {
    console.error('Error occurred while stopping everything:', err);
    isGracefulStopping = false;
  }
  process.exit(isGracefulStopping ? 0 : 1);
}

async function processStopSignal() {
  console.log('Received stop-signal.');
  await stopEverything(true);
}

process.on('SIGINT', processStopSignal).on('SIGTERM', processStopSignal);

start().catch(err => {
  console.log(err);
});