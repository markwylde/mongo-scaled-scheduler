import { fork } from 'child_process';
const numChildren = 5;

for (let i = 0; i < numChildren; i++) {
  const id = i;
  const child = fork('./example/child.js');
  child.on('message', () => {
    console.log(`Child ${id} ran at: ${Date.now()}`);
  });
}
