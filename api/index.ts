import { createApp } from "../dist/server.cjs";
import { normalizeIncomingRequestUrl } from "../src/server/normalizeIncomingRequestUrl.js";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  if (!normalizeIncomingRequestUrl(req)) {
    return res
      .status(400)
      .json({ status: "error", message: "URL de solicitud inválida." });
  }
  const app = await appPromise;
  return app(req, res);
}
