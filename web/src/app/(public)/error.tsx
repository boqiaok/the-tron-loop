"use client";

import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-5 sm:px-10">
      <Alert variant="destructive" className="py-5">
        <TriangleAlert />
        <AlertTitle>Activities could not be loaded</AlertTitle>
        <AlertDescription>
          <p>Check that the API server is running, then try again.</p>
          <Button className="mt-4" variant="outline" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
