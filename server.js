'use strict';

const { createServer } = require('./app');

const PORT = process.env.PORT || 3000;

createServer().listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
