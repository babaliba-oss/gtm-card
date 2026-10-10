# Fill in your card with AI

Paste this into Claude, ChatGPT or any chat. Attach your `brain/` pages, or paste your LinkedIn "About" and experience if you haven't filled the brain in yet. Then paste the current `card.json`.

```
Update my GTM card. Rules:
- Use only facts from what I gave you. Don't invent tools, numbers or builds. If something's missing, leave the current value and tell me what's missing.
- Return only valid JSON in exactly the same shape as the card.json I pasted.
- "focus": 4 to 8 short areas I work on.
- "stack": up to 8 groups, only tools I actually use. Group them by job (Automation, GTM data, Outreach, CRM, AI, Web, Tracking & SEO, Code).
- "nums": exactly 6. Short number in "b", what it means in "t" (under 10 words).
- "builds": up to 4 things running in production, one line each on how they work.
- "line": one sentence, plain words, no buzzwords, no em dashes.
- Set "updated" to today's date.
```

Paste the JSON it returns into `card.json`, commit, done.
