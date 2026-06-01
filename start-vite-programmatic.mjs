import { createServer } from "vite";

const host = "127.0.0.1";
const port = 5173;

const server = await createServer({
  server: {
    host,
    port,
    strictPort: true,
  },
});

const keepAlive = setInterval(() => {}, 1 << 30);

const closeServer = async () => {
  clearInterval(keepAlive);
  await server.close();
  process.exit(0);
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);

await server.listen();
server.printUrls();
