/* Copyright Contributors to the Open Cluster Management project */

type IfOpts = {
  fn: (ctx: unknown) => string
  inverse: (ctx: unknown) => string
}

export function if_eqFn(this: unknown, v1: unknown, v2: unknown, opts: IfOpts): string {
  return v1 === v2 ? opts.fn(this) : opts.inverse(this)
}
