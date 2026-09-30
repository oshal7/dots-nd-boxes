// board — placeholder (to be built). Contract: see shared/film.js.
import { div, css } from '../shared/lib.js';
export default {
  id: 'board', vis: [0, 10],
  async build({ layer, W, H, V }) {
    const t = div('cv', layer, 'board', {}); css(t, { position: 'absolute', left: '80px', top: '80px', fontSize: '120px' });
    return { render(time) { t.textContent = 'board ' + time.toFixed(2); } };
  },
};
