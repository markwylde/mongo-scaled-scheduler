# mongo-scaled-schedulder

This project allows you to schedule jobs to be run across a cluster of NodeJS services, where you want to ensure only 1 job is triggered at a time.

## Installation
```bash
npm install --save mongo-scaled-schedulder
```

## Getting Started
```javascript
import { MongoClient } from 'mongodb';
import createScheduler from 'mongo-scaled-schedulder';

const mongoDbUrl = 'mongodb://localhost:27017/mydatabase';
const db = await MongoClient.connect(mongoDbUrl);

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
