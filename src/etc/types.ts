/**
 * An object that may have any shape.
 */
export interface LooseObject {
  [index: string]: any;
}


/**
 * A function that may have any shape.
 */
export interface LooseFunction {
  (...args: Array<any>): any;
  [index: string]: any;
}
