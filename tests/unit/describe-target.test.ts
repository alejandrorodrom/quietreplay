/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import {
  captureKey,
  describeClickTarget,
  displayKey,
  maybeMaskKey,
} from '../../lib/describe-target';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe('describeClickTarget', () => {
  it('reads button text from a nested span click', () => {
    mount(
      `<button id="btnEntendidoAlert"><span></span><span></span><span></span><span>Entendido</span></button>`,
    );
    const span = document.querySelector('span:nth-of-type(4)')!;
    expect(describeClickTarget(span)).toBe('Entendido');
  });

  it('prefers aria-label on buttons', () => {
    mount(`<button aria-label="Cerrar diálogo"><span>×</span></button>`);
    expect(describeClickTarget(document.querySelector('span')!)).toBe(
      'Cerrar diálogo',
    );
  });

  it('labels an input from its for= label', () => {
    mount(
      `<label for="login-doc">Documento</label><input id="login-doc" type="text" />`,
    );
    expect(describeClickTarget(document.getElementById('login-doc'))).toBe(
      'Documento',
    );
  });

  it('falls back to placeholder, then humanized id', () => {
    mount(`<input id="passwordDoc" type="password" placeholder="Clave" />`);
    expect(describeClickTarget(document.getElementById('passwordDoc'))).toBe(
      'Clave',
    );

    mount(`<input id="passwordDoc" type="password" />`);
    expect(describeClickTarget(document.getElementById('passwordDoc'))).toBe(
      'password Doc',
    );
  });

  it('reads mat-label inside a form-field shell', () => {
    mount(
      `<mat-form-field><mat-label>Contraseña</mat-label><div class="infix"><input id="passwordDoc" /></div></mat-form-field>`,
    );
    const infix = document.querySelector('.infix')!;
    expect(describeClickTarget(infix)).toBe('Contraseña');
  });

  it('never returns the input value', () => {
    mount(
      `<label for="u">Usuario</label><input id="u" type="text" value="secreto123" />`,
    );
    expect(describeClickTarget(document.getElementById('u'))).toBe('Usuario');
  });

  it('does not use SVG embedded CSS as the click label', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent =
      '.st0{fill:url(#SVGID_1_);}.st1{opacity:0.15;fill:#FFFFFF;}.st2{fill:#0F995C;}';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'st0');
    path.setAttribute('d', 'M0 0h10v10H0z');
    svg.append(style, path);
    document.body.replaceChildren(svg);

    expect(describeClickTarget(path)).toBeUndefined();
    expect(describeClickTarget(svg)).toBeUndefined();
  });

  it('uses aria-label on SVG logos instead of style text', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-label', 'Logo Bancolombia');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '.st0{fill:#0F995C;}';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'st0');
    svg.append(style, path);
    document.body.replaceChildren(svg);

    expect(describeClickTarget(path)).toBe('Logo Bancolombia');
  });

  it('strips style tags from button labels that wrap an SVG', () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '.st0{fill:red}';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'st0');
    svg.append(style, path);
    btn.append(svg, document.createTextNode('Iniciar sesión'));
    document.body.replaceChildren(btn);

    expect(describeClickTarget(path)).toBe('Iniciar sesión');
  });
});

describe('captureKey / displayKey / maybeMaskKey', () => {
  it('keeps typed keys in normal fields', () => {
    expect(captureKey('a', 'text')).toBe('a');
    expect(captureKey('Enter', 'text')).toBe('Enter');
  });

  it('masks printable keys in password fields', () => {
    expect(captureKey('x', 'password')).toBe('*');
    expect(captureKey('Enter', 'password')).toBe('Enter');
  });

  it('skips lone modifiers', () => {
    expect(captureKey('Shift')).toBeUndefined();
    expect(captureKey('Meta')).toBeUndefined();
  });

  it('displays Space nicely', () => {
    expect(displayKey(' ')).toBe('Space');
    expect(displayKey('Enter')).toBe('Enter');
  });

  it('masks textish keys when obfuscation is on', () => {
    expect(maybeMaskKey('a', 'text', true)).toBe('*');
    expect(maybeMaskKey('Enter', 'text', true)).toBe('Enter');
    expect(maybeMaskKey('a', 'text', false)).toBe('a');
    expect(maybeMaskKey('a', undefined, true)).toBe('a');
  });
});
