// modes — placeholder (to be built). Contract: see shared/film.js.
import { div, css } from '../shared/lib.js';
export default {
  id: 'modes', vis: [15.0, 24.5],
  async build({ layer, W, H, V }) {
    const t = div('cv', layer, 'modes', {}); css(t, { position: 'absolute', left: '80px', top: '80px', fontSize: '120px' });
    return { render(time) { t.textContent = 'modes ' + time.toFixed(2); } };
  },
};
