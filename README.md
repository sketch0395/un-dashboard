# no-dashboard

I am terrible at documentation, will update this to accurately reflect everything. 

# About

This project is a personal endevor to create a network toolkit that includes docker monitoring, network monitoring, and access to network management/security tools

* Uses Next.js v15.0.2
* ShadCN CSS UI
* Tailwind CSS
* node server

# Start
* Start Node Server
``` node start server.js ```

* Start Next app
``` npm run dev ```
 
# Dependencies
* Pull Docker Container for Elastic
```Powershell
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.15.1
#validate version
```
* Start Docker Container for elastic

```Powershell
docker run --name es02 --net elastic-net -p 127.0.0.1:9200:9200 -it -m 1gb docker.elastic.co/elasticsearch/elasticsearch:8.15.1
```
* Pull Docker Container for Kibana
``` Powershell
docker pull docker.elastic.co/kibana/kibana:8.15.1
#Validate version
```
* Start Docker Container for Kibana
```Powershell
docker run --name kib02 --net elastic-net -p 5601:5601 docker.elastic.co/kibana/kibana:8.15.1
```
* Docker Container for Cyberchef
* Docker Container for Dashy (this will be removed soon)
