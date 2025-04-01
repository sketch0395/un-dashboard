const Docker = require("dockerode");

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

docker.listContainers({ all: true })
  .then((containers) => {
    console.log("Containers:", containers);
  })
  .catch((error) => {
    console.error("Docker Test Error:", error.message);
  });
