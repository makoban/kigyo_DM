import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  // Not logged in → start onboarding (LP is on GitHub Pages)
  redirect("/onboarding/area");
}
