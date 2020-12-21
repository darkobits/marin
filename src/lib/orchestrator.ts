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
  root: LooseObject | LooseFunction;

  /**
   * Key at which objects/functions should enumerate the objects/functions
   * they depend on.
   *
   * Note: Numbers and Symbols may also be provided for this parameter.
   */
  dependencies: string | symbol;

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
  private readonly orchestrator = new Orchestrator();


  /**
   * Used to detect circular dependencies.
   */
  private readonly graph: Array<any> = [];


  /**
   * Tracks values (re: dependencies) that have been seen by
   * us. Because "orchestrator" requires that task names be strings,
   * we can ensure that each value we encounter gets a unique task
   * name by using its index in this array.
   */
  private readonly knownValues: Array<any> = [];


  /**
   * Root object/function for the dependency graph.
   */
  private readonly root: LooseObject | LooseFunction;


  /**
   * Key on each object/function where its dependencies are enumerated.
   *
   * Note: Symbols may also be provided.
   */
  private readonly dependenciesKey: string | symbol;


  /**
   * User-provided function that will be invoked with each dependency.
   */
  private readonly handler: LooseFunction;


  constructor({ root, dependencies, handler }: DependencyOrchestratorOptions) {
    // [Runtime] Validate params.
    ow(root, 'root', ow.object);
    ow(dependencies, ow.any(ow.string, ow.symbol));
    ow(handler, 'handler', ow.function);

    this.root = root;
    this.dependenciesKey = dependencies;
    this.handler = handler;

    // [Runtime] Ensure the root value has an array at the configured key. If it
    // does not, this is likely user error.
    // @ts-expect-error - Indexing with Symbols is still not well-supported in
    // TypeScript.
    ow(this.root[this.dependenciesKey], 'root dependencies', ow.array);

    this.buildTasks(this.root);
  }


  /**
   * Returns a string that can be passed to orchestrator to uniquely identify
   * the provided value.
   */
  private getIdForValue(value: any): string {
    if (!this.knownValues.includes(value)) {
      this.knownValues.push(value);
    }

    const id = this.knownValues.findIndex(v => v === value);
    return id.toString();
  }


  /**
   * Recursively traverses the dependency graph and adds tasks to the
   * orchestrator instance.
   */
  private buildTasks(root: LooseObject | LooseFunction): void {
    const rootTaskId = this.getIdForValue(root);

    if (this.orchestrator.hasTask(rootTaskId)) {
      return;
    }

    // Begin with an empty array of dependency IDs.
    let taskDependencyIds: Array<string> = [];

    // If the current root has an array of dependencies at the configured key,
    // recursively add tasks for each of its dependencies.
    if (Array.isArray(root[this.dependenciesKey as string])) {
      root[this.dependenciesKey as string].forEach((dependency: any) => {
        // Check for cyclic dependencies.
        this.graph.push([root, dependency]);

        try {
          toposort(this.graph);
        } catch {
          throw new Error('[DependencyOrchestrator] Circular dependency detected.');
        }

        this.buildTasks(dependency);
      });

      // Now that each dependency has been entered into our known values array,
      // we can map root's dependencies into an array of string IDs, which can
      // then be supplied to orchestrator.
      taskDependencyIds = root[this.dependenciesKey as string].map((dependency: any) => {
        return this.getIdForValue(dependency);
      });
    }

    // Finally, add the task to orchestrator using indexes from our known values
    // array (as strings) as stand-ins for actual values.
    this.orchestrator.add(rootTaskId, taskDependencyIds, () => {
      // To handle the actual task for the current root (re: dependency),
      // delegate to the configured handler, passing it the current root.
      return Reflect.apply(this.handler, undefined, [root]);
    });
  }


  /**
   * Starts the orchestration.
   */
  async start() {
    return new Promise<void>((resolve, reject) => {
      this.orchestrator.start(
        this.getIdForValue(this.root),
        (err: Error) => (err ? reject(err) : resolve())
      );
    });
  }
}
