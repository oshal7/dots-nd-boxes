// score3d — placeholder (to be built). Contract: see shared/film.js.
import { div, css } from '../shared/lib.js';
export default {
  id: 'score3d', vis: [10, 15.5],
  async build({ layer, W, H, V }) {
    const t = div('cv', layer, 'score3d', {}); css(t, { position: 'absolute', left: '80px', top: '80px', fontSize: '120px' });
    return { render(time) { t.textContent = 'score3d ' + time.toFixed(2); } };
  },
};
