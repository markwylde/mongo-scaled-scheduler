import { MongoClient } from 'mongodb';
import createScheduler from '../lib/index.js';

const mongoPort = process.env.MONGO_PORT || 27017;
const mongoDbUrl = `mongodb://localhost:${mongoPort}/?directConnection=true`;

(async () => {
  const client = await MongoClient.connect(mongoDbUrl);
  const db = client.db();

  const scheduler = await createScheduler({
    collection: db.collection('scheduler')
  });

  scheduler.on('error', (error) => {
    console.error(error.message);
  });

  scheduler.addJob(async function () {
    if (Math.random() <= 0.5) {
      throw new Error('deliberate fail');
    }
    // Send a message to the parent process with the current child instance number and timestamp
    process.send('ok');
  }, { interval: 2000 });
})();
