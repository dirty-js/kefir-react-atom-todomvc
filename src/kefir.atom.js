import Kefir from "kefir"
import R     from "ramda"

//

function createObj(proto) {
  const F = function() {}
  F.prototype = proto
  return new F()
}

function extend(target) {
  const n = arguments.length
  for (let i=1; i<n; ++i)
    for (const p in arguments[i])
      target[p] = arguments[i][p]
  return target
}

function inherit(Child, Parent) {
  const n = arguments.length
  Child.prototype = createObj(Parent.prototype)
  Child.prototype.constructor = Child
  for (let i=2; i<n; ++i)
    extend(Child.prototype, arguments[i])
  return Child
}

//

export function AbstractMutable() {
  Kefir.Property.call(this)
}

inherit(AbstractMutable, Kefir.Property, {
  set(value) {
    this.modify(() => value)
  },
  lens(lens, eq = R.equals) {
    return new Lens(this, lens, eq)
  }
})

//

export function Lens(source, lens, eq = R.equals) {
  AbstractMutable.call(this)
  this._eq = eq
  this._source = source
  this._lens = lens
  this._$handleValue = value => this._handleValue(value)
}

inherit(Lens, AbstractMutable, {
  get() {
    return R.view(this._lens, this._source.get())
  },
  modify(fn) {
    this._source.modify(R.over(this._lens, fn))
  },
  _handleValue(context) {
    const next = R.view(this._lens, context)
    const prev = this._currentEvent
    if (!prev || !this._eq(prev.value, next))
      this._emitValue(next)
  },
  _onActivation() {
    this._source.onValue(this._$handleValue)
  },
  _onDeactivation() {
    this._source.offValue(this._$handleValue)
  }
})

//

export function Atom(value, eq = R.equals) {
  AbstractMutable.call(this)
  this._eq = eq
  this._emitValue(value)
}

inherit(Atom, AbstractMutable, {
  get() {
    return this._currentEvent.value
  },
  modify(fn) {
    const value = fn(this.get())
    if (!this._eq(value, this.get()))
      this._emitValue(value)
  }
})

//

export default (value, eq = R.equals) => new Atom(value, eq)
