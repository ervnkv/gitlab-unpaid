import { WithErr } from '../types';

export function withErr<T>(func: () => Promise<T>): Promise<WithErr<T>>;
export function withErr<T>(func: () => T): WithErr<T>;
export function withErr<T>(
  func: (() => T) | (() => Promise<T>),
): Promise<WithErr<T>> | WithErr<T> {
  try {
    const result = func();

    if (result instanceof Promise) {
      return result.then((data) =>
        Array.isArray(data) && isErr(data[0]) ? [data[0]] : [null, data],
      );
    }

    return Array.isArray(result) && isErr(result[0])
      ? [result[0]]
      : [null, result];
  } catch (error) {
    if (error instanceof Error) {
      return [err(error.message)];
    }
    return [err('Unknown error')];
  }
}

export class Err {
  private readonly name = 'error';
  constructor(public readonly text: string) {}
}

export function err(text: string): Err {
  return new Err(text);
}

export function isErr(obj: unknown): obj is Err {
  return obj instanceof Err;
}
