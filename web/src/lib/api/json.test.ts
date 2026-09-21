import { describe, expect, it } from "vitest";

import { decodeEntities, readJson } from "./json";

describe("decodeEntities", () => {
  it("decodes named and numeric entities and leaves plain text alone", () => {
    expect(decodeEntities("It&rsquo;s &amp; &#8211; &#x2014; ok")).toBe("It’s & – — ok");
    expect(decodeEntities("Fish & chips")).toBe("Fish & chips");
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });

  it("decodes every string in a JSON response", async () => {
    const response = new Response(JSON.stringify({ items: [{ title: "Rock &amp; Roll" }] }));
    await expect(readJson(response)).resolves.toEqual({ items: [{ title: "Rock & Roll" }] });
  });
});
