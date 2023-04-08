import crypto from 'crypto';
import EventEmitter from 'events';

function hash (string) {
  const hash = crypto.createHash('sha256');
  hash.update(string);
  return hash.digest('hex');
}

async function syncFromMongo (collection) {
  let schedules = [];
  const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', async (change) => {
    const documentId = change.fullDocument?._id;

    if (change.operationType === 'insert') {
      schedules.push(change.fullDocument);
    } else if (change.operationType === 'update') {
      const index = schedules.findIndex((doc) => doc._id === documentId);

      if (index !== -1) {
        schedules[index] = change.fullDocument;
      }
    } else if (change.operationType === 'delete') {
      const index = schedules.findIndex((doc) => doc._id === documentId);

      if (index !== -1) {
        schedules.splice(index, 1);
      }
    }
  });

  schedules = await collection.find().toArray();

  const stop = async () => {
    return await changeStream.close();
  };

  return new Promise(resolve => {
    changeStream.once('resumeTokenChanged', () => {
      resolve([schedules, stop]);
    });
  });
}

async function createScheduler ({ id, title, collection }) {
  const eventEmitter = new EventEmitter();

  let timer;
  let stopped = false;
  const jobs = {};
  let runningJobs = 0;

  const [schedules, stopSync] = await syncFromMongo(collection);

  async function addJob (jobFunction, { time, interval } = {}) {
    const jobId = id || hash(jobFunction.toString());

    const jobData = {
      _id: jobId,
      title: title || jobFunction.toString().split('\n')[0],
      status: 'active',
      time,
      interval,
      dateAdded: Date.now()
    };

    jobs[jobId] = jobFunction;

    await collection.updateOne(
      { _id: jobId },
      { $set: jobData },
      { upsert: true }
    );
  }

  async function runOutstandingJobs () {
    const now = Date.now();
    const filteredSchedules = schedules.filter((schedule) => {
      const currentlyCapable = Object.keys(jobs).includes(schedule._id);
      if (!currentlyCapable) {
        return false;
      }
      if (stopped) {
        return false;
      }
      if (schedule.time && schedule.time > now) {
        return false;
      }
      if (schedule.interval && now - schedule.lastStart < schedule.interval) {
        return false;
      }
      return true;
    });

    await Promise.all(
      filteredSchedules.map(async (schedule) => {
        const currentJob = await collection.findOneAndUpdate(
          {
            $or: [{
              _id: schedule._id,
              status: {
                $ne: 'running'
              }
            }, {
              _id: schedule._id,
              lastPing: {
                $lt: new Date(Date.now() - 10000),
                $exists: true
              },
              status: 'running'
            }]
          },
          {
            $set: {
              lastStart: now,
              status: 'running'
            }
          },
          { returnOriginal: false }
        );

        if (!currentJob.value) {
          return;
        }

        runningJobs++;

        let pingInterval;
        try {
          pingInterval = setInterval(async () => {
            await collection.updateOne({ _id: schedule._id }, { $set: { lastPing: Date.now() } });
          }, 1000);

          await jobs[schedule._id]();
        } catch (error) {
          if (eventEmitter.listenerCount('error')) {
            eventEmitter.emit('error', error);
          } else {
            console.error(`Error executing job ${schedule._id}:\n`, error);
          }
        } finally {
          clearInterval(pingInterval);
          await collection.findOneAndUpdate(
            { _id: schedule._id },
            {
              $set: {
                lastEnd: Date.now(),
                status: 'active'
              }
            },
            { returnOriginal: false }
          );
          runningJobs--;
        }
      })
    );

    if (stopped) {
      return;
    }

    timer = setTimeout(runOutstandingJobs, 100);
  }

  runOutstandingJobs();

  eventEmitter.on = eventEmitter.addListener.bind(eventEmitter);
  eventEmitter.off = eventEmitter.removeListener.bind(eventEmitter);
  eventEmitter.addJob = addJob;
  eventEmitter.close = async () => {
    stopped = true;
    clearTimeout(timer);
    await stopSync();

    while (runningJobs > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return eventEmitter;
}

export default createScheduler;
