"use client";

import { Ban, LoaderCircle, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ConfirmDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  cancelAdminActivity,
  deleteAdminActivity,
  publishAdminActivity,
} from "@/lib/api/admin-activities";
import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/types/activity";

type ConfirmAction = "publish" | "cancel" | "delete";

export function ActivityRowActions({
  id,
  status,
  title,
}: {
  id: string;
  status: ActivityStatus;
  title: string;
}) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openConfirmation(action: ConfirmAction) {
    setConfirmAction(action);
    setError(null);
  }

  async function run(action: ConfirmAction) {
    setPendingAction(action);
    setError(null);

    try {
      if (action === "publish") await publishAdminActivity(id);
      if (action === "cancel") await cancelAdminActivity(id);
      if (action === "delete") await deleteAdminActivity(id);
      setConfirmAction(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  const busy = pendingAction !== null;
  const confirmation = confirmAction
    ? getConfirmationCopy(confirmAction, title)
    : null;

  return (
    <div className="flex min-w-40 flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/admin/activities/${id}/edit`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {status === "cancelled" ? "View" : "Edit"}
        </Link>

        {status === "draft" ? (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => openConfirmation("publish")}
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => openConfirmation("delete")}
            >
              Delete
            </Button>
          </>
        ) : null}

        {status === "published" ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => openConfirmation("cancel")}
          >
            Mark cancelled
          </Button>
        ) : null}
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirmAction(null);
            setError(null);
          }
        }}
      >
        {confirmation && confirmAction ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full",
                  confirmAction === "publish"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-destructive/10 text-destructive",
                )}
                aria-hidden="true"
              >
                {confirmAction === "publish" ? (
                  <Send className="size-5" />
                ) : confirmAction === "cancel" ? (
                  <Ban className="size-5" />
                ) : (
                  <Trash2 className="size-5" />
                )}
              </span>
              <AlertDialogTitle>{confirmation.heading}</AlertDialogTitle>
              <ConfirmDescription>
                {confirmation.description}
              </ConfirmDescription>
            </AlertDialogHeader>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                Keep activity
              </AlertDialogCancel>
              <Button
                size="lg"
                variant={confirmation.destructive ? "destructive" : "default"}
                disabled={busy}
                onClick={() => run(confirmAction)}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : null}
                {busy ? confirmation.pendingLabel : confirmation.confirmLabel}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}

function getConfirmationCopy(action: ConfirmAction, title: string) {
  if (action === "publish") {
    return {
      heading: "Publish this activity?",
      description: `“${title}” will immediately appear in the public weekly guide. You can still edit or cancel it later.`,
      confirmLabel: "Publish activity",
      pendingLabel: "Publishing…",
      destructive: false,
    };
  }

  if (action === "cancel") {
    return {
      heading: "Mark this activity as cancelled?",
      description: `“${title}” will be marked as cancelled on the public site and become read-only in administration.`,
      confirmLabel: "Mark as cancelled",
      pendingLabel: "Cancelling…",
      destructive: true,
    };
  }

  return {
    heading: "Delete this draft?",
    description: `“${title}” will be permanently deleted. This action cannot be undone.`,
    confirmLabel: "Delete draft",
    pendingLabel: "Deleting…",
    destructive: true,
  };
}
