import { ensureApiReachable } from "./api-precheck.js";

export const mochaHooks = {
  async beforeAll() {
    await ensureApiReachable();
  },
};
