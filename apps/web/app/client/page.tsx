import { Suspense } from "react";
import { Portal } from "../../src/features/portal";
export default function Page() {
  return (
    <Suspense>
      <Portal operator={false} />
    </Suspense>
  );
}
