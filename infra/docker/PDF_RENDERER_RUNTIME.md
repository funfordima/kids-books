# PDF renderer runtime

Step 9 uses Puppeteer for HTML-to-PDF rendering. The backend runtime must provide
a Chromium executable and set `PDF_EXPORT_CHROMIUM_EXECUTABLE_PATH`.

The pinned runtime image is defined in
`infra/docker/backend-pdf-runtime.Dockerfile`.

Pinned values:

- Node base image: `node:22.23.1-bookworm-slim`
- Debian Chromium package: `151.0.7922.173-1~deb12u1`
- Puppeteer npm package: `25.8.0`
- Chromium executable path: `/usr/bin/chromium`

Build from the repository root:

```powershell
docker build -f infra/docker/backend-pdf-runtime.Dockerfile -t kids-books-backend-pdf:step9 .
```

The root `.dockerignore` excludes `.env`, Git metadata, generated outputs,
coverage, and dependency folders from the build context. Do not pass secrets as
build arguments. Runtime secrets must be injected only at container start by the
deployment platform.

For local root-run verification containers only, set:

```powershell
PDF_EXPORT_CHROMIUM_NO_SANDBOX=true
```

Do not enable no-sandbox mode by default in production deployment. Prefer a
non-root runtime user and the Chromium sandbox whenever the host supports it.
