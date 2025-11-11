**AI SDK Introduction**  
\n+The project uses the **AI SDK** for model provider abstraction, multimodal interactions, and streaming responses. For a high-level overview of concepts (providers, models, sessions, streaming primitives), read the official introduction:  
\n+➡️ https://ai-sdk.dev/docs/introduction  
\n+**Related Docs in this repo:**  
* `customize.md` – Switching models and providers (gateway usage).  
* `API.md` – API-level integration details.  
\n+**Next Steps After Reading the Introduction:**  
1. Review provider configuration in `avrora-area/lib/ai/providers.ts`.  
2. Check model mappings (if any) in `lib/ai/models.ts` (referenced in `customize.md`).  
3. Explore artifact creation patterns in `components/create-artifact.tsx`.  
4. Inspect chat usage patterns in components importing `useChat` from `@ai-sdk/react`.  
\n+Keep this file as a quick pointer for onboarding and architectural alignment.  
