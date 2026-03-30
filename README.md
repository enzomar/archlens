# ArchLens

**Model architecture once, view it through multiple lenses.**

ArchLens is a browser-based architecture modeling tool that supports both [C4 model](https://c4model.com) containment hierarchy and [ArchiMate](https://pubs.opengroup.org/architecture/archimate31-doc/) layered swimlane projections — from a single source of truth.

## Who is it for?

- **Solution Architects** mapping systems, containers, and components
- **Enterprise Architects** documenting cross-domain technology landscapes
- **Engineering Leads** communicating ownership, maturity, and dependencies

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Click **Load example** on the empty canvas, or use **Insert → Entity** to start from scratch.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Projection** | Switch between C4 Abstraction and ArchiMate Layers — same model, different views |
| **Abstraction** | C4 abstraction levels: System Context → Container → Component |
| **Layer** | Business, Application, or Technology layer filters |
| **Placement Wizard** | Guided flow that determines layer, abstraction, and entity kind from plain-language intent |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New entity |
| `1` / `2` / `3` | System Context / Container / Component abstraction |
| `B` / `A` / `T` | Business / Application / Technology layer |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save project |
| `Ctrl+Shift+P` | Command palette |
| `F5` | Presentation mode |
| `F11` | Distraction-free mode |

## Tech Stack

React · TypeScript · Vite · Zustand · ELKjs · SVG canvas
