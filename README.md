# Gradient Ascent

_Gradient Ascent_ is a technical blog exploring Artificial Intelligence, Machine Learning, Deep Learning, and modern AI engineering. Find the blog [here](https://blogs.hari31416.in/).

This repository is a modified version of the [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog). Codes (if any) related to individual blog posts and scripts can be found in [blog_scripts](https://github.com/Hari31416/blog_scripts).

## Features and Customizations

- **Interactive Plotly Charts** (`PlotlyChart.tsx`): Client-side dynamic rendering for data visualisations and mathematical plots directly within MDX.
- **Interactive Mermaid Diagrams** (`Mermaid.tsx`): Dynamic diagram rendering with zoom, pan, reset, and a fullscreen modal viewer.
- **Animation Registry** (`AnimationRegistry.tsx`): Auto-registered custom interactive algorithm animation components for inline visualization.

## Development

A `Makefile` is provided for convenience:

- **Install**: `make install`
- **Preview (Dev)**: `make dev`
- **Preview (Production)**: `make preview`
- **Deploy**: `make deploy` (Pushes to `main`, triggering GitHub Pages)
- **Export**: `make export` (Static export)
- **Lint**: `make lint`
