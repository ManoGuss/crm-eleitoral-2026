import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getPersonalOwnerUser } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // Este CRM opera como um espaço pessoal único. Sem uma sessão OAuth,
  // todas as operações usam o registro do proprietário configurado no ambiente.
  if (!user) user = (await getPersonalOwnerUser()) ?? null;

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
