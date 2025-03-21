const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3001;

app.get('/api/execute', (req, res) => {
  const command = req.query.command;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send(error.message);
    }
    res.send({ stdout, stderr });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});