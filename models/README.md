# Mechanical concept 01

All dimensions are in **millimetres**. These files describe an initial concept for discussion. No part has been printed, fitted to hardware or tested with water.

![Printable parts](../assets/parts-render.png)

## Files

| File | Purpose |
|---|---|
| [sleeve.stl](stl/sleeve.stl) | Ø144 × 130 mm decorative sleeve, 3 mm floor/wall and four Ø6 mm drain holes |
| [electronics-base.stl](stl/electronics-base.stl) | 100 × 68 × 35 mm open box with lid screw bosses and approximate cable openings |
| [electronics-lid.stl](stl/electronics-lid.stl) | 100 × 68 × 3 mm lid, four Ø3.4 mm screw holes and two Ø5.3 mm LED holes |
| [sensor-clip.stl](stl/sensor-clip.stl) | 31 × 30 × 21 mm clip, 6 mm rim gap and 25 × 3.2 mm probe slot |
| [plant-signal.scad](plant-signal.scad) | Editable OpenSCAD source for the printed components |
| [assembly-concept.glb](assembly-concept.glb) | Coloured assembly with context objects for a 3D viewer |
| [mesh-validation.json](mesh-validation.json) | Geometry checks on the exported STL meshes |

STL does not encode units: choose mm in the slicer. GLB uses metres by specification; the assembly is exported with its mm coordinates converted to metres.

The GLB plant, liner, soil, sensor and LEDs are illustrations, not supplied printable designs. A working board, wiring, saucer and fasteners are not represented in the assembly. The two LED colours illustrate the two possible states; in operation only the appropriate light would be on.

## Editing

Open `plant-signal.scad` in OpenSCAD. Set `part` to `sleeve`, `electronics-base`, `electronics-lid`, `sensor-clip` or `assembly`. Render before exporting an individual component as STL.

Sleeve and enclosure dimensions have named parameters. Boss positions, port positions and clip geometry are fixed prototype values and must be adjusted separately if those parameters change substantially. No OpenSCAD command-line compilation was performed during preparation; the supplied STL files were generated from equivalent Boolean mesh geometry and independently checked for closed surfaces and connected solids.

## Before printing

1. Measure the liner and saucer; the cavity is Ø138 mm and 127 mm deep. The assumed liner and saucer stack is 125 mm high. Check real diameters along the full height, including flanges.
2. Measure the actual board, its USB plug, sensor connector and cables. The case has approximately 94 × 62 mm of internal space before corner bosses. USB and probe ports are placeholders. Add board mounting points or an insulating carrier after measuring the board; do not leave it loose in the finished enclosure.
3. Measure the probe and sleeve rim. The generic clip is not a tested friction fit, and may need a shim, screw or redesign for reliable retention. Keep sensor components above soil and away from splash water.
4. Print a small clip or hole sample first. Then check the full assembly in the slicer. Rotate/place each STL onto a flat bed face; the clip's coordinates intentionally retain its offset relative to the pot.
5. Try 0.2 mm layers and an appropriate PLA/PETG profile as starting points. The clip bridge or enclosure openings may require changed orientation or local support. Confirm in the slicer; support-free printing is not verified.
6. Select four appropriate screws and test the Ø2.6 mm pilot holes in scrap material. Do not force an unsuitable screw into the bosses.

The sleeve drains through its floor and is not a water reservoir. The bought inner saucer must contain drainage. Keep the separate electronics box away from spill paths.

## Digital verification and limits

The geometry check verifies that every exported STL is watertight, has positive volume and consists of one connected solid. This only checks digital mesh quality. It does not establish dimensional accuracy, printability, material strength, leak resistance, assembly fit or sensor performance. See the generated JSON for bounds and volumes.
