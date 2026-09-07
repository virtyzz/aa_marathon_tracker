import { z } from "zod";

// The game-account migration used MD5 IDs; accounts created later use CUIDs.
export const gameAccountIdSchema = z.union([
  z.string().cuid(),
  z.string().regex(/^[a-f0-9]{32}$/),
]);
