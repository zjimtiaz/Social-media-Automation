import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Always redirect - auth check happens in middleware
  redirect("/login");
}
