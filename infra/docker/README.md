# Local infrastructure

This Compose project runs the three services required by SDLC Step 2:
PostgreSQL, Redis, and MinIO. It does not run either application, Prisma,
BullMQ workers, or any other later-step component.

The defaults bind all ports to `127.0.0.1`. They are development-only and are
not suitable as production credentials or production orchestration.

## Prerequisites and configuration

- Docker Engine with Docker Compose v2
- Free host ports `5432`, `6379`, `9000`, and `9001`, or alternate ports in
  `infra/docker/.env`

From the repository root, create the ignored active configuration:

```powershell
Copy-Item infra/docker/.env.example infra/docker/.env
```

Required values are `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`REDIS_PASSWORD`, `MINIO_ROOT_USER`, and `MINIO_ROOT_PASSWORD`. Compose stops
during interpolation when one is absent. The bind addresses and host ports are
optional; their defaults are shown in `.env.example`.

With the example values, local clients use:

| Service | Connection |
| --- | --- |
| PostgreSQL | `postgresql://kids_books:local_postgres_change_me@127.0.0.1:5432/kids_books` |
| Redis | `redis://:local_redis_change_me@127.0.0.1:6379` |
| MinIO S3 API | `http://127.0.0.1:9000` |
| MinIO console | `http://127.0.0.1:9001` |

For application configuration in a later story, map these to `DATABASE_URL`,
`REDIS_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
Those application integrations are intentionally not part of Step 2.

## Validate and start

Render and validate the model before starting containers:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml config --quiet
```

Start the stack and wait up to two minutes for all health checks:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml up -d --wait --wait-timeout 120
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml ps
```

All three rows should report `healthy`. The first start may take longer while
Docker downloads the pinned images.

## Smoke checks

These checks use clients already present inside the running containers:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1 AS ready;"'
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping'
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9000/minio/health/live
```

PostgreSQL should return one row containing `1`, Redis should return `PONG`,
and the MinIO health request should return HTTP 200. If host ports were changed,
use the corresponding MinIO API port in the last command.

To exercise MinIO storage, sign in to the console with `MINIO_ROOT_USER` and
`MINIO_ROOT_PASSWORD`, create a development-only bucket and upload a non-sensitive
test file. Do not use personal, child, or product data in local smoke fixtures.

## Persistence and lifecycle

PostgreSQL data, Redis append-only data, and MinIO objects use the named volumes
`postgres_data`, `redis_data`, and `minio_data`. A normal stop/start preserves
them:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml stop
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml start
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml ps
```

You can also remove and recreate the containers without removing the volumes:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml down
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml up -d --wait --wait-timeout 120
```

Re-run the PostgreSQL/Redis checks and verify the MinIO test object after the
restart. Data remains until the named volumes are explicitly removed.

> **Destructive reset:** the following command permanently deletes all local
> PostgreSQL rows, Redis keys, and MinIO objects owned by this Compose project.

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml down --volumes
```

## Diagnostics

If validation, startup, or health waiting fails, keep the failed state and
inspect it before retrying:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml config
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml ps --all
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml logs --tail 100 postgres redis minio
```

Common causes are a missing required variable, a host-port conflict, an image
pull problem, or a service failing its health check. Change only the host-side
port in `.env` when a documented port is occupied. Do not report the stack as
healthy while any service is starting, unhealthy, or exited.
