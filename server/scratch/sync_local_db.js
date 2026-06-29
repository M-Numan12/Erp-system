delete process.env.DATABASE_URL;
require('../api/utils/dbInit')().then(() => {
  console.log('Local DB sync complete!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
