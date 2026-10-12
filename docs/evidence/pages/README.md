# Published GitHub Pages evidence

Actual Chromium capture/check of https://toti-gauna.github.io/Northstar-studio/ at the timestamp in check.json. Source deployed: 8c33cec6a347fc6a91cc67bb2a96958561345587. Desktop 1440×1000, mobile 390×900. English desktop and Spanish mobile are produced by the public site's language selector; no screenshots are composited. The screenshots visibly disclose that the backend is not connected.

Reproduce: `PAGES_URL=https://toti-gauna.github.io/Northstar-studio/ node scripts/check-pages.mjs`. Requires installed Chromium, with CHROMIUM_PATH available for another executable. HTTPS_PROXY is used for a remote browser when configured; TLS validation remains enabled.
