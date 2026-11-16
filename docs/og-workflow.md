# Open Graph assets in the Grok workspace

## Brand-asset pass

Start the brand pass once the app name and palette are settled. Never
`wait_tasks` or `get_task_output` on the brand task. Its completion notification
reports the outcome. While the pass runs, keep `/workspace/.grok/og-pending`
fresh. The marker expires after 10 minutes.

## Publish the assets

Stage files in `.grok` on the same filesystem as their destinations. After
generating and checking each file, move it into place with the atomic writer.

```sh
node scripts/write-atomic.mjs .grok/og.jpg.tmp public/og.jpg
node scripts/write-atomic.mjs .grok/x-banner.jpg.tmp public/x-banner.jpg
node scripts/write-atomic.mjs .grok/site.json.tmp src/lib/og/site.json
```

Use the banner command when the app has a separate X banner. Check the published
files with `node scripts/brand-check.mjs`. For games, run
`node scripts/brand-check.mjs --game`.
