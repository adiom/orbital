import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  CopyIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";

type Metadata = {
  isPlaying: boolean;
};

export const gameArtifact = new Artifact<"game", Metadata>({
  kind: "game",
  description:
    "Useful for creating interactive games and playable experiences",
  initialize: ({ setMetadata }) => {
    setMetadata({
      isPlaying: false,
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
  content: ({ content, metadata }) => {
    if (metadata?.isPlaying) {
      // TODO: Implement game runtime environment
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
          <PlayIcon size={48} />
          <p className="mb-2 font-semibold text-gray-700 text-lg">
            Game Runtime
          </p>
          <p className="text-center text-gray-500 text-sm">
            Interactive game environment coming soon
          </p>
        </div>
      );
    }

    return (
      <div className="h-full px-1">
        <pre className="h-full overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-gray-100 text-sm">
          {content}
        </pre>
      </div>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: "Play",
      description: "Start the game",
      onClick: ({ setMetadata, metadata }) => {
        setMetadata({
          ...metadata,
          isPlaying: !metadata.isPlaying,
        });
      },
    },
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
      description: "Copy game code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [],
});
