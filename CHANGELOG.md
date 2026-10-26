# Changelog

## 0.1.1

- The credential test reads the account (`GET /api/v1/account`) instead of listing pages, so a key with custom permissions and no pages access passes it.

## 0.1.0

First release.

- Vivere API credential, checked against the Vivere JSON API.
- Ping: Start, Success (item count, Fail If 0 Items, usage: model, tokens and cost, run log) and Fail (message, or the error from an Error Trigger or error output).
- Monitor: Create, with a period or a cron schedule and a grace, returning the ping URL.
