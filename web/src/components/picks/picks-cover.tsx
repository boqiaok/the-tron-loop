import type { CoverRow } from "@/lib/picks/cover-rows";

/**
 * The share cover for a week's picks, drawn by next/og: flex layout and
 * inline styles only. Colours match the site's tokens in globals.css.
 */

export const COVER_WIDTH = 1080;
export const COVER_HEIGHT = 1440;

const INK = "#16181c";
const BODY = "#54585f";
const META = "#6b6f76";
const LINE = "#e1dfd8";
const ACTION = "#2d5bff";
const ACCENT_INK = "#1c3fbf";

export function PicksCover({
  rangeLabel,
  rows,
  more,
}: {
  /** "16–22 Nov". */
  rangeLabel: string;
  rows: CoverRow[];
  more: number;
}) {
  return (
    <div
      style={{
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        display: "flex",
        flexDirection: "column",
        padding: "64px 72px 56px",
        background: "#f6f5f2",
        color: INK,
        fontFamily: "Outfit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>whatson</span>
        <span style={{ fontSize: 26, color: BODY }}>Hamilton, NZ</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 28,
          paddingBottom: 20,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 64, fontWeight: 600, letterSpacing: -2 }}>
          <span>This week’s</span>
          <span
            style={{
              marginLeft: 16,
              fontFamily: "Newsreader",
              fontStyle: "italic",
              fontWeight: 400,
              letterSpacing: 0,
              color: ACTION,
            }}
          >
            picks
          </span>
        </div>
        <span style={{ fontSize: 30, fontWeight: 600, color: "#3c4046" }}>{rangeLabel}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {rows.map((row) => (
          <div
            key={row.position}
            style={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              maxHeight: 190,
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <span
              style={{
                width: 64,
                flexShrink: 0,
                fontFamily: "Newsreader",
                fontStyle: "italic",
                fontSize: 52,
                color: ACTION,
              }}
            >
              {row.position}
            </span>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, paddingRight: 20 }}>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  letterSpacing: -0.5,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {row.title}
              </span>
              {row.kind ? (
                <span style={{ marginTop: 4, fontSize: 27, color: ACCENT_INK }}>{row.kind}</span>
              ) : null}
              <span
                style={{
                  marginTop: 4,
                  fontSize: 25,
                  color: BODY,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {row.details}
              </span>
            </div>
            {row.cost ? (
              <span
                style={{
                  flexShrink: 0,
                  padding: "8px 18px",
                  borderRadius: 999,
                  fontSize: 24,
                  fontWeight: 600,
                  background: row.cost.free ? "#e3f4eb" : "#ffffff",
                  color: row.cost.free ? "#0f5f3e" : "#3c4046",
                }}
              >
                {row.cost.label}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          fontSize: 27,
        }}
      >
        <div style={{ display: "flex" }}>
          <span>Details at&nbsp;</span>
          <span style={{ fontWeight: 600 }}>whson.com/picks</span>
        </div>
        {more ? (
          <span style={{ color: META }}>
            +{more} more {more === 1 ? "pick" : "picks"} on the site
          </span>
        ) : null}
      </div>
    </div>
  );
}
