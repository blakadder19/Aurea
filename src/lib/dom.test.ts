import { afterEach, describe, expect, it } from 'vitest'
import { focusRowById } from './dom'

function makeRow(id: string, visible: boolean): HTMLElement {
  const el = document.createElement('div')
  el.tabIndex = 0
  el.setAttribute('data-row-id', id)
  // jsdom no calcula layout: offsetParent es siempre null salvo que lo forcemos,
  // igual que ocurre de verdad con un elemento dentro de `hidden` (display: none).
  Object.defineProperty(el, 'offsetParent', { value: visible ? document.body : null })
  document.body.appendChild(el)
  return el
}

describe('focusRowById', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('enfoca la fila visible, no la primera del DOM, cuando hay dos con el mismo id', () => {
    // Como la fila de escritorio (oculta en móvil) y la tarjeta de móvil comparten
    // data-row-id, no basta con el primer match del DOM.
    const desktopRowHidden = makeRow('cuenta-1', false)
    const mobileCardVisible = makeRow('cuenta-1', true)

    focusRowById('cuenta-1')

    expect(document.activeElement).toBe(mobileCardVisible)
    expect(document.activeElement).not.toBe(desktopRowHidden)
  })

  it('no falla si no hay ninguna fila visible', () => {
    makeRow('cuenta-1', false)
    expect(() => focusRowById('cuenta-1')).not.toThrow()
  })

  it('no falla si el id es null', () => {
    expect(() => focusRowById(null)).not.toThrow()
  })
})
