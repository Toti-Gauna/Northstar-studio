import { Suspense } from "react";
import { BriefPage } from "../../src/features/brief";
export default function Page() {
  return (
    <Suspense>
      <BriefPage />
    </Suspense>
  );
}
