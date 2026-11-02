# Local Reddit seed

If anonymous Reddit access is blocked, collect posts/comments another way and import them:

```bash
npm run ingest -- --seed scripts/seed/reddit-raw.json
```

Format (`reddit-raw.json`):

```json
{
  "posts": [
    {
      "author": "username",
      "permalink": "https://www.reddit.com/r/Mindustry/comments/abc123/title/",
      "created_utc": 1710000000,
      "score": 12,
      "title": "Post title",
      "body": "text that may contain a bXNjaA... schematic or a https://example.com/file.msch link",
      "url": ""
    }
  ]
}
```

Every schematic is decoded before it is added. Entries without a real author permalink are dropped.
