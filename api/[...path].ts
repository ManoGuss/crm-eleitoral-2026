import { createApp } from "../server/_core/app";

// A função catch-all preserva OAuth, tRPC, armazenamento e rotas agendadas
// quando o repositório é publicado na Vercel.
export default createApp();
