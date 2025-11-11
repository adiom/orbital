import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/icons";

type Metadata = {
  chartType: "line" | "bar" | "pie" | "area";
};

export const chartArtifact = new Artifact<"chart", Metadata>({
  kind: "chart",
  description:
    "Useful for creating interactive charts and data visualizations using Chart.js or Recharts",
  initialize: ({ setMetadata }) => {
    setMetadata({
      chartType: "line",
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
  },
  content: ({ metadata }) => {
    // TODO: Implement chart rendering using Chart.js or Recharts
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 p-8">
        <svg
          className="mb-4 h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <p className="mb-2 font-semibold text-gray-700 text-lg">
          Chart Visualization
        </p>
        <p className="text-center text-gray-500 text-sm">
          Interactive chart rendering coming soon
        </p>
        <p className="mt-2 text-center text-gray-400 text-xs">
          Type: {metadata?.chartType || "line"}
        </p>
      </div>
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy chart data to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [],
});
