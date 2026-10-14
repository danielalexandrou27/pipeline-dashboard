# Pipeline dashboard

A web page for the team showing tonight's batch: one row per Informatica workflow → step function link,
with each job's status, start and end times, duration, error, failed step, ServiceNow incident and a link
to the AWS console. Step functions that haven't run yet are listed too, and flagged **Late** once their
`expected_by` time in `pipelines.yml` has passed. Step functions that ran but aren't in the registry are
listed separately under "Not in the registry".

The page has no data of its own. Everything comes from the monitoring engine (`sfn-collector`) over its
read-only API, and the engine pushes a live update whenever a run or incident changes.

## Run it

Requires Node 20 or newer.

```
npm install
npm run dev          # http://localhost:5173 , proxies /api to the engine on http://localhost:8080
```

If the engine runs elsewhere: `ENGINE_URL=http://engine-host:8080 npm run dev`
(on Windows PowerShell: `$env:ENGINE_URL="http://engine-host:8080"; npm run dev`).

## Sign in

One shared account, set on the **engine** with environment variables before starting it:

```
DASHBOARD_USER=pipeline
DASHBOARD_PASSWORD=<pick one and share it with the team>
```

If `DASHBOARD_PASSWORD` isn't set, the engine makes one up at startup and prints it in its log.
After 5 wrong passwords from one machine, sign-in is blocked for 5 minutes. Sessions last 8 hours.
Never commit the password; keep it in the environment of the machine running the engine.

## Host it for the team

```
npm run build        # writes the static site to dist/
```

The page and the API must be served from the same address so the sign-in cookie works.
Either:

- **Quickest:** `npm run preview -- --port 4173` on the engine's machine (it proxies /api the same way as dev), or
- **Proper:** serve `dist/` from nginx / IIS and forward `/api/` to the engine. nginx example:

```
server {
    listen 80;
    root /opt/pipeline-dashboard/dist;
    location / { try_files $uri /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;          # live updates (server-sent events)
        proxy_read_timeout 1h;
    }
}
```

When it's served over https, start the engine with `DASHBOARD_HTTPS=true` so the cookie is marked secure.

## What the page shows

| Area | Meaning |
|---|---|
| Coloured strip | One segment per registered step function, worst first. Click a colour to filter. |
| Counts | Step functions by status; click one to filter, click again to clear. |
| Row | Pipeline, upstream workflow (folder, times, error), step function (times, failed step, error), incident. A step function fed by two workflows spans two rows. |
| "N runs today" | The step function ran more than once; the row shows the latest run. Click to see every run. |
| Late | No run yet and its `expected_by` time has passed. |
| Live / Reconnecting | Whether the page is receiving updates. It also refreshes every minute. |

The batch day runs midnight to midnight Pacific time (engine setting `monitor.dashboard.time-zone`).
