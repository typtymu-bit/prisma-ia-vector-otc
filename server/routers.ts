import { z } from "zod";
import { OTC_ASSETS } from "@shared/market";
import { COOKIE_NAME } from "@shared/const";
import { getMarketSnapshot } from "./broker";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  market: router({
    assets: publicProcedure.query(() => OTC_ASSETS),
    snapshot: publicProcedure
      .input(z.object({ activeId: z.number(), count: z.number().min(30).max(180).default(120) }))
      .query(({ input }) => getMarketSnapshot(input.activeId, input.count)),
    scan: publicProcedure
      .input(z.object({ activeIds: z.array(z.number()).min(1).max(12) }))
      .mutation(async ({ input }) => Promise.all(input.activeIds.map((assetId) => getMarketSnapshot(assetId, 80)))),
    recordDemo: publicProcedure
      .input(
        z.object({
          activeId: z.number(),
          direction: z.enum(["call", "put"]),
          amount: z.number().positive().max(10_000),
        }),
      )
      .mutation(({ input }) => ({
        success: true,
        mode: "demo" as const,
        ticket: `DEMO-${Date.now().toString(36).toUpperCase()}`,
        ...input,
        openedAt: Date.now(),
      })),
  }),
});

export type AppRouter = typeof appRouter;
