import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PORT || '5173', 10);

async function main() {
  const server = await createServer({
    root: __dirname,
    server: { port, host: true },
  });
  await server.listen();
  server.printUrls();
}

main();
