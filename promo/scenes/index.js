// Film modules in stacking order (later = on top). Each module may cover several storyboard shots.
import board from './board.js';     // s01–s05  paper → app → lines → boxes → chain → tilt   (0.0–10.0)
import score3d from './score3d.js'; // s06–s07  3D towers → blue field → reveal              (10.0–15.5)
import modes from './modes.js';     // s08–s10  one phone: pass & play, vs computer, online  (15.0–24.5)
import brand from './brand.js';     // s11–s12  the mark → CTA end card                      (24.5–30.0)
export const SCENES = [board, modes, score3d, brand];
