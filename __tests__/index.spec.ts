import path from 'path';
import { getReusableApp, request } from '@gasbuddy/service-tester';
import { useWebApp } from '../src/webapp';

test('Webs should serv', async () => {
  const app = await getReusableApp({
    service: useWebApp,
    rootDirectory: path.resolve(__dirname, 'fake-web'),
    codepath: 'src',
    name: 'fake-web',
  });

  expect(app).toBeTruthy();
  await request(app).get('/index.html').expect(200);
  await request(app).get('/non.html').expect(404);
  // No CSRF
  await request(app).post('/post').expect(400);

  const agent = request.agent(app);
  await agent.get('/test?value=abc123').expect(200, { saved: true });
  await agent.get('/fetch').expect(200, { hello: 'abc123' });
  // Has CSRF
  await agent
    .post('/post')
    .send({
      testcsrf: agent.jar.getCookie('testcsrf', {
        path: '/',
        domain: '',
        secure: false,
        script: false,
      })?.value,
    })
    .expect(204);
});
