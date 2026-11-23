# 98 — Choose system pages in a separate destination dropdown

Status: resolved

Use the same two-step destination picker everywhere: choose System page as the destination type, then choose the system page in a second dropdown, just as Garden page uses a separate page selector. Apply to Navigation, inline text, buttons, images and all other shared picker consumers. Preserve existing saved system destinations and their URLs. The currently supported public system destination is Garden index (/garden); do not expose admin or authentication routes as visitor destinations.

## Answer

The shared DestinationPicker now offers System page as a destination type and conditionally renders a separately labelled System page dropdown. It lists the existing Garden index destination. Existing saved values and /garden URLs are unchanged, including when reopening links. Switching away removes the second selector. Navigation forms, inline formatting dialogs, button settings, image settings and the legacy text destination field all consume this same component; no alternate picker remains.

Six relevant desktop/mobile browser checks pass: navigation creation/reopening/public rendering, inline text and button links/public rendering, and focused image settings persistence/reopening/public rendering/removal. TypeScript, formatting/diff checks and production webpack build pass. Tests use isolated local services; no production data or schema changes are required.

Known verification limitation: a broader pre-existing desktop image-link journey encountered a local Chromium Page.reload protocol failure before reaching its system-link step. The corresponding mobile journey passed. A focused image-system-link journey was added and passes on both devices, without navigating a separate visitor browser through unrelated private-page/404 steps. Local authentication is intentionally restricted to development mode; the production build was checked separately, and browser journeys retain that protection.
