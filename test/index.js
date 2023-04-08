import test from 'basictap';
import { MongoClient } from 'mongodb';
import createScheduler from '../src/index.js';

const mongoPort = process.env.MONGO_PORT || 27017;
const mongoDbUrl = 'mongodb://localhost:27017/?directConnection=true';

async function createTestScheduler () {
  const client = await MongoClient.connect(mongoDbUrl);
  const db = client.db();
  const collection = db.collection('scheduler');

  await collection.deleteMany({});

  const scheduler = await createScheduler({ collection });

  return {
    ...scheduler,
    close: async () => {
      await scheduler.close();
      await client.close();
    }
  };
}

test('createScheduler: immediate execution', async (t) => {
  t.plan(1);

  const scheduler = await createTestScheduler();

  await scheduler.addJob(async () => {
    t.pass('Job executed immediately');
  });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: scheduled execution with time', async (t) => {
  t.plan(1);

  const scheduler = await createTestScheduler();

  const startTime = Date.now() + 1000;
  const job = async () => {
    t.pass('Job executed on time');
  };
  await scheduler.addJob(job, { time: startTime });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: scheduled execution with interval', async (t) => {
  t.plan(3);

  const scheduler = await createTestScheduler();

  const startTime = Date.now() + 1000;
  const job = async () => {
    t.pass('Job executed on interval');
  };
  await scheduler.addJob(job, {
    time: startTime,
    interval: 1000
  });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: scheduled execution with immediate and interval', async (t) => {
  t.plan(4);

  const scheduler = await createTestScheduler();

  const startTime = Date.now();
  const job = async () => {
    t.pass('Job executed on interval');
  };
  await scheduler.addJob(job, {
    time: startTime,
    interval: 1000
  });

  return () => {
    scheduler.close();
  };
});
