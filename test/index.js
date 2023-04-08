import test from 'basictap';
import { MongoClient } from 'mongodb';
import createScheduler from '../lib/index.js';

const mongoPort = process.env.MONGO_PORT || 27017;
const mongoDbUrl = `mongodb://localhost:${mongoPort}/?directConnection=true`;

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

test('createScheduler: duplicate job only runs once', async (t) => {
  t.plan(1);

  const scheduler = await createTestScheduler();

  const job = async () => {
    t.pass('Job executed immediately');
  };
  await scheduler.addJob(job);
  await scheduler.addJob(job);

  return () => {
    scheduler.close();
  };
});

test('createScheduler: custom id overrides different function hashes', async (t) => {
  t.plan(1);

  const scheduler = await createTestScheduler();

  await scheduler.addJob(async () => {
    t.pass('first job passed');
  }, { id: 'test' });
  await scheduler.addJob(async () => {
    t.pass('second job passed');
  }, { id: 'test' });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: custom id overrides same function hashes', async (t) => {
  t.plan(2);

  const scheduler = await createTestScheduler();

  await scheduler.addJob(async () => {
    t.pass('job passed');
  }, {
    time: Date.now() + 500,
    id: 'test1'
  });
  await scheduler.addJob(async () => {
    t.pass('job passed');
  }, {
    time: Date.now() + 500,
    id: 'test2'
  });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: duplicate job only runs once with last config', async (t) => {
  t.plan(2);

  const scheduler = await createTestScheduler();

  const job = async () => {
    t.pass('Job executed immediately');
  };
  await scheduler.addJob(job, { time: Date.now() + 10000 });
  await scheduler.addJob(job, { interval: 500 });

  setTimeout(() => {
    scheduler.close();
  }, 1000);
});

test('createScheduler: scheduled execution with time', async (t) => {
  t.plan(2);

  const scheduler = await createTestScheduler();

  const startTime = Date.now() + 500;
  const job = async () => {
    t.pass('Job executed on time');
  };
  await scheduler.addJob(job, { time: startTime });

  setTimeout(() => {
    t.pass('wait to make sure only runs once');
    scheduler.close();
  }, 1200);
});

test('createScheduler: remove job before it can run', async (t) => {
  t.plan(1);

  const scheduler = await createTestScheduler();

  const startTime = Date.now() + 1000;
  const job = async () => {
    t.fail('should not run');
  };
  const jobId = await scheduler.addJob(job, { time: startTime });

  await scheduler.removeJob(jobId);

  setTimeout(() => {
    t.pass();
  });

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

test('createScheduler: multiple schedules do not run the same job', async (t) => {
  t.plan(3);

  const scheduler = await createTestScheduler();

  const job = async () => {
    t.pass('Job executed once');
  };

  await scheduler.addJob(job, { interval: 1000 });
  await scheduler.addJob(job, { interval: 1000 });

  return () => {
    scheduler.close();
  };
});

test('createScheduler: job throws an error but still runs again', async (t) => {
  t.plan(4);

  const scheduler = await createTestScheduler();

  scheduler.on('error', (error) => {
    t.equal(error.message, 'Job threw an error');
  });

  const job = async () => {
    t.pass('runs job');
    throw new Error('Job threw an error');
  };

  await scheduler.addJob(job, { interval: 1000 });

  await new Promise(resolve => setTimeout(resolve, 1500));

  return () => {
    scheduler.close();
  };
});

test('createScheduler: job is already running', async (t) => {
  t.plan(2);

  const scheduler1 = await createTestScheduler();
  const scheduler2 = await createTestScheduler();

  const job = async () => {
    t.pass('Job executed once');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  };

  await scheduler1.addJob(job, { interval: 1000 });
  await scheduler2.addJob(job, { interval: 1000 });

  setTimeout(() => {
    scheduler1.close();
    scheduler2.close();
    t.pass();
  }, 2500);
});

test.skip('createScheduler: retrys - job throws an error and will immediately rerun', async (t) => {
  t.plan(4);

  const scheduler = await createTestScheduler();

  let runCount = 0;
  scheduler.on('error', (error) => {
    t.equal(error.message, 'first run should fail');
  });

  const job = async () => {
    runCount = runCount + 1;
    t.pass('second run should pass');
    if (runCount === 1) {
      throw new Error('first run should fail');
    }
  };

  await scheduler.addJob(job, { interval: 1000, retryMaximumAttempts: 3 });

  setTimeout(() => {
    t.pass();
    scheduler.close();
  }, 1200);
});
