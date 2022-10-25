import type { Session } from 'express-session';
import type { WebAppRouter } from '../../../../src/index';

interface FakeSession extends Session {
  helloWorld?: string;
}

export default function route(router: WebAppRouter<FakeSession>) {
  router.get('/test', async (req, res) => {
    res.locals.session.helloWorld = req.query.value as string;
    await new Promise((accept) => { res.locals.session.save(accept); });
    res.json({ saved: true });
  });

  router.get('/fetch', (req, res) => {
    res.json({ hello: res.locals.session.helloWorld });
  });
}
