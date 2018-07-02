import {LooseObject, LooseFunction} from 'etc/types';
import Orchestrator from './orchestrator';


describe('Orchestrator', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });

  describe('validating options', () => {
    describe('when provided valid options', () => {
      it('should not throw', () => {
        expect(() => {
          return new Orchestrator({
            root: {
              deps: []
            },
            dependencies: 'deps',
            handler: jest.fn()
          });
        }).not.toThrow();
      });
    });

    describe('when provided an invalid "root" param', () => {
      it('should throw', () => {
        expect(() => {
          return new Orchestrator({
            root: false,
            dependencies: 'deps',
            handler: jest.fn()
          });
        }).toThrow('Expected `root` to be of type `object`');
      });
    });

    describe('when provided an invalid "dependencies" param', () => {
      it('should throw', () => {
        expect(() => {
          // @ts-ignore
          return new Orchestrator({
            root: {
              deps: []
            },
            dependencies: false,
            handler: jest.fn()
          });
        }).toThrow('Any predicate failed');
      });
    });

    describe('when provided an invalid "handler" param', () => {
      it('should throw', () => {
        expect(() => {
          // @ts-ignore
          return new Orchestrator({
            root: {
              deps: []
            },
            dependencies: 'deps',
            handler: false
          });
        }).toThrow('Expected `handler` to be of type `Function`');
      });
    });
  });

  describe('working with objects', () => {
    it('should invoke the configured handler with each node in the correct order', async () => {
      const results: Array<string> = [];

      const foo = {
        setup() {
          results.push('foo');
        }
      };

      const bar = {
        setup() {
          results.push('bar');
        },
        dependsOn: [foo]
      };

      const baz = {
        setup() {
          results.push('baz');
        },
        dependsOn: [foo, bar]
      };

      const o = new Orchestrator({
        root: baz,
        dependencies: 'dependsOn',
        handler: node => {
          return node.setup();
        }
      });

      await o.start();

      expect(results).toMatchObject(['foo', 'bar', 'baz']);
    });
  });

  describe('working with functions', () => {
    it('should invoke the configured handler with each node in the correct order', async () => {
      const results: Array<string> = [];

      const foo: LooseFunction = () => {
        results.push('foo');
      };

      foo.dependsOn = [];

      const bar: LooseFunction = () => {
        results.push('bar');
      };

      bar.dependsOn = [foo];

      const baz: LooseFunction = () => {
        results.push('baz');
      };

      baz.dependsOn = [foo, bar];

      const o = new Orchestrator({
        root: baz,
        dependencies: 'dependsOn',
        handler: fn => {
          return fn();
        }
      });

      await o.start();

      expect(results).toMatchObject(['foo', 'bar', 'baz']);
    });
  });

  describe('when a circular dependency is detected', () => {
    it('should throw', () => {
      expect(() => {
        const foo: LooseObject = {};
        const bar: LooseObject = {};

        foo.dependsOn = [bar];
        bar.dependsOn = [foo];

        return new Orchestrator({
          root: bar,
          dependencies: 'dependsOn',
          handler: jest.fn()
        });
      }).toThrow('Circular dependency detected');
    });
  });
});
