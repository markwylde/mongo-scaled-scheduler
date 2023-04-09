# mongo-scaled-scheduler

This project allows you to schedule jobs to be run across a cluster of NodeJS services, where you want to ensure only 1 job is triggered at a time.

## Installation
```bash
npm install --save mongo-scaled-scheduler
```

## Getting Started
```javascript
import { MongoClient } from 'mongodb';
import createScheduler from 'mongo-scaled-scheduler';

const mongoDbUrl = 'mongodb://localhost:27017/mydatabase';
const client = await MongoClient.connect(mongoDbUrl);
const db = client.db();

const scheduler = await createScheduler({
  collection: db.collection('scheduler'),
});
```

## Examples
### Immediate
This will run immediately on a random running instance

```javascript
scheduler.addJob(async function () {
  const notes = db.collection('notes');
  await notes.insertOne({ test: Date.now() });
});
```

### Set time
This will run once in 10 seconds time.

```javascript
scheduler.addJob(async function () {
  const notes = db.collection('notes');
  await notes.insertOne({ test: Date.now() });
}, { time: Date.now() + 10000 });
```

### Set interval
This will run in 10 seconds time, and then again every 10 seconds.

```javascript
scheduler.addJob(async function () {
  const notes = db.collection('notes');
  await notes.insertOne({ test: Date.now() });
}, { interval: 10000 });
```

### Immediate and interval
This will run immediatly and then again every 10 seconds.

```javascript
scheduler.addJob(async function () {
  const notes = db.collection('notes');
  await notes.insertOne({ test: Date.now() });
}, { time: Date.now(), interval: 10000 });
```

### Remove a job
This will add a job and then remove it.

```javascript
const jobId = scheduler.addJob(async function () {
  const notes = db.collection('notes');
  await notes.insertOne({ test: Date.now() });
});

scheduler.removeJob(jobId);
```

## Notes
### `addJob`'s options are:
- `id`: a unique id for the job. Will default to a hash of the function stringified
- `title`: add a title to the mongo document
- `time`: what time will the job first run?
- `interval`: milliseconds in which the job will continuously rerun

If `id` is not provided, then a `sha256` hash of the stringified function will be used. This should work in most cases, unless you want to have the same function run multiple jobs. In which case, give each job a unique `id`.

### node crashes during execution
While a scheduled job is running, it will update the mongo document every second with a `lastPing` of the current time. If there is no ping within `10` seconds, then it is assumed the node process crashed mid execution and allow the next interval to run.

### job rejects during execution
If a job rejects during execution it will not rerun that try, but if there is an interval it will try again at the next interval.

## Error Handling

In case of errors during the execution of a job, the scheduler will emit an 'error' event. You can handle these errors by adding an event listener:

```javascript
scheduler.on('error', (error) => {
  console.error('An error occurred while executing a job:', error);
});
```
