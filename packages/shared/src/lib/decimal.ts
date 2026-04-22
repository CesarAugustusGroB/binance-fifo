import Decimal from "decimal.js";

Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -18,
  toExpPos: 40
});

export { Decimal };

export function decimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function decimalToString(value: Decimal): string {
  return value.toFixed();
}
