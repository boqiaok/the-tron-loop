import type { Metadata } from "next";

import { DiscoveryWorkspace } from "@/components/discovery/discovery-workspace";

export const metadata: Metadata = { title: "Plan my day" };

export default function PlanPage() {
  return <DiscoveryWorkspace />;
}
