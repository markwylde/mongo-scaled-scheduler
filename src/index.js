import crypto from 'crypto';

function hash (string) {
  const hash = crypto.createHash('sha256');
  hash.update(string);
  return hash.digest('hex');
}

async function syncFromMongo (collection) {
  let schedules = [];
  const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', async (change) => {
    const documentId = change.fullDocument._id;

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

    await collection.insertOne(jobData);
  }

  async function runOutstandingJobs () {
    const now = Date.now();
    const filteredSchedules = schedules.filter((schedule) => {
      if (stopped) {
        return false;
      }
      if (schedule.status === 'running') {
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
          { _id: schedule._id },
          {
            $set: {
              lastStart: now,
              status: 'running'
            }
          },
          { returnOriginal: false }
        );

        if (!currentJob) {
          return;
        }

        runningJobs++;

        try {
          await jobs[schedule._id]();
        } catch (error) {
          console.error(`Error executing job ${schedule._id}:`, error);
        } finally {
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

  return {
    addJob,
    close: async () => {
      stopped = true;
      clearTimeout(timer);
      await stopSync();

      while (runningJobs > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  };
}

export default createScheduler;
