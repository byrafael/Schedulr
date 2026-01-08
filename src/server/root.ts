import { createTRPCRouter } from "./trpc";
import { schedulerRouter } from "./routers/scheduler";

/**
 * Root tRPC router
 * Add all sub-routers here
 */
export const appRouter = createTRPCRouter({
  scheduler: schedulerRouter,
});

export type AppRouter = typeof appRouter;
