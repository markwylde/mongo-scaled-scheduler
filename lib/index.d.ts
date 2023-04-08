import { Collection } from 'mongodb';
import { EventEmitter } from 'events';

interface JobFunction {
  (): Promise<void>;
}

interface Scheduler extends EventEmitter {
  addJob(jobFunction: JobFunction, options?: {
    id?: string;
    title?: string;
    time?: number;
    interval?: number
  }): Promise<string>;
  removeJob(id: string);
  close(): Promise<void>;
}

interface SchedulerOptions {
  collection: Collection<any>;
}

declare function createScheduler(options: SchedulerOptions): Promise<Scheduler>;

export default createScheduler;
