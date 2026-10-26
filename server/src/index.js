import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

try {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    console.log(`Pragati server listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down Pragati server.`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        process.exit(0);
      } catch {
        console.error("MongoDB disconnect failed during shutdown.");
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const safeMessage = message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]");
  console.error(`Unable to start Pragati server because MongoDB is unavailable: ${safeMessage}`);
  process.exitCode = 1;
}
