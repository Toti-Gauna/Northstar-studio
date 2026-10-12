import { Suspense } from "react";
import { ServiceDetail } from "../../src/features/public";
export default function Page() {
  return (
    <Suspense>
      <ServiceDetail />
    </Suspense>
  );
}
