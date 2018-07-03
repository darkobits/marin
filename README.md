<a href="#top" id="top">
  <img src="https://user-images.githubusercontent.com/441546/42152624-912154b0-7d95-11e8-92a7-eafe00ffe7e8.png" style="max-width: 100%">
</a>
<p align="center">
  <a href="https://www.npmjs.com/package/@darkobits/marin"><img src="https://img.shields.io/npm/v/@darkobits/marin.svg?style=flat-square"></a>
  <a href="https://travis-ci.org/darkobits/marin"><img src="https://img.shields.io/travis/darkobits/marin.svg?style=flat-square"></a>
  <a href="https://www.codacy.com/app/darkobits/marin"><img src="https://img.shields.io/codacy/coverage/14f6626623b44da58a6d8c3e44f479ce.svg?style=flat-square"></a>
  <a href="https://github.com/conventional-changelog/standard-version"><img src="https://img.shields.io/badge/conventional%20commits-1.0.0-027dc6.svg?style=flat-square"></a>
  <a href="https://github.com/sindresorhus/xo"><img src="https://img.shields.io/badge/code_style-XO-e271a5.svg?style=flat-square"></a>
</p>

Marin is a general-purpose tool for dependency orchestration based on the popular [Orchestrator](https://github.com/robrich/orchestrator) library. It lets you express relationships between objects, functions, classes, or any kind of value that permits property assignment.

There are only 3 concepts you need to understand to use Marin:

1. Your dependency graph should have a **root** node and be acyclic.
2. Each object in your graph must enumerate its **dependencies** at the same key (of your choosing).
3. When each node is encountered during resolution, it will be passed to a **handler** function that you implement, which can perform any action with/on that node.

## Install

```
npm i @darkobits/marin
```

## Use

This package's default export is a function that accepts an options object with the following shape:

```ts
{
  /**
   * Root of your dependency graph.
   */
  root: any;

  /**
   * Key/property on each node in the graph that enumerates the node's dependencies.
   */
  dependencies: string | number | symbol;

  /**
   * Function which will be invoked with each node in the graph. This function may return a Promise and
   * will be await-ed.
   */
  hander: Function;
}
```

## Examples

Below are a few examples demonstrating how to use Marin.

#### Objects

```ts
import Orchestrator from '@darkobits/marin';

const A = {
  prepareSelf: async () => { /* ... */ }
};

const B = {
  prepareSelf: async () => { /* ... */ },
  dependsOn: [A]
};

const C = {
  prepareSelf: async () => { /* ... */ },
  dependsOn: [A, B]
};

const root = {
  prepareSelf: async () => { /* ... */ },
  dependsOn: [C]
};

const orchestration = new Orchestrator({
  root: root,
  dependencies: 'dependsOn',
  handler: async node => {
    return node.prepareSelf();
  }
});

await orchestration.start();
```

#### Functions

```ts
import Orchestrator from '@darkobits/marin';

function A () { /* ... */ }

function B () { /* ... */ }
B.dependsOn = [A];

function C () { /* ... */ }
C.dependsOn = [A, B]

function root () { /* ... */ }
root.dependsOn = [C];

const orchestration = new Orchestrator({
  root: root,
  dependencies: 'dependsOn',
  handler: fn => fn()
});

await orchestration.start();
```

#### Classes

```ts
import Orchestrator from '@darkobits/marin';

class A {
  initialize() { /* ... */ }
}

class B {
  static dependsOn = [A];

  initialize() { /* ... */ }
}

class C {
  static dependsOn = [A, B];

  initialize() { /* ... */ }
}

class Root {
  static dependsOn = [C];

  initialize() { /* ... */ }
}

const orchestration = new Orchestrator({
  root: Root,
  dependencies: 'dependsOn',
  handler: Ctor => {
    const instance = new Ctor();
    return instance.initialize();
  }
});

await orchestration.start();
```

## &nbsp;
<p align="center">
  <br>
  <img width="22" height="22" src="https://cloud.githubusercontent.com/assets/441546/25318539/db2f4cf2-2845-11e7-8e10-ef97d91cd538.png">
</p>
