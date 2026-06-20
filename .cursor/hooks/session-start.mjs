#!/usr/bin/env node
process.stdout.write(
  JSON.stringify({
    additional_context:
      "Smart Garage session: Read AGENTS.md at repo root first. Version in VERSION. CI on Linux — lockfile and Dockerfile pitfalls documented there. User on Windows — use powershell not pwsh. Only commit when asked.",
  }) + "\n"
);
