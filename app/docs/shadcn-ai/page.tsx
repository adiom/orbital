import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ShadcnAIPage() {
  const aiComponents = [
    {
      name: "Actions",
      description: "Action buttons container for AI interactions",
      category: "Interaction",
      subcomponents: ["Action"],
    },
    {
      name: "Branch",
      description:
        "Conversation branching system for exploring different response paths",
      category: "Conversation",
      subcomponents: [
        "BranchMessages",
        "BranchSelector",
        "BranchPrevious",
        "BranchNext",
        "BranchPage",
      ],
    },
    {
      name: "CodeBlock",
      description: "Syntax-highlighted code block with copy functionality",
      category: "Content",
      subcomponents: ["CodeBlockCopyButton"],
    },
    {
      name: "Conversation",
      description: "Main conversation container with auto-scroll functionality",
      category: "Conversation",
      subcomponents: ["ConversationContent", "ConversationScrollButton"],
    },
    {
      name: "Image",
      description: "Display AI-generated images from base64 or uint8Array",
      category: "Content",
      subcomponents: [],
    },
    {
      name: "InlineCitation",
      description: "Inline citation system with hover cards and carousel",
      category: "Content",
      subcomponents: [
        "InlineCitationText",
        "InlineCitationCard",
        "InlineCitationCardTrigger",
        "InlineCitationCardBody",
        "InlineCitationCarousel",
        "InlineCitationCarouselContent",
        "InlineCitationCarouselItem",
        "InlineCitationCarouselHeader",
        "InlineCitationCarouselIndex",
        "InlineCitationCarouselPrev",
        "InlineCitationCarouselNext",
        "InlineCitationSource",
        "InlineCitationQuote",
      ],
    },
    {
      name: "Loader",
      description: "Loading spinner for AI operations",
      category: "UI",
      subcomponents: [],
    },
    {
      name: "Message",
      description:
        "Message component for displaying user and assistant messages",
      category: "Conversation",
      subcomponents: ["MessageContent", "MessageAvatar"],
    },
    {
      name: "PromptInput",
      description: "Input component for user prompts with model selection",
      category: "Input",
      subcomponents: [
        "PromptInputTextarea",
        "PromptInputToolbar",
        "PromptInputTools",
        "PromptInputButton",
        "PromptInputSubmit",
        "PromptInputModelSelect",
        "PromptInputModelSelectTrigger",
        "PromptInputModelSelectContent",
        "PromptInputModelSelectItem",
        "PromptInputModelSelectValue",
      ],
    },
    {
      name: "Reasoning",
      description: "Collapsible reasoning display for AI thinking process",
      category: "Content",
      subcomponents: ["ReasoningTrigger", "ReasoningContent"],
    },
    {
      name: "Response",
      description:
        "Markdown renderer for AI responses with math and code support",
      category: "Content",
      subcomponents: [],
    },
    {
      name: "Source",
      description: "Source citation display with collapsible list",
      category: "Content",
      subcomponents: ["Sources", "SourcesTrigger", "SourcesContent"],
    },
    {
      name: "Suggestion",
      description: "Suggested prompts or actions for users",
      category: "Interaction",
      subcomponents: ["Suggestions"],
    },
    {
      name: "Task",
      description: "Task display component for AI operations",
      category: "Content",
      subcomponents: ["TaskItem", "TaskItemFile", "TaskTrigger", "TaskContent"],
    },
    {
      name: "Tool",
      description: "Tool execution display with input/output and status",
      category: "Content",
      subcomponents: ["ToolHeader", "ToolContent", "ToolInput", "ToolOutput"],
    },
    {
      name: "WebPreview",
      description: "Web preview component with navigation and console",
      category: "Content",
      subcomponents: [
        "WebPreviewNavigation",
        "WebPreviewNavigationButton",
        "WebPreviewUrl",
        "WebPreviewBody",
        "WebPreviewConsole",
      ],
    },
  ];

  const categories = Array.from(
    new Set(aiComponents.map((comp) => comp.category))
  );

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-4xl">
          shadcn/ui Conversational AI Components
        </h1>
        <p className="text-lg text-muted-foreground">
          Complete list of all conversational AI components available from
          shadcn/ui
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Badge className="text-sm" variant="secondary">
          {aiComponents.length} Components
        </Badge>
        <Badge className="text-sm" variant="outline">
          {categories.length} Categories
        </Badge>
      </div>

      <Separator className="mb-8" />

      <div className="space-y-8">
        {categories.map((category) => {
          const categoryComponents = aiComponents.filter(
            (comp) => comp.category === category
          );

          return (
            <div key={category}>
              <h2 className="mb-4 font-semibold text-2xl">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryComponents.map((component) => (
                  <Card key={component.name}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {component.name}
                        </CardTitle>
                        {component.subcomponents.length > 0 && (
                          <Badge className="text-xs" variant="outline">
                            {component.subcomponents.length} sub
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{component.description}</CardDescription>
                    </CardHeader>
                    {component.subcomponents.length > 0 && (
                      <CardContent>
                        <div className="space-y-2">
                          <p className="font-medium text-muted-foreground text-xs">
                            Subcomponents:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {component.subcomponents.map((sub) => (
                              <Badge
                                className="text-xs"
                                key={sub}
                                variant="secondary"
                              >
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Separator className="my-8" />

      <div className="rounded-lg bg-muted p-6">
        <h3 className="mb-4 font-semibold text-xl">Installation</h3>
        <p className="mb-4 text-sm">
          To use these components, install the shadcn/ui AI component:
        </p>
        <div className="rounded-md bg-background p-4 font-mono text-sm">
          <code>npx shadcn@latest add ai</code>
        </div>
        <p className="mt-4 text-muted-foreground text-sm">
          This will install all the conversational AI components listed above.
        </p>
      </div>
    </div>
  );
}
