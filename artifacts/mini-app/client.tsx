import React from "react";
import { LiveEditor, LiveError, LivePreview, LiveProvider } from "react-live";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { CopyIcon, PlayIcon, RedoIcon, UndoIcon } from "@/components/icons";

type Metadata = {
  isPreview: boolean;
};

export const miniAppArtifact = new Artifact<"mini-app", Metadata>({
  kind: "mini-app",
  description:
    "Useful for creating interactive React mini-applications with live preview",
  initialize: ({ setMetadata }) => {
    setMetadata({
      isPreview: false,
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
    if (metadata?.isPreview) {
      return (
        <div className="h-full overflow-hidden rounded-lg border border-gray-200 bg-white">
          <LiveProvider
            code={content}
            noInline={true}
            scope={{
              React,
              useState: React.useState,
              useEffect: React.useEffect,
              useCallback: React.useCallback,
              useMemo: React.useMemo,
              useRef: React.useRef,
              useContext: React.useContext,
              createContext: React.createContext,
            }}
          >
            <div className="grid h-full grid-cols-2">
              <div className="border-gray-200 border-r p-4">
                <div className="mb-2 font-medium text-gray-700 text-sm">
                  Code Editor
                </div>
                <LiveEditor className="h-[calc(100%-2rem)] rounded font-mono text-sm" />
              </div>
              <div className="p-4">
                <div className="mb-2 font-medium text-gray-700 text-sm">
                  Live Preview
                </div>
                <div className="min-h-[200px] rounded border border-gray-200 bg-white p-4">
                  <LivePreview />
                </div>
              </div>
            </div>
            <LiveError className="whitespace-pre-wrap border-red-200 border-t bg-red-50 p-3 font-mono text-red-700 text-xs" />
          </LiveProvider>
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
      label: "Preview",
      description: "Show live preview",
      onClick: ({ setMetadata, metadata }) => {
        setMetadata({
          ...metadata,
          isPreview: !metadata.isPreview,
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
      description: "Copy code to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [],
});
