# un-dashboard
 

 ## Docker Setup on remote
1. Set up /etc/docker/daemon.json
```bash 
sudo nano /etc/docker/daemon.json
```
Paste this:

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
 ```

 Save and exit.

 2. Override systemd to use the config

 ```bash
 sudo systemctl edit docker
 ```

 Paste this:

 ```bash
 [Service]
ExecStart=
ExecStart=/usr/bin/dockerd
 ```

 Then run:
 ```bash 
 sudo systemctl daemon-reexec
sudo systemctl daemon-reload
  ```

  3. Restart Docker & enable on boot

  ```bash
  sudo systemctl restart docker
sudo systemctl enable docker
 ```

 4. Test from another machine

 ```bash 
  DOCKER_HOST=tcp://<your-server-ip>:2375 docker ps
``` 