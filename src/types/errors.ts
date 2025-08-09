import { Err } from '../utils';

export type WithErr<T> = [Err] | [null, T];
