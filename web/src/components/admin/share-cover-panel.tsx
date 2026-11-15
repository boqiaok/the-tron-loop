import { Download } from "lucide-react";

/**
 * The week's share cover for social posts, made from the published picks.
 * Unsaved edits are not in the image yet, so the download waits for them.
 */
export function ShareCoverPanel({
  weekStart,
  published,
  dirty,
}: {
  weekStart: string;
  published: boolean;
  dirty: boolean;
}) {
  const cover = `/picks/${weekStart}/cover.png`;

  return (
    <section
      aria-labelledby="share-cover-heading"
      className="flex flex-col gap-3 border-t pt-4"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id="share-cover-heading" className="text-sm font-semibold text-primary">
          Share cover
        </h3>
        <p className="text-xs text-muted-foreground">
          1080×1440 PNG for social posts, made from the published picks.
        </p>
      </div>

      {!published ? (
        <p className="text-sm text-muted-foreground">
          Publish the picks to make the cover.
        </p>
      ) : dirty ? (
        <p role="status" className="text-sm text-amber-800">
          Save your changes to update the cover.
        </p>
      ) : (
        <div className="flex items-end gap-3">
          {/* The cover is drawn on request and never cached, so it is current. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt="Share cover for this week's picks"
            width={120}
            height={160}
            className="rounded-md border bg-[#f6f5f2]"
          />
          <div className="flex flex-col gap-2">
            <a
              href={`${cover}?download=1`}
              download={`whatson-picks-${weekStart}.png`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:text-primary-foreground hover:no-underline"
            >
              <Download className="size-4" aria-hidden="true" />
              Download
            </a>
            <a href={cover} target="_blank" rel="noreferrer" className="text-xs">
              Open full size
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
