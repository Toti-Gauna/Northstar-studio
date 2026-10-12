"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { PortalFrame } from "../components/layout";
import { Loading } from "../components/ui";
const loading = () => <Loading />;
const RequestList = dynamic(
  () => import("./request-list").then((m) => m.RequestList),
  { loading },
);
const RequestDetail = dynamic(
  () => import("./requests").then((m) => m.RequestDetail),
  { loading },
);
const ProjectList = dynamic(
  () => import("./projects").then((m) => m.ProjectList),
  { loading },
);
const ProjectDetail = dynamic(
  () => import("./projects").then((m) => m.ProjectDetail),
  { loading },
);
const ContentStudio = dynamic(
  () => import("./content").then((m) => m.ContentStudio),
  { loading },
);
const Settings = dynamic(() => import("./settings").then((m) => m.Settings), {
  loading,
});
const WorkspaceFeed = dynamic(
  () => import("./workspace").then((m) => m.WorkspaceFeed),
  { loading },
);
const Analytics = dynamic(
  () => import("./workspace").then((m) => m.Analytics),
  { loading },
);
export function Portal({ operator }: { operator: boolean }) {
  const params = useSearchParams(),
    view = params.get("view") || (operator ? "inbox" : "requests"),
    id = params.get("id") || "";
  return (
    <PortalFrame operator={operator} view={view}>
      {view === "request" && id ? (
        <RequestDetail id={id} operator={operator} />
      ) : view === "project" && id ? (
        <ProjectDetail id={id} operator={operator} />
      ) : view === "projects" ? (
        <ProjectList operator={operator} />
      ) : view === "content" && operator ? (
        <ContentStudio />
      ) : view === "settings" && operator ? (
        <Settings />
      ) : view === "analytics" && operator ? (
        <Analytics />
      ) : ["notifications", "outbox", "activity"].includes(view) &&
        !(view === "outbox" && !operator) ? (
        <WorkspaceFeed
          key={view}
          kind={view as "notifications" | "outbox" | "activity"}
          operator={operator}
        />
      ) : (
        <RequestList operator={operator} />
      )}
    </PortalFrame>
  );
}
