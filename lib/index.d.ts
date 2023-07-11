import { Collection } from 'mongodb';
import { EventEmitter } from 'events';

export interface JobFunction {
  (): Promise<void>;
}

export interface Scheduler extends EventEmitter {
  addJob(jobFunction: JobFunction, options?: {
    id?: string;
    title?: string;
    time?: number;
    interval?: number
  }): Promise<string>;
  removeJob(id: string);
  close(): Promise<void>;
}

export interface SchedulerOptions {
  collection: Collection<any>;
}

export declare function createScheduler(options: SchedulerOptions): Promise<Scheduler>;

export default createScheduler;
