import { describe, expect, it } from "vitest";

import {
  makeAdminActivityListHref,
  parseAdminActivityListQuery,
  toAdminActivityApiParams,
} from "./admin-list-query";

describe("parseAdminActivityListQuery", () => {
  it("defaults to upcoming activities, newest first", () => {
    expect(parseAdminActivityListQuery({})).toEqual({
      page: 1,
      status: undefined,
      source: undefined,
      q: undefined,
      timing: "upcoming",
      sort: "created-desc",
    });
  });

  it("ignores unknown values instead of failing the page", () => {
    const query = parseAdminActivityListQuery({
      status: "archived",
      timing: "someday",
      sort: "random",
      page: "-2",
      q: "   ",
    });
    expect(query).toMatchObject({
      page: 1,
      status: undefined,
      q: undefined,
      timing: "upcoming",
      sort: "created-desc",
    });
  });
});

describe("makeAdminActivityListHref", () => {
  const query = parseAdminActivityListQuery({
    status: "draft",
    source: "manual",
    q: "market",
    page: "3",
  });

  it("keeps the other filters and returns to the first page on change", () => {
    expect(makeAdminActivityListHref(query, { timing: "past" })).toBe(
      "/admin/activities?status=draft&source=manual&q=market&timing=past",
    );
  });

  it("can move between pages", () => {
    expect(makeAdminActivityListHref(query, { page: 4 })).toBe(
      "/admin/activities?status=draft&source=manual&q=market&page=4",
    );
  });

  it("omits defaults", () => {
    expect(makeAdminActivityListHref(parseAdminActivityListQuery({}))).toBe(
      "/admin/activities",
    );
  });
});

describe("toAdminActivityApiParams", () => {
  it("maps the combined sort and leaves out the all-dates filter", () => {
    const params = toAdminActivityApiParams(
      parseAdminActivityListQuery({ sort: "starts-asc", timing: "all" }),
      10,
    );
    expect(Object.fromEntries(params)).toEqual({
      page: "1",
      limit: "10",
      sortBy: "startsAt",
      order: "asc",
    });
  });
});
