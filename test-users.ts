import { getUsers } from './app/actions/users';

async function test() {
  console.log(await getUsers());
}
test();
