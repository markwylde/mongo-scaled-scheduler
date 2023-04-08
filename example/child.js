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

  scheduler.addJob(async function () {
    // Send a message to the parent process with the current child instance number and timestamp
    process.send('ok');
  }, { interval: 1000 });
})();
