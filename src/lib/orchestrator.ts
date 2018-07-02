import ow from 'ow';
import Orchestrator from 'orchestrator';
// @ts-ignore
import toposort from 'toposort';

import {LooseObject, LooseFunction} from 'etc/types';


export interface DependencyOrchestratorOptions {
  /**
   * The root object or function to build a dependency graph for. This
   * value should have an array of the objects/functions it depends on
   * at the "dependencies" key below.
   */
  root: any;

  /**
   * Key at which objects/functions should enumerate the objects/functions
   * they depend on.
   *
   * Note: Symbols may also be provided for this parameter.
   */
  dependencies: string;

  /**
   * Handler that will be invoked for each dependency in the graph and should
   * perform any action(s) necessary for the dependency to be ready for use by
   * dependents. Async/promise-returning functions are allowed and will be
   * await-ed.
   */
  handler(node: any): any;
}


export default class DependencyOrchestrator {
  /**
   * Orchestrator instance.
   */
  private readonly _orchestrator = new Orchestrator();


  /**
   * Used to detect circular dependencies.
   */
  private readonly _graph: Array<any> = [];


  /**
   * Tracks values (re: dependencies) that have been seen by
   * us. Because "orchestrator" requires that task names be strings,
   * we can ensure that each value we encounter gets a unique task
   * name by using its index in this array.
   */
  private readonly _knownValues: Array<any> = [];


  /**
   * Root object/function for the dependency graph.
   */
  private readonly _root: LooseObject | LooseFunction;


  /**
   * Key on each object/function where its dependencies are enumerated.
   *
   * Note: Symbols may also be provided as
   */
  private readonly _dependenciesKey: string;


  /**
   * User-provided function that will be invoked with each dependency.
   */
  private readonly _handler: Function;


  constructor({root, dependencies, handler}: DependencyOrchestratorOptions) {
    // [Runtime] Validate params.
    ow(root, ow.object.label('root'));
    ow(dependencies, ow.any(ow.string, ow.symbol));
    ow(handler, ow.function.label('handler'));

    this._root = root;
    this._dependenciesKey = dependencies;
    this._handler = handler;

    // [Runtime] Ensure the root value has an array at the configured key. If it
    // does not, this is likely user error.
    ow(root[this._dependenciesKey], ow.array.label('root dependencies'));

    this._buildTasks(this._root);
  }


  /**
   * Returns a string that can be passed to orchestrator to uniquely identify
   * the provided value.
   */
  private _getIdForValue(value: any): string {
    if (!this._knownValues.includes(value)) {
      this._knownValues.push(value);
    }

    const id = this._knownValues.findIndex(v => v === value);
    return id.toString();
  }


  /**
   * Recursively traverses the dependency graph and adds tasks to the orchestrator
   * instance.
   */
  private _buildTasks(root: LooseObject | LooseFunction): void {
    const rootTaskId = this._getIdForValue(root);

    if (this._orchestrator.hasTask(rootTaskId)) {
      return;
    }

    // Begin with an empty array of dependency IDs.
    let taskDependencyIds: Array<string> = [];

    // If the current root has an array of dependencies at the configured key, recursively
    // add tasks for each of its dependencies.
    if (Array.isArray(root[this._dependenciesKey])) {
      root[this._dependenciesKey].forEach((dependency: any) => {
        // Check for cyclic dependencies.
        this._graph.push([root, dependency]);

        try {
          toposort(this._graph);
        } catch (err) { // tslint:disable-line no-unused
          throw new Error('[DependencyOrchestrator] Circular dependency detected.');
        }

        this._buildTasks(dependency);
      });

      // Now that each dependency has been entered into our known values array, we can
      // map root's dependencies into an array of string IDs, which can then be supplied
      // to orchestrator.
      taskDependencyIds = root[this._dependenciesKey].map((dependency: any) => {
        return this._getIdForValue(dependency);
      });
    }

    // Finally, add the task to orchestrator using indexes from our known values array
    // (as strings) as stand-ins for actual values.
    this._orchestrator.add(rootTaskId, taskDependencyIds, () => {
      // To handle the actual task for the current root (re: dependency), delegate to
      // the configured handler, passing it the current root.
      return Reflect.apply(this._handler, null, [root]);
    });
  }


  /**
   * Starts the orchestration.
   */
  async start(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this._orchestrator.start(this._getIdForValue(this._root), (err: Error) => err ? reject(err) : resolve());
    });
  }
}
