import { auth } from "@/app/(auth)/auth";
import { NavbarClient } from "./navbar-client";

export const Navbar = async () => {
  const session = await auth();
  return <NavbarClient session={session} />;
};
