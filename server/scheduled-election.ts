import type { Express, Request, Response } from "express";
import { updateHeartbeatJob } from "./_core/heartbeat";
import { sdk } from "./_core/sdk";
import { getElectionCollectionByInstagramTask, verifyInstagramChunkForCollection } from "./election-db";

export function registerElectionScheduledRoutes(app: Express) {
  app.post("/api/scheduled/election-instagram-verification", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const collection = await getElectionCollectionByInstagramTask(user.taskUid);
      if (!collection) return res.json({ ok: true, skipped: "orphan" });
      const result = await verifyInstagramChunkForCollection(collection.id, 64);
      if (result.complete) await updateHeartbeatJob(user.taskUid, { enable: false }, "");
      return res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido na verificação programada.";
      return res.status(500).json({ error: message, stack: error instanceof Error ? error.stack : undefined, context: { path: req.path }, timestamp: new Date().toISOString() });
    }
  });
}
