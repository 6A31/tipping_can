# ⚠️ AI-Assisted Can Tipping Simulator

> **Disclaimer:** This simulation and its documentation were created with assistance from an AI coding agent. 

## Embark on the Scenario

Have you ever been sitting on a train, a freshly opened energy drink on the table, and wondered, *"How much can I sip before this thing topples when the train lurches?"* This project dives into that exact moment, simulating how different beverage fill levels change a can's resistance to side forces.

> **Showcase:** A PC-only preview of the simulator is hosted at [https://tipping-can.6A31.com](https://tipping-can.6A31.com).

---

## Project Overview

This repository contains an interactive 2D physics playground (built with [p5.js](https://p5js.org/)) that visualizes how the center of mass, train acceleration, and can geometry interact to determine when a can tips over. You can experiment with:

- Red Bull, Monster, and Cola can presets.
- Fill level, can dimensions, and empty-can mass.
- Train acceleration (horizontal force).
- Visualization layers such as force vectors, center of mass markers, and a stability graph.
- Auto-computed optimal fill level for maximum stability.

MathJax renders the governing formulas directly on the page so you can explore the physics in detail.

---

## Running the Simulator Locally

No special backend or build tooling is required—the experience is entirely static. If you want to run it locally, any static file server will do. One easy option (already used during development) is Python's built-in HTTP server:

```bash
# From the project root
python3 -m http.server 8000
```

Then open your browser to `http://localhost:8000` and enjoy tipping cans without the sticky cleanup.

> **Tip:** Because the UI targets desktop browsers, use a reasonably wide window for the best layout.

---

## Folder Structure

```
.
├── index.html      # Main UI markup and styles
├── sketch.js       # p5.js physics + rendering code
├── README.md       # You are here
```

---

## Key Physics Concepts

- **Center of Mass:** Weighted average of the can and liquid mass distributions.
- **Tipping Angle:** Threshold angle where the center of mass passes over the can’s base edge.
- **Critical Acceleration:** Horizontal acceleration that aligns the net force with the pivot, triggering tip-over.

The simulator visualizes each of these elements so you can *see* exactly why certain fill levels are safer than others.

---

## Feedback & Contributions

Issues and ideas are welcome—submit a pull request or open an issue describing the improvement you have in mind. Whether you want to add more beverage presets, extend the physics, or polish the visuals, your contributions are appreciated.

Enjoy experimenting, and keep those drinks upright! 🍾
