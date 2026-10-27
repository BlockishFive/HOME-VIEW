import { PrivateWorkspace } from "@/components/PrivateWorkspace";
export const metadata = {
  title: "Área privada",
  robots: { index: false, follow: false },
};
export default function PrivatePage() {
  return <PrivateWorkspace />;
}
