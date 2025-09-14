import { SplitChat } from "@/components/custom/split-chat";
import { randomUUID } from "crypto";

export default async function Page() {
  const id = randomUUID();
  return <SplitChat key={id} id={id} initialMessages={[]} />;
}
