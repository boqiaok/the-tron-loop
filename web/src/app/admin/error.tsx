"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Alert variant="destructive" className="p-5">
        <AlertCircle />
        <AlertTitle>Could not load the administration area</AlertTitle>
        <AlertDescription>
          Make sure the local API is running, then try again.
        </AlertDescription>
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
