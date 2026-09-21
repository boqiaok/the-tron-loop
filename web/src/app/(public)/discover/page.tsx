import type { Metadata } from "next";
import { DiscoveryWorkspace } from "@/components/discovery/discovery-workspace";

export const metadata: Metadata = { title: "Find activities for you" };

export default function DiscoverPage() {
  return <DiscoveryWorkspace />;
}
