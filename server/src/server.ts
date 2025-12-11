import { createApp } from './app';
import { getConfig } from './config';

const { port } = getConfig();
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
