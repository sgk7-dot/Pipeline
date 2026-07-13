# Layered CI/CD Sample

A minimal, self-contained project that demonstrates a **layered CI/CD structure**
for both **GitLab CI** and **GitHub Actions**, running the same pipeline end to end:

```
build  ->  test  ->  scan  ->  deploy
```

The key idea: keep pipeline config thin, push reusable job definitions into
templates, and keep the real logic in versioned shell scripts that are
**CI-agnostic** (they run the same from GitLab, GitHub, or your laptop).

---

## The three layers

| Layer | Purpose | GitLab CI | GitHub Actions |
|-------|---------|-----------|----------------|
| **1. Orchestration** | Declare stage order, wire things together. Readable at a glance. | `.gitlab-ci.yml` | `.github/workflows/ci-cd.yml` |
| **2. Reusable jobs** | Job/stage definitions, reused and parameterized. | `.gitlab/ci/*.yml` (`include` + `extends`) | `.github/workflows/{build,test,scan,deploy}.yml` (`workflow_call`) + `.github/actions/setup` (composite action) |
| **3. Logic** | The actual build/test/scan/deploy commands. Identical for both tools. | `scripts/*.sh` | `scripts/*.sh` (same files) |

---

## Project layout

```
.
├── app.js                      # request handler + createServer (exported for tests)
├── server.js                   # entrypoint: listens on PORT (default 3000)
├── package.json                # start + test scripts, Node 20
├── package-lock.json           # lockfile so `npm ci` works
├── Dockerfile                  # multi-stage, non-root, HEALTHCHECK on /health
├── .dockerignore
├── .gitignore
│
├── test/
│   └── app.test.js             # node:test coverage for / and /health
│
├── chart/                      # Helm chart deploy.sh targets (./chart)
│   ├── Chart.yaml
│   ├── values.yaml             # image overridden at deploy time via --set
│   └── templates/
│       ├── deployment.yaml     # readiness/liveness probes on /health
│       └── service.yaml
│
├── scripts/                    # Layer 3 - CI-agnostic logic (shared by both CIs)
│   ├── build.sh
│   ├── test.sh
│   ├── scan.sh
│   └── deploy.sh
│
├── .gitlab-ci.yml              # GitLab - Layer 1 (orchestration)
├── .gitlab/ci/                 # GitLab - Layer 2 (templates)
│   ├── build.yml
│   ├── test.yml
│   ├── scan.yml
│   └── deploy.yml
│
└── .github/
    ├── workflows/              # GitHub - Layer 1 + Layer 2
    │   ├── ci-cd.yml           #   Layer 1: caller (needs + uses)
    │   ├── build.yml           #   Layer 2: reusable workflows
    │   ├── test.yml
    │   ├── scan.yml
    │   └── deploy.yml
    └── actions/setup/
        └── action.yml          # Layer 2b: composite action (shared setup)
```

---

## The sample app

A minimal Node.js HTTP server with **zero runtime dependencies** (uses the
built-in `http` module). Tests use Node's built-in `node:test` runner, so
nothing needs installing beyond Node 20.

Endpoints:

| Method | Path      | Response                                          |
|--------|-----------|---------------------------------------------------|
| GET    | `/`       | `{ "message": "Hello from the CI/CD sample app" }`|
| GET    | `/health` | `{ "status": "ok" }`                              |

`/health` is the single source of truth wired into the Docker `HEALTHCHECK`
and the Helm readiness/liveness probes.

---

## Prerequisites

| Tool | Needed for |
|------|-----------|
| Node.js >= 20 | Running the app and tests locally |
| Docker | Building/running the container image |
| Helm 3 + a Kubernetes cluster | The deploy stage |
| Trivy | The scan stage (`scripts/scan.sh`) |

---

## Run it locally

```bash
# Install deps (none, but sets up the lockfile state) and run tests
npm ci
npm test

# Start the app
npm start
# in another shell:
curl http://localhost:3000/
curl http://localhost:3000/health

# Build and run the container
docker build -t myapp:dev .
docker run --rm -p 3000:3000 myapp:dev

# Deploy to a cluster (requires kube context + Helm)
IMAGE=myapp:dev ./scripts/deploy.sh staging
```

> The scripts are written for bash. On Windows use WSL or Git Bash.

---

## What each stage does

| Stage | Script | Action |
|-------|--------|--------|
| **build** | `scripts/build.sh <image>` | `docker build` the image, then push to the registry |
| **test** | `scripts/test.sh` | `npm ci` then `npm test` (the `node:test` suite) |
| **scan** | `scripts/scan.sh <image>` | Trivy scan of the filesystem and the built image (fails on HIGH/CRITICAL) |
| **deploy** | `scripts/deploy.sh <env>` | `helm upgrade --install` against `./chart`, injecting the image tag |

Both pipelines run: **build -> (test + scan) -> deploy**. Production deploys are
gated behind manual approval.

---

## GitLab CI setup

1. The pipeline runs automatically on push (see `.gitlab-ci.yml`).
2. Required CI/CD variables (Settings -> CI/CD -> Variables):
   - `CI_REGISTRY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD` are provided
     automatically for the GitLab Container Registry. Override if using an
     external registry.
3. `deploy_staging` runs automatically on `main`; `deploy_prod` is **manual**
   (trigger it from the pipeline view).
4. For deploys, make sure the runner has access to your Kubernetes cluster
   (kube context / `KUBECONFIG`).

Image tag used: `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`.

---

## GitHub Actions setup

1. The pipeline runs on push to `main` (see `.github/workflows/ci-cd.yml`).
2. Images are pushed to **GHCR** (`ghcr.io/<owner>/<repo>`). The `build` and
   `scan` workflows already request the right `permissions`
   (`packages: write` / `packages: read`) on `GITHUB_TOKEN`.
3. Create a **`staging`** environment (Settings -> Environments) to attach
   approval rules; `deploy.yml` binds to it via `environment:`.
4. For real deploys, add cluster credentials as secrets and wire them into
   `deploy.yml` (kube context setup step). `secrets: inherit` passes repo
   secrets down to the reusable workflows.

Image tag used: `ghcr.io/${{ github.repository }}:${{ github.sha }}`.

---

## Important: make the scripts executable

The scripts were authored on Windows, so the executable bit may not be set.
Before your first pipeline run, mark them executable in Git so Linux runners
can execute them:

```bash
git update-index --chmod=+x scripts/*.sh
git commit -m "Make CI scripts executable"
```

(Or on a Unix checkout: `chmod +x scripts/*.sh`.)

---

## Adapting to your stack

Everything real lives in `scripts/*.sh` and the `Dockerfile`/`chart`. To
retarget (for example Python on AWS instead of Node on Helm):

- Swap the internals of each `scripts/*.sh` (e.g. `pytest` instead of `npm test`).
- Replace the `Dockerfile` for your runtime.
- Replace the `chart/` (or swap `deploy.sh` for `kubectl` / `aws cli` / `terraform`).

The Layer 1 and Layer 2 YAML rarely needs to change - that's the point of the
layered structure.

---

## Use only one CI system

Both GitLab and GitHub setups are included for reference. In a real repo you'd
keep one and delete the other (`.gitlab-ci.yml` + `.gitlab/`, or `.github/`).
```
