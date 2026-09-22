import { test, expect, type Page } from "@playwright/test";

// The single most important thing in this suite.
//
// The demo's sign-in details ship inside the browser bundle on purpose, so anyone can sign in as it
// and call these endpoints directly with a script. Hiding a button in the UI therefore proves
// nothing at all — what protects the budget is the SERVER refusing. That refusal is what is
// asserted here, because if it ever silently stops working the first sign would be a bill.

async function demoAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    // Supabase keeps the session in localStorage under a key it owns, and depending on version the
    // value is either plain JSON or base64-wrapped. Handle both rather than guess.
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith("sb-") && k.includes("auth-token"),
    );
    if (!key) return null;
    let raw = localStorage.getItem(key);
    if (!raw) return null;
    if (raw.startsWith("base64-")) {
      try {
        raw = atob(raw.slice("base64-".length));
      } catch {
        return null;
      }
    }
    try {
      return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
    } catch {
      return null;
    }
  });
}

test.describe("the demo account cannot spend money", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: /view the demo/i }).click();
    await expect(page.getByText(/sample briefs/i)).toBeVisible();
  });

  for (const endpoint of ["/api/generate", "/api/podcast"]) {
    test(`${endpoint} refuses the demo, signed in`, async ({ page }) => {
      const token = await demoAccessToken(page);
      expect(token, "signed in as the demo but found no access token").toBeTruthy();

      const result = await page.evaluate(
        async ({ url, jwt }) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${jwt}` },
            // A throwaway id: /api/podcast validates the field before it checks the account, and
            // this test is about the account check, not the validation.
            body: JSON.stringify({ reportId: "00000000-0000-0000-0000-000000000000" }),
          });
          return { status: res.status, body: await res.text() };
        },
        { url: endpoint, jwt: token as string },
      );

      expect(result.status, `expected a refusal, got ${result.body}`).toBe(403);
      expect(result.body).toMatch(/demo/i);
    });
  }
});

test.describe("paid endpoints are closed to strangers", () => {
  // This one was genuinely open to the internet at one point: anyone who found the address could
  // run up the Anthropic and Perplexity bills in a loop. It must stay shut.
  test("suggest-subtopics rejects an anonymous caller", async ({ request }) => {
    const res = await request.post("/api/suggest-subtopics", {
      data: { genre: "Technology" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  for (const endpoint of ["/api/generate", "/api/podcast"]) {
    test(`${endpoint} rejects an anonymous caller`, async ({ request }) => {
      const res = await request.post(endpoint, {
        data: { reportId: "00000000-0000-0000-0000-000000000000" },
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(401);
    });
  }
});
