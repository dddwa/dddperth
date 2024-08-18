# DDD Website

This repository uses [Nx](https://nx.dev) to manage the mono repo and keep everything together.

## Quick Start & Documentation

```
pnpm i
pnpm start
```

Url: http://localhost:3800

### Enable corepack

Corepack is shipped in newer versions of NodeJS is used for managing Node package managers. This repository uses pnpm as the package manager.

`corepack enable pnpm`

## Debugging

We use Open Telemetry for tracing and logging. You can use Jaeger locally to trace the application.

```
docker run --rm --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one
```

Then add the following to your .env

`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces`

To open Jaeger, go to http://localhost:16686

## ParkUI

This project uses ParkUI as the UI framework. You can find the documentation [here](https://park-ui.com)

You can use the ParkUI CLI to add components. `pnpm nx parkui website add <component>`

## Using NX

While we have kept the NX usage to a minimum, it is still a powerful tool that can be used to manage the project. Below are some of the commands that can be used to manage the project.

### Running tasks

To execute tasks with Nx use the following syntax:

```
nx <target> <project> <...options>
```

You can also run multiple targets:

```
nx run-many -t <target1> <target2>
```

..or add `-p` to filter specific projects

```
nx run-many -t <target1> <target2> -p <proj1> <proj2>
```

Targets can be defined in the `package.json` or `projects.json`. Learn more [in the docs](https://nx.dev/features/run-tasks).

### Want better Editor Integration?

Have a look at the [Nx Console extensions](https://nx.dev/nx-console). It provides autocomplete support, a UI for exploring and running tasks & generators, and more! Available for VSCode, IntelliJ and comes with a LSP for Vim users.

### Explore the Project Graph

Run `nx graph` to show the graph of the workspace.
It will show tasks that you can run with Nx.

-   [Learn more about Exploring the Project Graph](https://nx.dev/core-features/explore-graph)
