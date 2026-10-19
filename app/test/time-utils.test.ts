import {
  setServerOffset,
  getServerNow,
  getTimeRemaining,
  formatTimeRemaining,
} from "../src/time-utils";

describe("time-utils", () => {
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  describe("formatTimeRemaining", () => {
    it("formats 1 day or more: X days Y hours left", () => {
      const remaining = 2 * MS_PER_DAY + 5 * MS_PER_HOUR;
      expect(formatTimeRemaining(remaining)).toBe("2 days 5 hours left");
    });

    it("formats under 1 day: X hours Y min left", () => {
      const remaining = 5 * MS_PER_HOUR + 12 * MS_PER_MINUTE;
      expect(formatTimeRemaining(remaining)).toBe("5 hours 12 min left");
    });

    it("formats under 1 hour: X min left", () => {
      const remaining = 12 * MS_PER_MINUTE;
      expect(formatTimeRemaining(remaining)).toBe("12 min left");
    });

    it("formats 0 or negative time as Expired", () => {
      expect(formatTimeRemaining(0)).toBe("Expired");
      expect(formatTimeRemaining(-5000)).toBe("Expired");
    });
  });

  describe("server time offset and remaining calculation", () => {
    it("adjusts serverNow correctly when local clock is ahead or behind", () => {
      const realLocal = Date.now();
      const serverNow = realLocal + 100000; // server is 100s ahead
      setServerOffset(serverNow);

      const computedServerNow = getServerNow();
      expect(computedServerNow).toBeGreaterThanOrEqual(serverNow);

      // Remaining time is against adjusted server time
      const expiry = computedServerNow + 60000;
      const remaining = getTimeRemaining(expiry);
      expect(remaining).toBeLessThanOrEqual(60000);
      expect(remaining).toBeGreaterThan(58000);
    });

    it("returns 0 if key is expired regardless of local clock", () => {
      const now = Date.now();
      setServerOffset(now);
      const pastExpiry = now - 50000;
      expect(getTimeRemaining(pastExpiry)).toBe(0);
    });
  });
});
