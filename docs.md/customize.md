**1) Models and Providers**  
**Switch between different models and providers.**  
## **Chat SDK uses ++[AI SDK Gateway](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)++ as the default provider, which provides unified access to multiple AI models including xAI's Grok models. Since Chat SDK is powered by the ++[AI SDK](https://ai-sdk.dev/)++, which supports ++[multiple providers](https://ai-sdk.dev/providers/ai-sdk-providers)++ out of the box, you can always switch to a different provider of your choice, anytime.**  
## **To update the models, you will need to update the custom provider called **myProvider** at **/lib/ai/models.ts** shown below.**  
##   
##   
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";  
import { gateway } from "@ai-sdk/gateway";  
   
export const myProvider = customProvider({  
  languageModels: {  
    "chat-model": gateway.languageModel("xai/grok-2-vision-1212"),  
    "chat-model-reasoning": wrapLanguageModel({  
      model: gateway.languageModel('xai/grok-3-mini-beta'),  
      middleware: extractReasoningMiddleware({ tagName: "think" }),  
    }),  
    "title-model": gateway.languageModel("xai/grok-2-1212"),  
    "artifact-model": gateway.languageModel("xai/grok-2-1212"),  
  },  
});  
**You can replace the models with any other provider supported by the AI SDK Gateway. The gateway provides access to models from OpenAI, Anthropic, Google, xAI, and many other providers through a unified interface.**  
## **For example, if you want to use Anthropic's **claude-3-5-sonnet** model for **chat-model**, you can update the model identifier as shown below.**  
##   
##   
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";  
import { gateway } from "@ai-sdk/gateway";  
   
export const myProvider = customProvider({  
  languageModels: {  
    "chat-model": gateway.languageModel("anthropic/claude-3-5-sonnet-20241022"), // Using Anthropic model via gateway  
    "chat-model-reasoning": wrapLanguageModel({  
      model: gateway.languageModel('xai/grok-3-mini-beta'),  
      middleware: extractReasoningMiddleware({ tagName: "think" }),  
    }),  
    "title-model": gateway.languageModel("xai/grok-2-1212"),  
    "artifact-model": gateway.languageModel("xai/grok-2-1212"),  
  },  
});  
**You can find the provider library and model names in the ++[provider](https://ai-sdk.dev/providers/ai-sdk-providers)++'s documentation. Once you have updated the models, you should be able to use the new models in your chatbot.**  
**2) Artifacts**  
**Integrate workspaces for activities that involve complex and persistent user interactions**  
## **Artifacts is a special user interface mode that allows you to have a workspace like interface along with the chat interface. This is similar to ++[ChatGPT's Canvas](https://openai.com/index/introducing-canvas)++ and ++[Claude's Artifacts](https://www.anthropic.com/news/artifacts)++.**  
**The template already ships with the following artifacts:**  
* Text Artifact: Work with text content like drafting essays and emails.  
* Code Artifact: Write and execute code snippets.  
* Image Artifact: Work with images like editing, annotating, and processing images.  
* Sheet Artifact: Work with tabular data like creating, editing, and analyzing data.  
**Adding a Custom Artifact**  
##   
## **To add a custom artifact, you will need to create a folder in the **artifacts** directory with the artifact name. The folder should contain the following files:**  
* client.tsx: The client-side code for the artifact.  
* server.ts: The server-side code for the artifact.  
## **Here is an example of a custom artifact called **CustomArtifact**:**  
##   
##   
artifacts/  
  custom/  
    client.tsx  
    server.ts  
**Client-Side Example (client.tsx)**  
##   
**This file is responsible for rendering your custom artifact. You might replace the inner UI with your own components, but the overall pattern (initialization, handling streamed data, and rendering content) remains the same. For instance:**  
##   
##   
import { Artifact } from "@/components/create-artifact";  
import { ExampleComponent } from "@/components/example-component";  
import { toast } from "sonner";  
   
interface CustomArtifactMetadata {  
  // Define metadata your custom artifact might need—the example below is minimal.  
  info: string;  
}  
   
export const customArtifact = new Artifact<"custom", CustomArtifactMetadata>({  
  kind: "custom",  
  description: "A custom artifact for demonstrating custom functionality.",  
  // Initialization can fetch any extra data or perform side effects  
  initialize: async ({ documentId, setMetadata }) => {  
    // For example, initialize the artifact with default metadata.  
    setMetadata({  
      info: `Document ${documentId} initialized.`,  
    });  
  },  
  // Handle streamed parts from the server (if your artifact supports streaming updates)  
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {  
    if (streamPart.type === "info-update") {  
      setMetadata((metadata) => ({  
        ...metadata,  
        info: streamPart.content as string,  
      }));  
    }  
    if (streamPart.type === "content-update") {  
      setArtifact((draftArtifact) => ({  
        ...draftArtifact,  
        content: draftArtifact.content + (streamPart.content as string),  
        status: "streaming",  
      }));  
    }  
  },  
  // Defines how the artifact content is rendered  
  content: ({  
    mode,  
    status,  
    content,  
    isCurrentVersion,  
    currentVersionIndex,  
    onSaveContent,  
    getDocumentContentById,  
    isLoading,  
    metadata,  
  }) => {  
    if (isLoading) {  
      return <div>Loading custom artifact...</div>;  
    }  
   
    if (mode === "diff") {  
      const oldContent = getDocumentContentById(currentVersionIndex - 1);  
      const newContent = getDocumentContentById(currentVersionIndex);  
      return (  
        <div>  
          <h3>Diff View</h3>  
          <pre>{oldContent}</pre>  
          <pre>{newContent}</pre>  
        </div>  
      );  
    }  
   
    return (  
      <div className="custom-artifact">  
        <ExampleComponent  
          content={content}  
          metadata={metadata}  
          onSaveContent={onSaveContent}  
          isCurrentVersion={isCurrentVersion}  
        />  
        <button  
          onClick={() => {  
            navigator.clipboard.writeText(content);  
            toast.success("Content copied to clipboard!");  
          }}  
        >  
          Copy  
        </button>  
      </div>  
    );  
  },  
  // An optional set of actions exposed in the artifact toolbar.  
  actions: [  
    {  
      icon: <span>⟳</span>,  
      description: "Refresh artifact info",  
      onClick: ({ appendMessage }) => {  
        appendMessage({  
          role: "user",  
          content: "Please refresh the info for my custom artifact.",  
        });  
      },  
    },  
  ],  
  // Additional toolbar actions for more control  
  toolbar: [  
    {  
      icon: <span>✎</span>,  
      description: "Edit custom artifact",  
      onClick: ({ appendMessage }) => {  
        appendMessage({  
          role: "user",  
          content: "Edit the custom artifact content.",  
        });  
      },  
    },  
  ],  
});  
**Server-Side Example (server.ts)**  
**The server file processes the document for the artifact. It streams updates (if applicable) and returns the final content. For example:**  
##   
##   
import { smoothStream, streamText } from "ai";  
import { myProvider } from "@/lib/ai/providers";  
import { createDocumentHandler } from "@/lib/artifacts/server";  
import { updateDocumentPrompt } from "@/lib/ai/prompts";  
   
export const customDocumentHandler = createDocumentHandler<"custom">({  
  kind: "custom",  
  // Called when the document is first created.  
  onCreateDocument: async ({ title, dataStream }) => {  
    let draftContent = "";  
    // For demonstration, use streamText to generate content.  
    const { fullStream } = streamText({  
      model: myProvider.languageModel("artifact-model"),  
      system:  
        "Generate a creative piece based on the title. Markdown is supported.",  
      experimental_transform: smoothStream({ chunking: "word" }),  
      prompt: title,  
    });  
   
    // Stream the content back to the client.  
    for await (const delta of fullStream) {  
      if (delta.type === "text-delta") {  
        draftContent += delta.textDelta;  
        dataStream.writeData({  
          type: "content-update",  
          content: delta.textDelta,  
        });  
      }  
    }  
   
    return draftContent;  
  },  
  // Called when updating the document based on user modifications.  
  onUpdateDocument: async ({ document, description, dataStream }) => {  
    let draftContent = "";  
    const { fullStream } = streamText({  
      model: myProvider.languageModel("artifact-model"),  
      system: updateDocumentPrompt(document.content, "custom"),  
      experimental_transform: smoothStream({ chunking: "word" }),  
      prompt: description,  
      experimental_providerMetadata: {  
        openai: {  
          prediction: {  
            type: "content",  
            content: document.content,  
          },  
        },  
      },  
    });  
   
    for await (const delta of fullStream) {  
      if (delta.type === "text-delta") {  
        draftContent += delta.textDelta;  
        dataStream.writeData({  
          type: "content-update",  
          content: delta.textDelta,  
        });  
      }  
    }  
   
    return draftContent;  
  },  
});  
## **Once you have created the client and server files, you can import the artifact in the **lib/artifacts/server.ts** file and add it to the **documentHandlersByArtifactKind** array.**  
##   
##   
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [  
  ...,  
  customDocumentHandler,  
];  
   
export const artifactKinds = [..., "custom"] as const;  
## **Specify it in document schema at **lib/db/schema.ts**.**  
##   
##   
export const document = pgTable(  
  "Document",  
  {  
    id: uuid("id").notNull().defaultRandom(),  
    createdAt: timestamp("createdAt").notNull(),  
    title: text("title").notNull(),  
    content: text("content"),  
    kind: varchar("text", { enum: [..., "custom"] }) // Add the custom artifact kind here  
      .notNull()  
      .default("text"),  
    userId: uuid("userId")  
      .notNull()  
      .references(() => user.id),  
  },  
  (table) => {  
    return {  
      pk: primaryKey({ columns: [table.id, table.createdAt] }),  
    };  
  },  
);  
## **And also add the client-side artifact to the **artifactDefinitions** array in the **components/artifact.tsx** file.**  
##   
##   
import { customArtifact } from "@/artifacts/custom/client";  
   
export const artifactDefinitions = [..., customArtifact];  
## **You should now be able to see the custom artifact in the workspace!3) Theming**  
**Personalize the colors, spacing, and shapes of your project's user interface.**  
Chat SDK uses ++[Tailwind](https://tailwindcss.com/)++ for styling and ++[shadcn/ui](https://ui.shadcn.com/)++ for components. Since most of the components used in the Chat SDK like buttons and inputs are built using shadcn/ui primitives, you can collectively customize the appearance of the components to follow the theme of your application by modifying the CSS variables in app/global.css.  
**Convention**  
##   
You can use a simple background and foreground convention for colors. The background variable is used for the background color of the component and the foreground variable is used for the text color.  
  
The background suffix is omitted when the variable is used for the background color of the component.  
Given the following CSS variables:  
  
  
--primary: 240 5.9% 10%;  
--primary-foreground: 0 0% 98%;  
The background color of the following component will be var(--primary) and the foreground color will be var(--primary-foreground).  
  
  
<div className="bg-primary text-primary-foreground">Hello</div>  
**List of variables**  
##   
Here's the list of variables available for customization:  
  
app/globals.css  
  
  
@layer base {  
    :root {  
        --background: 0 0% 100%;  
        --foreground: 240 10% 3.9%;  
        --card: 0 0% 100%;  
        --card-foreground: 240 10% 3.9%;  
        --popover: 0 0% 100%;  
        --popover-foreground: 240 10% 3.9%;  
        --primary: 240 5.9% 10%;  
        --primary-foreground: 0 0% 98%;  
        --secondary: 240 4.8% 95.9%;  
        --secondary-foreground: 240 5.9% 10%;  
        --muted: 240 4.8% 95.9%;  
        --muted-foreground: 240 3.8% 46.1%;  
        --accent: 240 4.8% 95.9%;  
        --accent-foreground: 240 5.9% 10%;  
        --destructive: 0 84.2% 60.2%;  
        --destructive-foreground: 0 0% 98%;  
        --border: 240 5.9% 90%;  
        --input: 240 5.9% 90%;  
        --ring: 240 10% 3.9%;  
        --chart-1: 12 76% 61%;  
        --chart-2: 173 58% 39%;  
        --chart-3: 197 37% 24%;  
        --chart-4: 43 74% 66%;  
        --chart-5: 27 87% 67%;  
        --radius: 0.5rem;  
        --sidebar-background: 0 0% 98%;  
        --sidebar-foreground: 240 5.3% 26.1%;  
        --sidebar-primary: 240 5.9% 10%;  
        --sidebar-primary-foreground: 0 0% 98%;  
        --sidebar-accent: 240 4.8% 95.9%;  
        --sidebar-accent-foreground: 240 5.9% 10%;  
        --sidebar-border: 220 13% 91%;  
        --sidebar-ring: 217.2 91.2% 59.8%;  
    }  
    .dark {  
        --background: 240 10% 3.9%;  
        --foreground: 0 0% 98%;  
        --card: 240 10% 3.9%;  
        --card-foreground: 0 0% 98%;  
        --popover: 240 10% 3.9%;  
        --popover-foreground: 0 0% 98%;  
        --primary: 0 0% 98%;  
        --primary-foreground: 240 5.9% 10%;  
        --secondary: 240 3.7% 15.9%;  
        --secondary-foreground: 0 0% 98%;  
        --muted: 240 3.7% 15.9%;  
        --muted-foreground: 240 5% 64.9%;  
        --accent: 240 3.7% 15.9%;  
        --accent-foreground: 0 0% 98%;  
        --destructive: 0 62.8% 30.6%;  
        --destructive-foreground: 0 0% 98%;  
        --border: 240 3.7% 15.9%;  
        --input: 240 3.7% 15.9%;  
        --ring: 240 4.9% 83.9%;  
        --chart-1: 220 70% 50%;  
        --chart-2: 160 60% 45%;  
        --chart-3: 30 80% 55%;  
        --chart-4: 280 65% 60%;  
        --chart-5: 340 75% 55%;  
        --sidebar-background: 240 5.9% 10%;  
        --sidebar-foreground: 240 4.8% 95.9%;  
        --sidebar-primary: 224.3 76.3% 48%;  
        --sidebar-primary-foreground: 0 0% 100%;  
        --sidebar-accent: 240 3.7% 15.9%;  
        --sidebar-accent-foreground: 240 4.8% 95.9%;  
        --sidebar-border: 240 3.7% 15.9%;  
        --sidebar-ring: 217.2 91.2% 59.8%;  
    }  
}  
  
4) Fonts  
Customize the typography of your project's user interface.  
Chat SDK ships with ++[Geist](https://vercel.com/font)++ as the default font family, for both mono and sans styles.  
The easiest way to change the font is to use next/font to import the font family and add it to your Tailwind CSS config.  
In the example below, we use the font Inter from next/font/google (you can use any font from Google or Local Fonts). Load your font with the variable option to define your CSS variable name and assign it to inter. Then, use inter.variable to add the CSS variable to your HTML document.  
  
app/layout.tsx  
  
  
import { Inter, Roboto_Mono } from 'next/font/google'  
   
const inter = Inter({  
  subsets: ['latin'],  
  display: 'swap',  
  variable: '--font-inter',  
})  
   
const roboto_mono = Roboto_Mono({  
  subsets: ['latin'],  
  display: 'swap',  
  variable: '--font-roboto-mono',  
})  
   
export default function RootLayout({  
  children,  
}: {  
  children: React.ReactNode  
}) {  
  return (  
    <html lang="en" className={`${inter.variable} ${roboto_mono.variable}`}>  
      <body className="antialiased">{children}</body>  
    </html>  
  )  
}  
Finally, add the CSS variable to your Tailwind CSS config:  
  
tailwind.config.ts  
  
  
module.exports = {  
  content: [  
    './pages/**/*.{js,ts,jsx,tsx}',  
    './components/**/*.{js,ts,jsx,tsx}',  
    './app/**/*.{js,ts,jsx,tsx}',  
  ],  
  theme: {  
    extend: {  
      fontFamily: {  
        sans: ['var(--font-inter)'],  
        mono: ['var(--font-roboto-mono)'],  
      },  
    },  
  },  
  plugins: [],  
}  
The updated fonts should now be applied to your project's user interface.5) ****Testing****  
**Simulate end-to-end user interactions and validate their results.**  
Testing your Chat SDK application involves two key components:  
* E2E Tests: End-to-end tests simulate the full lifecycle of the application, from user interactions to server responses.  
* Mock Models: Mock language models simulate responses based on different prompts.  
**End-to-End Testing With Playwright**  
##   
Chat SDK ships with ++[Playwright](https://playwright.dev/)++ for end-to-end testing. Playwright is a powerful tool for automating web browsers and testing web applications, so it's a great choice for testing your Chat SDK application as well. Playwright also provides a simple API for writing tests, and it supports multiple browsers, including Chrome, Firefox, and WebKit.  
Your project already comes with a set of tests that check the basic functionality of the Chat SDK. These tests can be found in the tests directory of your project.  
Along with these tests, there are also a few helper classes that you can use to make your tests more readable and maintainable. These classes provide a set of common actions that you can use to interact with the Chat SDK application, such as logging in, creating a new chat, and sending a message. These helper classes are located in the tests/pages directory of your project.  
**Writing a Test**  
##   
The following is an example of a test that uses the helper classes to create a new chat and send a message.  
  
tests/chat.test.ts  
  
  
import { ChatPage } from './pages/chat';  
import { test, expect } from '@playwright/test';  
   
test.describe('chat activity', () => {  
  let chatPage: ChatPage;  
   
  test.beforeEach(async ({ page }) => {  
    chatPage = new ChatPage(page);  
    await chatPage.createNewChat();  
  });  
   
  test('send a user message and receive response', async () => {  
    await chatPage.sendUserMessage('Why is grass green?');  
    await chatPage.isGenerationComplete();  
   
    const assistantMessage = await chatPage.getRecentAssistantMessage();  
    expect(assistantMessage.content).toContain("It's just green duh!");  
  });  
});  
**Creating Mock Models**  
##   
Testing language models can be challenging, because they are non-deterministic and calling them is slow and expensive.  
Chat SDK uses a test provider with mock models to simulate the behavior of the different language models. These models are defined in lib/ai/models.test.ts.  
  
lib/ai/models.test.ts  
  
  
import { simulateReadableStream } from 'ai';  
import { MockLanguageModelV1 } from 'ai/test';  
import { getResponseChunksByPrompt } from '@/tests/prompts/utils';  
   
export const chatModel = new MockLanguageModelV1({  
  doStream: async ({ prompt }) => ({  
    stream: simulateReadableStream({  
      chunkDelayInMs: 50,  
      initialDelayInMs: 100,  
      chunks: getResponseChunksByPrompt(prompt),  
    }),  
    rawCall: { rawPrompt: null, rawSettings: {} },  
  }),  
});  
You also have the ability to define the response outputs based on the input prompt. This allows you to test different capabilities like tool calling, artifacts, reasoning, etc. You can define the response outputs in tests/prompts/utils.ts.  
  
tests/prompts/utils.ts  
  
  
if (compareMessages(recentMessage, TEST_PROMPTS.USER_SKY)) {  
  return [  
    ...reasoningToDeltas('The sky is blue because of rayleigh scattering!'),  
    ...textToDeltas("It's just blue duh!"),  
    {  
      type: 'finish',  
      finishReason: 'stop',  
      logprobs: undefined,  
      usage: { completionTokens: 10, promptTokens: 3 },  
    },  
  ];  
}  
  
6) ****Resumable Streams****  
The useChat hook has experimental support for resuming an ongoing chat generation stream by any client, either after a network disconnect or by reloading the chat page. This can be useful for building applications that involve long-running conversations or for ensuring that messages are not lost in case of network failures.  
The following are the pre-requisities for your chat application to support resumable streams:  
The following are the pre-requisities for your chat application to support resumable streams:  
* Installing the ++[resumable-stream](https://www.npmjs.com/package/resumable-stream)++ package that helps create and manage the publisher/subscriber mechanism of the streams.  
* Creating a ++[Redis](https://vercel.com/marketplace/redis)++ instance to store the stream state and setting either REDIS_URL or KV_URL.  
* Creating a table that tracks the stream IDs associated with a chat.  
To resume a chat stream, you will use the experimental_resume function returned by the useChat hook. You will call this function during the initial mount of the hook inside the main chat component.  
  
  
'use client'  
   
import { useChat } from "@ai-sdk/react";  
import { Input } from "@/components/input";  
import { Input } from "@/components/input";  
import { Messages } from "@/components/messages";  
   
export function Chat() {  
  const { experimental_resume } = useChat({id});  
  const { experimental_resume } = useChat({id});  
   
  useEffect(() => {  
    experimental_resume();  
    experimental_resume();  
   
    // we use an empty dependency array to  
    // we use an empty dependency array to  
    // ensure this effect runs only once  
  }, [])  
   
  return (  
  return (  
    <div>  
    <div>  
      <Messages>  
      <Messages>  
      <Input/>  
    </div>  
    </div>  
  )  
}  
The experimental_resume function makes a GET request to your configured chat endpoint (or /api/chat by default) whenever your client calls it. If there’s an active stream, it will pick up where it left off, otherwise it simply finishes without error.  
The GET request automatically appends the chatId query parameter to the URL to help identify the chat the request belongs to. Using the chatId, you can look up the most recent stream ID from the database and resume the stream.  
