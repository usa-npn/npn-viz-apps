import {getStaticColor,STATIC_COLORS} from './static-color';
describe('static-color',() => {
  it('simple',() => {
      for(let i = 0; i < STATIC_COLORS.length; i++) {
          expect(getStaticColor(i)).toBe(STATIC_COLORS[i]);
      }
  });
  it('overflow',() => {
    for(let i = STATIC_COLORS.length, j = 0; i < STATIC_COLORS.length*2; i++,j++) {
        expect(getStaticColor(i)).toBe(STATIC_COLORS[j]);
    }
  });
});