import { Collection } from 'mongodb';
import { EventEmitter } from 'events';

interface JobFunction {
  (): Promise<void>;
}

interface Scheduler extends EventEmitter {
  addJob(jobFunction: JobFunction, options?: { time?: number; interval?: number }): Promise<void>;
  close(): Promise<void>;
}

interface SchedulerOptions {
  id?: string;
  title?: string;
  collection: Collection<any>;
}

declare function createScheduler(options: SchedulerOptions): Promise<Scheduler>;

export default createScheduler;
