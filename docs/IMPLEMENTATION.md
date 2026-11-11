# DigiWallet implementation contract

Source: Project Document.docx, 11 November 2026, and confirmed decisions in source chat 6af3e207-f12c-83e8-aa66-9ed82b11764b. The original document was located and read in C:\Users\prabh\Programs\DigiWall, subsequently renamed by the user to C:\Users\prabh\Programs\DigiWallet. Its SHA-256 is 8DAB38BE53A958F8A527F62FE67343A52EEE2C365BA36C8EDD2CA67366987D19, identical to the previously located consolidated specification. The source folder initially contained only that document, with no existing repository. A text extraction is retained alongside this file. Application code was placed in the user-requested DigiWallet directory.

Build a Next.js App Router application with React, TypeScript and Tailwind. Use a server-owned balanced journal, exact integer paise, atomic SQLite transactions, private cookie sessions and per-user ownership. SQLite is the runnable local relational baseline; hosted PostgreSQL and external identity remain deployment work. Do not deploy the Node/SQLite app to a static or Worker-only host.

Primary invariant: borrow 10,000 into a bank containing 5,000 -> cash 15,000, liability 10,000, net worth 5,000. Funded expense 3,000 -> cash 12,000, debt unchanged, reservation 7,000. Principal repayment changes debt, not historical funded usage. Interest alone counts as an expense.

Sequence: tests and posting engine; authenticated durable API; UI and reports; build, integration verification and gap audit. Never present unimplemented workflows as complete.

Design contract: quiet off-white workspace, dark teal wallet summary, emerald actions, compact horizontal account cards, clear financial labels and persistent navigation. Main action is Record transaction. Mobile stacks summaries and retains scrollable account cards. Explicit loading, empty, errors and pending saves. No sample balances in a new wallet. Reference: user-requested horizontally arranged account cards; no separate visual assets supplied.

Guidance applied: https://github.com/addyosmani/agent-skills/blob/main/skills/frontend-ui-engineering/SKILL.md and https://github.com/addyosmani/agent-skills/blob/main/skills/test-driven-development/SKILL.md. Framework reference: https://nextjs.org/docs/app/getting-started/installation.
