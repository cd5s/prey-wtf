# Prey.Wtf dashboard

Local, dynamic clone of the Prey.Wtf panel UI. Everything runs in the browser — themes, chat, cloud configs, and account cards are saved to `localStorage`.

## Open it

Double-click `index.html`, or from this folder:

```bash
npx serve .
```

Then go to the printed local URL.

## Pages

| Hash | Screen |
| --- | --- |
| `#home` | Welcome + license key |
| `#configs` | Cloud config editor |
| `#security` | Device / HWID |
| `#profile` | Account overview |
| `#broadcast` | Live-style chat |
| `#settings` | Builds, colors, password |

Settings, Discord link, configs, and messages persist across refresh.

This is a frontend demo only. It does not talk to a backend or run remote scripts.
