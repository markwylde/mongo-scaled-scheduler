import { Collection } from 'mongodb';

interface JobFunction {
  (): Promise<void>;
}

interface Scheduler {
  addJob(jobFunction: JobFunction, options?: { time?: number; interval?: number }): Promise<void>;
  close(): Promise<void>;
}

declare function createScheduler(options: {
  id?: string;
  title?: string;
  collection: Collection<any>;
}): Promise<Scheduler>;

export default createScheduler;
