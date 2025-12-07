import { describe, it, expect, beforeEach, vi } from "vitest";
import { listSeries, buildImageUrl, API_BASE_URL } from "./api";

// Simple mock for global fetch.
// No fancy typing, keeps TypeScript happy.
const mockFetch = vi.fn();

(globalThis as any).fetch = mockFetch as any;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("listSeries", () => {
  it("calls the correct URL and returns parsed JSON", async () => {
    const payload = {
      series: [],
      next_page_token: null,
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await listSeries({ pageSize: 25, titleSearch: "X-Men" });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const call = mockFetch.mock.calls[0];
    const urlArg = String(call[0]);

    expect(urlArg).toContain("/v1/series");
    expect(urlArg).toContain("page_size=25");
    expect(urlArg).toContain("title_search=X-Men");

    expect(result).toEqual(payload);
  });
});

describe("buildImageUrl", () => {
  it("returns empty string for null or empty", () => {
    expect(buildImageUrl(null)).toBe("");
    expect(buildImageUrl("")).toBe("");
    expect(buildImageUrl("   ")).toBe("");
  });

  it("passes through full URLs", () => {
    const httpUrl = "https://example.com/foo.png";
    const dataUrl = "data:image/png;base64,xyz";

    expect(buildImageUrl(httpUrl)).toBe(httpUrl);
    expect(buildImageUrl(dataUrl)).toBe(dataUrl);
  });

  it("handles /collection_images/ path", () => {
    const path = "/collection_images/1963/issue_1_A/front.jpg";
    const url = buildImageUrl(path);

    expect(url).toContain("/collection_images/1963/issue_1_A/front.jpg");
    expect(url.startsWith(API_BASE_URL)).toBe(true);
  });

  it("handles collection_images/ without leading slash", () => {
    const path = "collection_images/1963/issue_1_A/front.jpg";
    const url = buildImageUrl(path);

    expect(url).toContain("/collection_images/1963/issue_1_A/front.jpg");
    expect(url.startsWith(API_BASE_URL)).toBe(true);
  });

  it("handles bare relative DB-style path", () => {
    const path = "1963/issue_1_A/front.jpg";
    const url = buildImageUrl(path);

    expect(url).toContain("/collection_images/1963/issue_1_A/front.jpg");
    expect(url.startsWith(API_BASE_URL)).toBe(true);
  });
});
