import { ServiceRouter } from '@gasbuddy/service';

declare module 'express-session' {
  interface SessionData {
    helloWorld?: string;
  }
}

export default function route(router: ServiceRouter) {
  router.get('/test', async (req, res) => {
    req.session.helloWorld = req.query.value as string;
    await new Promise((accept) => { req.session.save(accept); });
    res.json({ saved: true });
  });

  router.get('/fetch', (req, res) => {
    res.json({ hello: req.session.helloWorld });
  });

  router.post('/post', (req, res) => {
    res.sendStatus(204);
  });
}
